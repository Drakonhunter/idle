# AGENTS.md

## Cursor Cloud specific instructions

This is a React + Vite starter app (project name: `idle`). It is a purely client-side SPA with no backend, database, or external services.

### Quick reference

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (serves on `localhost:5173`) |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Preview prod build | `npm run preview` |

### Notes

- Node.js >=18 is required. The lockfile is `package-lock.json` (use `npm`, not yarn/pnpm).
- There are no automated tests configured in this project; `npm run lint` (ESLint) is the primary code-quality check.
- The Vite dev server supports HMR; file saves in `src/` are reflected instantly in the browser.
- Pass `--host 0.0.0.0` to `npm run dev` if you need the dev server accessible from outside localhost (e.g., `npm run dev -- --host 0.0.0.0`).
