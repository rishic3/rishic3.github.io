# rishic3.github.io

Personal website with Reading and Writing sections, hosted on GitHub Pages.

## Structure

```
├── index.html              Home page
├── math-notes.html         Writing section (technical blog posts)
├── reading-notes.html      Reading section (book list with expandable notes)
├── css/
│   └── style.css           Unified stylesheet (Notion-inspired design system)
├── js/
│   ├── markdown-blog.js    Markdown/math/code rendering engine (Blog API)
│   ├── dark-mode.js        Light/dark theme toggle
│   └── back-to-top.js      Scroll-to-top button
├── notes/
│   ├── technical/          Writing posts (each in its own directory)
│   │   ├── svd/
│   │   ├── torch-compile/
│   │   ├── gbdt/
│   │   ├── umap/
│   │   └── memory-virtualization/
│   └── books/              Book notes organized by year
│       ├── 2023/
│       ├── 2024/
│       └── 2025/
```

## Tech Stack

- **Markdown rendering**: [Marked](https://marked.js.org/)
- **Math**: [KaTeX](https://katex.org/) (inline `$...$` and display `$$...$$`)
- **Code highlighting**: [Highlight.js](https://highlightjs.org/) with custom theme via CSS variables
- **Styling**: Vanilla CSS with custom properties for light/dark theming
- No build step — everything is static and client-side rendered

## Local Development

```bash
python -m http.server 7000
# Open http://localhost:7000
```

## Adding Content

- **New writing post**: See [README-adding-math-notes.md](README-adding-math-notes.md)
- **New book entry**: See [README-adding-books.md](README-adding-books.md)
