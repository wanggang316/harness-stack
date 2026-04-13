# README.md

The project entry point for humans. A developer should be able to clone, install, and run the project by reading only this file.

## When to Write

- New project initialization
- README is missing or says nothing useful
- Quick start instructions are wrong or incomplete

## Process

1. **Read the project** — Understand what it does, how to run it, what the key commands are
2. **Write one paragraph** — What this project does, in plain language
3. **Write Install** — How to install or set up, with exact commands
4. **Write Commands** — Table of all user-facing commands with descriptions
5. **Write Development** — How to build, test, lint locally
6. **Add expandable sections** — Only the ones this project actually needs
7. **Save** — Write to `README.md` in project root

## Minimal Structure (Required)

Every README must have these four sections:

```markdown
# [Project Name]

<!-- One paragraph: what this project does, in plain language -->

## Install

<!-- Exact install commands. Include global and local options if applicable -->

\```bash
npm install
\```

## Commands

<!-- All user-facing commands in a table -->

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm test` | Run tests |
| `npm run build` | Production build |
| `npm run lint` | Run linter |

## Development

<!-- Clone-to-running steps for a fresh contributor -->

\```bash
git clone <repo-url>
cd <project>
npm install
npm run build
npm test
\```
```

## Expandable Sections (Add as needed)

Add these sections when the project warrants them. Order after the minimal sections.

| Section | When to add |
|---|---|
| Architecture | Project has multiple domains or layers |
| Configuration | Project has config files that users need to understand |
| Key Principles | Project has guiding principles worth surfacing to users |
| CI Integration | Project has CI workflows users should know about |
| API / Usage | Project is a library or exposes a public API |
| Contributing | Project accepts external contributions |
| License | Open source projects |

Example expandable sections:

```markdown
## Architecture

<!-- Brief structure overview. Link to docs/architecture.md for full details -->

## Configuration

<!-- Show the config file format with inline comments explaining key options -->

## Key Principles

<!-- Top principles inline, link to full list -->

See [Golden Rules](docs/golden-rules.md) for the complete list.

## Contributing

<!-- How to contribute, coding standards, PR process -->

## License

MIT
```

## Verification

- [ ] One-paragraph description exists and is accurate
- [ ] Install instructions are correct
- [ ] All user-facing commands listed in table
- [ ] Development setup commands work from a fresh clone
- [ ] Expandable sections are only added when needed
- [ ] No duplicated content — link to docs/ for details
