# IOF List Manipulator

A static single-page application that lets orienteering race organizers edit IOF XML 3.0 result lists through a browser-based GUI.
Load a result list, fix errors or adjust results, then download the corrected XML file.
No backend or server is required — all processing happens in the browser.

## Usage

1. Open the app in your browser.
2. Click **Load file** and select an IOF XML 3.0 result list (`.xml`).
3. Edit the event, classes, runners, times, and split times as needed.
4. Click **Export XML** to download the corrected result list.

## Local development

```bash
npm install
npm run dev      # start Vite dev server at http://localhost:5173
npm test         # run unit tests (Vitest)
npm run lint     # run ESLint
npm run build    # build static site to build/
```

## Stack

- [SvelteKit 2](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) (TypeScript)
- [@sveltejs/adapter-static](https://github.com/sveltejs/kit/tree/main/packages/adapter-static) — static site output
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Vitest](https://vitest.dev/) — unit tests
- Browser-native `DOMParser` / `XMLSerializer` — zero-dependency XML I/O

## Hosting

The `build/` output is plain static files.
Deploy to any static host: Cloudflare Pages, Vercel, Netlify, GitHub Pages, etc.

## IOF XML Standard

This tool implements the [IOF Data Standard 3.0](https://orienteering.sport/iof/it/data-standard-3-0/).
