# Adding New Books to Reading Notes

Step-by-step guide for adding new books to the Reading page.

## Overview

The reading page displays books in a chronological list organized by year:
- **Books without notes** — entries whose titles link to Goodreads
- **Books with notes** — clickable entries that expand to show rendered Markdown content
- **Standout books** — highlighted with an accent border via the `standout` class

## Step 1: Choose the Entry Type

Decide whether the book will have:
- **No notes** — just a listing (title + author)
- **Notes** — a Markdown file that renders in an expandable dropdown

Find the book's direct `https://www.goodreads.com/book/show/...` page and verify
that its title and author match before adding the entry.

## Step 2: Adding a Book WITHOUT Notes

Open `reading.html` and add a `<li>` in the correct year section:

```html
<li class="book-item">
    <div class="book-toggle">
        <a class="book-title" href="https://www.goodreads.com/book/show/BOOK_ID" target="_blank" rel="noopener noreferrer">Book Title</a>
        <span class="book-author">Author Name</span>
    </div>
</li>
```

To mark it as a personal standout, add the `standout` class to the `<li>`:

```html
<li class="book-item standout">
    <div class="book-toggle">
        <a class="book-title" href="https://www.goodreads.com/book/show/BOOK_ID" target="_blank" rel="noopener noreferrer">Book Title</a>
        <span class="book-author">Author Name</span>
    </div>
</li>
```

Key points:
- Do **not** add the `has-notes` class to the row
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
In `reading.html`, add the entry in the correct year section:

```html
<li class="book-item">
    <div class="book-toggle has-notes" data-file="notes/books/YYYY/book-title.md">
        <a class="book-title" href="https://www.goodreads.com/book/show/BOOK_ID" target="_blank" rel="noopener noreferrer">Book Title</a>
        <span class="book-author">Author Name</span>
        <button class="book-chevron" type="button" aria-label="Toggle notes for Book Title" aria-expanded="false">▾</button>
    </div>
    <div class="book-content"><div class="post-content"></div></div>
</li>
```

For a standout book with notes:

```html
<li class="book-item standout">
    <div class="book-toggle has-notes" data-file="notes/books/YYYY/book-title.md">
        <a class="book-title" href="https://www.goodreads.com/book/show/BOOK_ID" target="_blank" rel="noopener noreferrer">Book Title</a>
        <span class="book-author">Author Name</span>
        <button class="book-chevron" type="button" aria-label="Toggle notes for Book Title" aria-expanded="false">▾</button>
    </div>
    <div class="book-content"><div class="post-content"></div></div>
</li>
```

Key points:
- The row **must** have the `has-notes` class and a `data-file` attribute
- Include the `<button class="book-chevron">` for keyboard-accessible expand/collapse
- Include the `<div class="book-content"><div class="post-content"></div></div>` for content
- Clicking the title follows Goodreads; clicking elsewhere in the row toggles the notes

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
2. Open `http://localhost:7000/reading.html`

**For books without notes:**
- Entry appears as a flat row (title left, author right)
- No chevron or row hover cursor
- Clicking the title opens its validated Goodreads page

**For books with notes:**
- Entry shows a chevron (▾) and pointer cursor on hover
- Clicking anywhere except the title expands the dropdown with rendered Markdown
- Clicking the title opens Goodreads without expanding the dropdown
- Chevron rotates when expanded
- Clicking again collapses

**For standout books:**
- Entry has an accent-colored border

## Class Reference

| Class | Element | Purpose |
|-------|---------|---------|
| `book-item` | `<li>` | Wrapper for each book entry |
| `book-item standout` | `<li>` | Highlighted book with accent border |
| `book-toggle` | `<div>` | Book row |
| `book-toggle has-notes` | `<div>` | Indicates the book has expandable notes |
| `book-title` | `<a>` | Book title linking to Goodreads |
| `book-author` | `<span>` | Author name (secondary color, right-aligned) |
| `book-chevron` | `<button>` | Expand/collapse arrow and keyboard control |
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
