import {
	App,
	Editor,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	normalizePath,
} from "obsidian";
import { characterToMarkdown, parseCharacterText } from "./character";

const SCVMBIRTHER_URL = "https://scvmbirther.makedatanotlore.dev/";
const DEFAULT_SETTINGS: ScvmBirtherSettings = {
	characterFolder: "Characters",
};

interface ScvmBirtherSettings {
	characterFolder: string;
}

function isSettings(value: unknown): value is Partial<ScvmBirtherSettings> {
	return typeof value === "object" && value !== null;
}

export default class ScvmBirtherPlugin extends Plugin {
	settings: ScvmBirtherSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addRibbonIcon("skull", "Open SCVMBIRTHER", () => {
			window.open(SCVMBIRTHER_URL);
		});
		this.addCommand({
			id: "open-generator",
			name: "Open SCVMBIRTHER generator",
			callback: () => window.open(SCVMBIRTHER_URL),
		});
		this.addCommand({
			id: "create-character-from-clipboard",
			name: "Create character note from clipboard",
			callback: () => void this.createCharacterFromClipboard(),
		});
		this.addCommand({
			id: "format-selection-as-character",
			name: "Format selection as character Markdown",
			editorCheckCallback: (checking, editor) => this.formatSelection(checking, editor),
		});
		this.addSettingTab(new ScvmBirtherSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		const savedData: unknown = await this.loadData();
		const savedSettings = isSettings(savedData) ? savedData : {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedSettings);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private formatSelection(checking: boolean, editor: Editor): boolean {
		const selection = editor.getSelection();
		const character = parseCharacterText(selection);
		if (!character) {
			return false;
		}
		if (!checking) {
			editor.replaceSelection(characterToMarkdown(character));
		}
		return true;
	}

	private async createCharacterFromClipboard(): Promise<void> {
		let clipboardText = "";
		try {
			clipboardText = await navigator.clipboard.readText();
		} catch {
			new CharacterImportModal(this.app, (text) => void this.createCharacterNote(text)).open();
			return;
		}

		if (!(await this.createCharacterNote(clipboardText))) {
			new CharacterImportModal(this.app, (text) => void this.createCharacterNote(text)).open();
		}
	}

	private async createCharacterNote(source: string): Promise<boolean> {
		const character = parseCharacterText(source);
		if (!character) {
			new Notice("Could not identify a SCVMBIRTHER character. Copy the visible character text and try again.");
			return false;
		}

		const folder = normalizePath(this.settings.characterFolder.trim());
		if (folder && folder !== "/") {
			await ensureFolder(this.app, folder);
		}
		const fileName = safeFileName(character.name) || "Unnamed scvm";
		const basePath = folder && folder !== "/" ? `${folder}/${fileName}` : fileName;
		const path = getAvailablePath(this.app, basePath);
		const file = await this.app.vault.create(path, characterToMarkdown(character));
		await this.app.workspace.getLeaf(false).openFile(file);
		new Notice(`Created ${file.name}`);
		return true;
	}
}

class CharacterImportModal extends Modal {
	private source = "";

	constructor(app: App, private readonly onSubmit: (source: string) => void) {
		super(app);
	}

	onOpen(): void {
		this.setTitle("Import SCVMBIRTHER character");
		this.contentEl.createEl("p", {
			text: "Paste the visible character text from SCVMBIRTHER. The plugin stores only your generated result.",
		});
		const input = this.contentEl.createEl("textarea", {
			cls: "scvmbirther-import",
			attr: {
				placeholder: "Name: ...\nClass: ...\nHP: ...\nOmens: ...",
				rows: "14",
			},
		});
		input.addEventListener("input", () => {
			this.source = input.value;
		});
		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText("Open generator").onClick(() => window.open(SCVMBIRTHER_URL)))
			.addButton((button) =>
				button
					.setButtonText("Create note")
					.setCta()
					.onClick(() => {
						this.onSubmit(this.source);
						this.close();
					}),
			);
		input.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

class ScvmBirtherSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: ScvmBirtherPlugin) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName("Character folder")
			.setDesc("Vault folder for imported character notes. Leave empty for the vault root.")
			.addText((text) =>
				text
					.setPlaceholder("Characters")
					.setValue(this.plugin.settings.characterFolder)
					.onChange(async (value) => {
						this.plugin.settings.characterFolder = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}

function safeFileName(value: string): string {
	return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\.+$/g, "").trim();
}

async function ensureFolder(app: App, folder: string): Promise<void> {
	const parts = folder.split("/").filter(Boolean);
	let current = "";
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (!app.vault.getAbstractFileByPath(current)) {
			await app.vault.createFolder(current);
		}
	}
}

function getAvailablePath(app: App, basePath: string): string {
	let candidate = `${basePath}.md`;
	let suffix = 2;
	while (app.vault.getAbstractFileByPath(candidate)) {
		candidate = `${basePath} ${suffix}.md`;
		suffix += 1;
	}
	return candidate;
}
