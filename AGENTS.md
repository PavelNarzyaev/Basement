# Project Instructions

The canonical description of the project's main task is [Task.md](docs/main_task/Task.md).

Write code that follows modern Three.js development best practices. Keep the code clear and easy for other developers to read and make changes.

## Git Staging

The developer uses the staging area as a review boundary. Treat files or hunks already staged as reviewed or intentionally separated from later work.

- Do not stage changes (`git add`) unless explicitly instructed to create a commit of unstaged changes.
- Do not unstage changes (`git restore --staged`, `git reset`, etc.).
- When the developer asks to create a commit, commit the files already staged unless instructed otherwise.
- When adding new edits on top of an existing staged set, leave the new edits unstaged so the developer can review them separately.

## Fail Fast

Follow the fail-fast principle when writing code. Do not introduce defensive checks (null, empty, existence, etc.) unless they are clearly necessary and justified. Fix errors instead of hiding them.

## Coding Standards

- Prioritize readability. Choose clear, precise names that describe actual behavior and purpose. Prefer clarity over brevity, and avoid abbreviations and acronyms where practical.
- Preserve domain terminology and the object's role when naming local variables and aliases. Do not replace a precise source name with a generic synonym merely to shorten it (for example, prefer `crateCollider` over `box` for `crate.collider`). Omit parts of a name only when the enclosing scope makes their meaning clear and unambiguous (for example, `collider` when only one collider is relevant). Within reasonable limits, prefer a longer, explicit name over a shorter, ambiguous one; avoid redundant qualifiers and repetition of context. Use terms such as `cache`, `copy`, or `snapshot` only when they describe actual behavior.
- Use nouns or noun phrases for types, interfaces, properties, variables, and parameters. Use verbs or verb phrases for functions and methods that perform actions.
- Name booleans as yes/no conditions, using prefixes such as `is`, `has`, `can`, `should`, `was`, or `needs` where appropriate.
- Follow the naming conventions already used in the project. In TypeScript, use `PascalCase` for classes, interfaces, and type aliases, and `camelCase` for functions, methods, properties, variables, and parameters.
- End every source file with exactly one newline.
- Add comments only when they explain non-obvious behavior, side effects, or risks that the code itself cannot make clear.

## Module Architecture

- Organize application code into module folders directly under `src`.
- Each module may contain `contracts`, `runtime`, `editor`, and `tests` folders. Create these folders only when needed.
- Each TypeScript file that declares a class in `runtime`, `editor`, or `contracts` must export exactly one class, and its filename must match the class name (for example, `runtime/BasementScene.ts` exports `BasementScene`).
- Place development-only HTML panels and local editor integrations in `editor`. Runtime code must not import editor implementations; wire them in the composition root and exclude them from production builds. Editors access other modules through contracts.
- Place gameplay implementation classes in `runtime` and development-only implementations in `editor`. Keep implementation behavior in class methods rather than standalone functions.
- Place public contracts in `contracts`: interfaces, data transfer objects (DTOs), type aliases, enums, and constants. Contracts describe data and APIs; they must not contain application behavior or depend on runtime implementations.
- Use interfaces for behavior contracts. Represent structured data passed between components as classes with the `Dto` suffix (for example, `PlayerSpawnDto`), rather than data-only interfaces or object-shaped type aliases. DTOs have no application behavior. Create DTO instances explicitly when producing data at module boundaries.
- Declare each interface in a separate file. Interface names must start with `I` and use `PascalCase`; the filename must match the interface name (for example, `contracts/IScene.ts`).
- Give each DTO, type alias, and enum its own file named after the exported declaration. Keep closely related constants in a descriptively named constants file. DTO classes contain data only.
- Place module tests in `tests`. Test files are exempt from the exported-class rule and use descriptive names ending in `.test.ts`.
- Application entry points such as `src/main.ts` and tool configuration files are exempt from the module class layout.
- Runtime code may access other modules only through their `contracts`; it must not import another module's runtime implementations, including type-only imports. Runtime implementations within the same module may depend on each other.
- Use `src/main.ts` as the composition root: select concrete implementations and wire dependencies there. Inject dependencies through interfaces; for objects created later, inject factories with interface contracts and define their wiring in the composition root.
- Reciprocal dependencies between modules through contracts are allowed. Contracts must not depend on runtime implementations.

## Development Tuning

- The development settings panel and MCP integration share live settings with the running game. See [live tuning](docs/live-tuning.md).
- For tuning requests, use the configured `basement_tuning` MCP tools against the running development server. Read current values before editing or saving. Keep previews unsaved unless the user requests saving; saving updates `src/tuning/contracts/tuningDefaults.json` and does not authorize staging, committing, or publishing.

## Blender

- Perform all Blender work exclusively through Blender MCP.
- Check that Blender MCP can connect to Blender before starting any Blender work.
- If Blender MCP is unavailable or the connection fails, stop Blender work and inform the user. Do not use command-line or background Blender processes, direct file manipulation, or UI automation as a fallback.
