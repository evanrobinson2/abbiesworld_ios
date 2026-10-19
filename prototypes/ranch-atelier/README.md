# Ranch Atelier

Snapshot of the Ranch Atelier web prototype, imported into Abbie's World iOS for continued development. This is a standalone web app; it is not yet wired into the native iOS target.

- Web source and Vercel project root: `dist/`
- Production: https://abbies-ranch-atelier.vercel.app
- Includes 101 procedural model states, Blender generators, Themes editor, surface metadata, and shared UI styles.
- Run bridge/drawing checks: `cd dist && npm ci && npm test`
- Run theme checks from this directory: `node tests/theme-engine.test.mjs`
- For local web hosting and API routes, run Vercel dev from `dist/`.
- Theme effects currently work in Themes and the asset library. Original GLB downloads retain authored materials.
- Machine credentials, environment files, deployment linkage, dependencies, and hosting metadata are excluded.

The source working directory remains the active Atelier checkout; this directory is a point-in-time import.
