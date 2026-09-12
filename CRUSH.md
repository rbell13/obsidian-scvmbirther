# Repository guide

## Scope

This is a client-side Obsidian community plugin that converts user-copied SCVMBIRTHER character results into Markdown notes. It does not include SCVMBIRTHER source code, game content tables, prose, or art and does not call an undocumented API.

## Commands

Run commands from the repository root.

```sh
npm ci
npm run test
npm run lint
npm run build
npm run check
```

`npm run check` runs lint, unit tests, TypeScript checks, and the production bundle. `main.js` is generated and ignored by Git.

## Architecture

- `main.ts` wires Obsidian commands, clipboard/manual import, note creation, and settings.
- `character.ts` parses generic labeled character text and produces Markdown. Keep it independent of Obsidian so it remains unit-testable.
- `tests/character.test.ts` verifies parsing and Markdown output.
- `styles.css` sizes the manual import field.

The plugin opens the official SCVMBIRTHER URL in the user's browser. Never scrape or copy the site's bundled source, data tables, translations, art, or prose into this repository. Only process text the user explicitly copies from a generated character.

## Release metadata

Keep versions aligned in `package.json`, `package-lock.json`, `manifest.json`, and `versions.json`. Release artifacts are `main.js`, `manifest.json`, and `styles.css`.
