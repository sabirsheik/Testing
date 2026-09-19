# Northstar workspace

Northstar is a React dashboard backed by an Express API. The API persists projects and tasks in MongoDB when `MONGODB_URI` is configured and automatically uses seeded in-memory data for local UI work when it is not.

## Run locally

```bash
npm install
copy .env.example .env
npm run server
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies `/api` requests to `http://localhost:4000`.

When the frontend is deployed separately, set `VITE_API_URL` to the public API origin before building, for example `https://api.example.com`.

Set `MONGODB_URI` and optionally `MONGODB_DB` in `.env` to enable MongoDB persistence. The server reuses one MongoDB client with a bounded pool and seeds the three demo collections only when they are empty.

API endpoints include:

- `GET /api/health` for service and database mode health
- `GET /api/dashboard` for projects, tasks, and activity
- `POST /api/projects` to create a project
- `PATCH /api/tasks/:id` to persist task completion
- `POST /api/invitations` to send an invitation event
- `GET /api/events` for server-sent realtime updates

Production checks:

```bash
npm run lint
npm run build
```

## Template reference

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
