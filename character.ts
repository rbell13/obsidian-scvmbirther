export interface CharacterSection {
	heading: string;
	content: string;
}

export interface ImportedCharacter {
	name: string;
	characterClass: string;
	hp: string;
	omens: string;
	sections: CharacterSection[];
	rawText: string;
}

const FIELD_LABELS = new Map([
	["name", "Name"],
	["class", "Class"],
	["hp", "HP"],
	["omens", "Omens"],
	["abilities", "Abilities"],
	["description", "Description"],
	["origin", "Origin"],
	["powers", "Powers"],
	["actions", "Actions"],
	["equipment", "Equipment"],
	["inventory", "Inventory"],
	["weapon", "Weapon"],
	["armor", "Armor"],
	["shield", "Shield"],
	["scrolls", "Scrolls"],
	["silver", "Silver"],
	["money", "Silver"],
	["traits", "Traits"],
	["trait", "Traits"],
	["habits", "Habits"],
	["habit", "Habits"],
	["tales", "Tales"],
	["tale", "Tales"],
]);

const INLINE_FIELD = /^([A-Za-z][A-Za-z ]{0,24})\s*:\s*(.+)$/;
const TITLE_LINE = /^#{1,6}\s+(.+)$/;

export function parseCharacterText(source: string): ImportedCharacter | null {
	const rawText = normalizeText(source);
	if (!rawText) {
		return null;
	}

	const lines = rawText.split("\n");
	const fields = new Map<string, string[]>();
	let currentField = "";

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) {
			continue;
		}

		const inlineMatch = line.match(INLINE_FIELD);
		if (inlineMatch) {
			const label = normalizeLabel(inlineMatch[1] ?? "");
			const value = inlineMatch[2]?.trim() ?? "";
			if (label && value) {
				appendField(fields, label, value);
				currentField = label;
				continue;
			}
		}

		const headingMatch = line.match(TITLE_LINE);
		const possibleLabel = normalizeLabel(headingMatch?.[1] ?? line);
		if (possibleLabel) {
			currentField = possibleLabel;
			continue;
		}

		if (currentField) {
			appendField(fields, currentField, line);
		}
	}

	const name = getFirst(fields, "Name") ?? inferName(lines);
	if (!name) {
		return null;
	}

	const reserved = new Set(["Name", "Class", "HP", "Omens"]);
	const sections = [...fields.entries()]
		.filter(([heading]) => !reserved.has(heading))
		.map(([heading, values]) => ({ heading, content: values.join("\n") }));

	return {
		name,
		characterClass: getFirst(fields, "Class") ?? "Unknown scvm",
		hp: getFirst(fields, "HP") ?? "?",
		omens: getFirst(fields, "Omens") ?? "?",
		sections,
		rawText,
	};
}

export function characterToMarkdown(character: ImportedCharacter): string {
	const frontmatter = [
		"---",
		"tags:",
		"  - mork-borg/character",
		"generator: SCVMBIRTHER",
		`class: ${yamlString(character.characterClass)}`,
		`hp: ${yamlString(character.hp)}`,
		`omens: ${yamlString(character.omens)}`,
		"---",
	];
	const summary = [
		`# ${escapeHeading(character.name)}`,
		"",
		"> [!info] Scvm",
		`> **Class:** ${character.characterClass}`,
		`> **HP:** ${character.hp} | **Omens:** ${character.omens}`,
	];
	const sections = character.sections.flatMap(({ heading, content }) => [
		"",
		`## ${heading}`,
		"",
		content,
	]);
	const source = [
		"",
		"---",
		"Generated with [SCVMBIRTHER](https://scvmbirther.makedatanotlore.dev/).",
	];

	return [...frontmatter, "", ...summary, ...sections, ...source, ""].join("\n");
}

function normalizeText(source: string): string {
	return source
		.replace(/\r\n?/g, "\n")
		.replace(/\u00a0/g, " ")
		.trim();
}

function normalizeLabel(label: string): string | null {
	const normalized = label.trim().toLowerCase();
	return FIELD_LABELS.get(normalized) ?? null;
}

function appendField(fields: Map<string, string[]>, label: string, value: string): void {
	const values = fields.get(label) ?? [];
	values.push(value);
	fields.set(label, values);
}

function getFirst(fields: Map<string, string[]>, label: string): string | undefined {
	return fields.get(label)?.[0];
}

function inferName(lines: string[]): string | null {
	for (const rawLine of lines) {
		const line = rawLine.trim();
		const headingMatch = line.match(TITLE_LINE);
		if (headingMatch?.[1]) {
			return headingMatch[1].trim();
		}
	}
	return null;
}

function yamlString(value: string): string {
	return JSON.stringify(value);
}

function escapeHeading(value: string): string {
	return value.replace(/^#+\s*/, "");
}
