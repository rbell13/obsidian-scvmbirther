import * as assert from "node:assert/strict";
import { test } from "node:test";
import { characterToMarkdown, parseCharacterText } from "../character";

const copiedCharacter = `
Name: Grift
Class: Fanged Deserter
HP: 7/7
Omens: 2
Abilities
Strength: +2
Agility: -1
Presence: 0
Toughness: +1
Description
A rain-soaked survivor.
Equipment
Notched blade
Weathered pack
Traits: Suspicious of bells
`;

test("parses labeled copied character text", () => {
	const character = parseCharacterText(copiedCharacter);

	assert.notEqual(character, null);
	assert.equal(character?.name, "Grift");
	assert.equal(character?.characterClass, "Fanged Deserter");
	assert.equal(character?.hp, "7/7");
	assert.equal(character?.omens, "2");
	assert.deepEqual(character?.sections, [
		{
			heading: "Abilities",
			content: "Strength: +2\nAgility: -1\nPresence: 0\nToughness: +1",
		},
		{
			heading: "Description",
			content: "A rain-soaked survivor.",
		},
		{
			heading: "Equipment",
			content: "Notched blade\nWeathered pack",
		},
		{
			heading: "Traits",
			content: "Suspicious of bells",
		},
	]);
});

test("formats a character as Obsidian-friendly Markdown", () => {
	const character = parseCharacterText(copiedCharacter);
	assert.notEqual(character, null);
	if (!character) {
		return;
	}

	const markdown = characterToMarkdown(character);
	assert.match(markdown, /^---\ntags:\n  - mork-borg\/character/m);
	assert.match(markdown, /# Grift/);
	assert.match(markdown, /> \*\*HP:\*\* 7\/7 \| \*\*Omens:\*\* 2/);
	assert.match(markdown, /## Equipment\n\nNotched blade\nWeathered pack/);
	assert.match(markdown, /Generated with \[SCVMBIRTHER\]/);
});

test("accepts a Markdown heading as a fallback name", () => {
	const character = parseCharacterText("# Vex\n\nClass: Gutterborn\nHP: 3");
	assert.equal(character?.name, "Vex");
});

test("rejects text without a character name", () => {
	assert.equal(parseCharacterText("Class: Unknown\nHP: 2"), null);
	assert.equal(parseCharacterText(""), null);
});
