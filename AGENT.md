# Agent Instructions

- Do not create, add, or restore frontend tests in this repository.
- Frontend tests include React component tests, client store tests, board/UI tests, CSS/smoke tests for UI behavior, PWA/browser tests, and Playwright/e2e tests.
- For frontend changes, verify with `npm run lint`, `npm run typecheck`, `npm run build`, and manual/browser checks when needed.
- Backend, API, database, auth, scripts, parser, and other server-side tests are still allowed when they fit the change.
- Keep edits scoped and do not reintroduce frontend test tooling unless the user explicitly reverses this instruction.
