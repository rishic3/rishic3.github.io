# Adding New Books to Reading Notes

Step-by-step guide for adding new books to the Reading page.

## Overview

The reading page displays books in a chronological list organized by year:
- **Books without notes** — non-interactive entries showing title and author
- **Books with notes** — clickable entries that expand to show rendered Markdown content
- **Standout books** — highlighted with an accent border via the `standout` class

## Step 1: Choose the Entry Type

Decide whether the book will have:
- **No notes** — just a listing (title + author)
- **Notes** — a Markdown file that renders in an expandable dropdown

## Step 2: Adding a Book WITHOUT Notes

Open `reading-notes.html` and add a `<li>` in the correct year section:

```html
<li class="book-item">
    <button class="book-toggle">
        <span class="book-title">Book Title</span>
        <span class="book-author">Author Name</span>
    </button>
</li>
```

To mark it as a personal standout, add the `standout` class to the `<li>`:

```html
<li class="book-item standout">
    <button class="book-toggle">
        <span class="book-title">Book Title</span>
        <span class="book-author">Author Name</span>
    </button>
</li>
```

Key points:
- Do **not** add the `has-notes` class to the button
- Do **not** include a `data-file` attribute
- Do **not** include a `<div class="book-content">` section

## Step 3: Adding a Book WITH Notes

### 3.1 Create the Markdown file
```
notes/books/YYYY/book-title.md
```
Example: `notes/books/2024/sapiens.md`

### 3.2 Write the Markdown content
Standard Markdown is supported. You can optionally include YAML frontmatter:

```yaml
---
title: "Book Title"
author: "Author Name"
---
```

Then write your notes:

```markdown
# Key Takeaways

- Point 1
- Point 2

## Favorite Quotes

> "A quote from the book."

## My Thoughts

Your review here...
```

Math (via KaTeX) is also supported if needed.

### 3.3 Add the HTML entry
In `reading-notes.html`, add the entry in the correct year section:

```html
<li class="book-item">
    <button class="book-toggle has-notes" data-file="notes/books/YYYY/book-title.md">
        <span class="book-title">Book Title</span>
        <span class="book-author">Author Name</span>
        <span class="book-chevron">▾</span>
    </button>
    <div class="book-content"><div class="post-content"></div></div>
</li>
```

For a standout book with notes:

```html
<li class="book-item standout">
    <button class="book-toggle has-notes" data-file="notes/books/YYYY/book-title.md">
        <span class="book-title">Book Title</span>
        <span class="book-author">Author Name</span>
        <span class="book-chevron">▾</span>
    </button>
    <div class="book-content"><div class="post-content"></div></div>
</li>
```

Key points:
- The button **must** have the `has-notes` class and a `data-file` attribute
- Include the `<span class="book-chevron">▾</span>` for the expand/collapse arrow
- Include the `<div class="book-content"><div class="post-content"></div></div>` for content

## Step 4: Organizing by Year

### Adding a new year section
Years are listed in descending order (newest first). For a new year:

```html
<li class="year-heading">2027</li>
<!-- Books go here, most recent first -->
```

### Ordering
Within each year, list books in reverse chronological order (most recently read first).

## Step 5: Testing

1. Start a local server: `python -m http.server 7000`
2. Open `http://localhost:7000/reading-notes.html`

**For books without notes:**
- Entry appears as a flat row (title left, author right)
- No chevron, no hover cursor
- Clicking does nothing

**For books with notes:**
- Entry shows a chevron (▾) and pointer cursor on hover
- Clicking expands the dropdown with rendered Markdown
- Chevron rotates when expanded
- Clicking again collapses

**For standout books:**
- Entry has an accent-colored border

## Class Reference

| Class | Element | Purpose |
|-------|---------|---------|
| `book-item` | `<li>` | Wrapper for each book entry |
| `book-item standout` | `<li>` | Highlighted book with accent border |
| `book-toggle` | `<button>` | The clickable row (or static row if no notes) |
| `book-toggle has-notes` | `<button>` | Indicates the book has expandable notes |
| `book-title` | `<span>` | Book title (italicized via CSS) |
| `book-author` | `<span>` | Author name (secondary color, right-aligned) |
| `book-chevron` | `<span>` | Expand/collapse arrow indicator |
| `book-content` | `<div>` | Dropdown container (hidden by default) |
| `post-content` | `<div>` | Inner container where Markdown is rendered |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Dropdown not working | Verify `has-notes` class and correct `data-file` path |
| No chevron showing | Ensure `<span class="book-chevron">▾</span>` is present |
| Author misaligned | Check that `book-title` and `book-author` spans are siblings inside `book-toggle` |
| Notes not rendering | Check that the Markdown file exists at the `data-file` path |
| Standout border missing | Add `standout` class to the `<li class="book-item">` element |
