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
- Use nouns or noun phrases for types, interfaces, properties, variables, and parameters. Use verbs or verb phrases for functions and methods that perform actions.
- Name booleans as yes/no conditions, using prefixes such as `is`, `has`, `can`, `should`, `was`, or `needs` where appropriate.
- Follow the naming conventions already used in the project. In TypeScript, use `PascalCase` for classes, interfaces, and type aliases, and `camelCase` for functions, methods, properties, variables, and parameters.
- End every source file with exactly one newline.
- Add comments only when they explain non-obvious behavior, side effects, or risks that the code itself cannot make clear.
