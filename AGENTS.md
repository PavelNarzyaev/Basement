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
