# Website Builder (Girish AI)

A browser-based AI website generator: describe the website you want in plain English, and it asks Google's Gemini 2.5 Pro to generate a complete single-file website, then shows you the code in a Monaco editor and a live preview side by side. It also remembers your prompt and generation history in `localStorage`, supports follow-up prompts to iterate on the design, and lets you export the result as an `.html` file.

## Features

- **AI website generation** — prompt → Gemini 2.5 Pro generates a complete, self-contained website in one HTML file
- **Monaco code editor** — VS Code-grade editor (via CDN) with syntax highlighting for the generated code
- **Live preview** — generated site renders in a sandboxed iframe next to the editor, refreshable and fullscreen-able
- **Follow-up prompts** — keep the original prompt as context and iterate: "make it darker", "add a pricing section"…
- **Prompt enhancer** — one click to expand a short idea into a detailed, design-aware prompt
- **History** — past prompts and generated sites persist in `localStorage`, browsable in tabs
- **Export** — download the generated website as a standalone `.html` file, copy code to clipboard
- **No build step** — plain HTML/CSS/JS, zero dependencies to install, no bundler

## Tech Stack

| Layer    | Tech                                     |
|----------|------------------------------------------|
| Frontend | Plain HTML, CSS, vanilla JavaScript      |
| AI       | Google Gemini 2.5 Pro (`generativelanguage` REST API) |
| Editor   | Monaco Editor 0.44 (CDN)                |
| Fonts / icons | Google Fonts (Inter), Font Awesome 6 |

## Quick Start

```bash
# just open it — no build, no install
open index.html
# or serve it:
npx serve .
# then visit http://localhost:3000
```

## Configuration

The app calls the Gemini API directly from the browser. Open `script.js` and set your own API key at the top of the `WebsiteBuilder` class:

```js
this.apiKey = 'YOUR_GEMINI_API_KEY';
```

Get a free key at https://aistudio.google.com/app/apikey.

> **Security note:** never commit a real API key — a key in client-side JS is visible to anyone who opens the page. Rotate your key immediately if one was ever committed.

## Project Structure

```
Website-Builder/
├── index.html        # App shell: prompt bar, editor pane, preview iframe, history tabs
├── script.js         # WebsiteBuilder class: Gemini API calls, Monaco setup, history
├── styles.css        # Full dark-theme UI styling
├── Gemini_Generated_Image_8lsgf58lsgf58lsg.png  # Logo / branding image
└── README.md
```

## Environment Variables

None — the only configuration is the Gemini API key in `script.js` (see above). No backend, no database.

## Deployment

100% static — deploy the folder as-is to any static host:

- **GitHub Pages** — the `gh-pages` branch of this repo is published at `https://girishlade111.github.io/Website-Builder/`
- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop the folder or point at this repo

## How It Works

1. You type a prompt describing the website ("a portfolio site for a photographer, dark theme").
2. `script.js` sends the prompt to `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent` with a system instruction to return one complete HTML file.
3. The returned code is loaded into the Monaco editor and rendered in the preview iframe.
4. Follow-up prompts are sent with the original prompt + current code as context, so Gemini edits instead of starting over.

## License

Free to use and learn from.

---

Built by Girish Lade · [ladestack.in](https://ladestack.in)
