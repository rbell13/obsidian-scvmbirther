import { copyFile, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const vault = process.argv[2];
if (!vault) {
	console.error("Usage: npm run install:local -- /path/to/vault");
	process.exit(1);
}

const vaultPath = resolve(vault);
try {
	await stat(resolve(vaultPath, ".obsidian"));
} catch {
	console.error(`Not an Obsidian vault: ${vaultPath}`);
	process.exit(1);
}

const destination = resolve(vaultPath, ".obsidian", "plugins", "scvmbirther");
await mkdir(destination, { recursive: true });
await Promise.all(
	["main.js", "manifest.json", "styles.css"].map((file) =>
		copyFile(resolve(file), resolve(destination, file)),
	),
);

console.log(`Installed SCVM Birther in ${destination}`);
