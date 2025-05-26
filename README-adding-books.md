# Adding New Books to Reading Notes

This guide provides step-by-step instructions for adding new books to the reading notes page.

## Overview

The reading notes page displays books in a chronological list organized by year. Books can be added with or without notes:
- **Books with notes**: Display with a dropdown arrow and expandable content
- **Books without notes**: Display as simple, non-interactive entries

## Step 1: Determine Book Type

First, decide whether you want to add:
- **A book with notes**: You have written notes/review that you want to display
- **A book without notes**: Just listing the book you've read

## Step 2: Adding a Book WITHOUT Notes

### 2.1 Edit the HTML file
Open `reading-notes.html` and locate the appropriate year section.

### 2.2 Add the book entry
Add a new `<li>` element in the correct chronological position:

```html
<li class="file-item">
    <button class="file-toggle no-notes">
        <span class="post-title"><i>Book Title</i></span>
        <span class="post-subtitle">Author Name</span>
    </button>
</li>
```

### 2.3 Key points
- Use `<i>` tags around the book title for italics
- Add the `no-notes` class to the button
- Do NOT include a `data-file` attribute
- Do NOT include a `<div class="file-content">` section

## Step 3: Adding a Book WITH Notes

### 3.1 Create the markdown file
Create a new markdown file in the appropriate year folder:
```
notes/books/YYYY/book-title.md
```

Example path: `notes/books/2024/book-title.md`

### 3.2 Add frontmatter to the markdown file
Start your markdown file with YAML frontmatter:

```yaml
---
title: "Book Title"
author: "Author Name"
date: "YYYY-MM-DD"
rating: "X/5"
category: "fiction" # or "non-fiction", "biography", etc.
tags: ["tag1", "tag2", "tag3"]
---

# Your notes content here

Write your book notes, thoughts, and review here using standard markdown formatting.

## Key Takeaways
- Point 1
- Point 2

## Favorite Quotes
> "Quote here"

## My Thoughts
Your review and thoughts...
```

### 3.3 Edit the HTML file
Open `reading-notes.html` and locate the appropriate year section.

### 3.4 Add the book entry with dropdown
Add a new `<li>` element in the correct chronological position:

```html
<li class="file-item">
    <button class="file-toggle" data-file="notes/books/YYYY/book-title.md">
        <span class="post-title"><i>Book Title</i></span>
        <span class="post-subtitle">Author Name</span>
    </button>
    <div class="file-content">
        <div class="markdown-body markdown-content"></div>
    </div>
</li>
```

### 3.5 Key points
- Do NOT add the `no-notes` class
- Include the `data-file` attribute pointing to your markdown file
- Include the `<div class="file-content">` section for the dropdown content

## Step 4: Organizing by Year

### 4.1 Adding a new year section
If you're adding the first book for a new year, create a new year heading:

```html
<li class="year-heading">YYYY</li>
<!-- Books for this year go here -->
```

### 4.2 Chronological order
- Years are listed in descending order (newest first)
- Within each year, books are typically listed in the order you read them (most recent first)

## Step 5: Testing

### 5.1 For books without notes
- The book should appear as a non-interactive entry
- No dropdown arrow should be visible
- Clicking should do nothing

### 5.2 For books with notes
- The book should display with a dropdown arrow (▼)
- Clicking should expand/collapse the notes content
- The arrow should rotate when expanded

## Example: Complete Book Entry with Notes

```html
<li class="file-item">
    <button class="file-toggle" data-file="notes/books/2024/sapiens.md">
        <span class="post-title"><i>Sapiens</i></span>
        <span class="post-subtitle">Yuval Noah Harari</span>
    </button>
    <div class="file-content">
        <div class="markdown-body markdown-content"></div>
    </div>
</li>
```

## Example: Complete Book Entry without Notes

```html
<li class="file-item">
    <button class="file-toggle no-notes">
        <span class="post-title"><i>Never Let Me Go</i></span>
        <span class="post-subtitle">Kazuo Ishiguro</span>
    </button>
</li>
```

## Tips

1. **File naming**: Use lowercase, hyphen-separated names for markdown files (e.g., `the-great-gatsby.md`)
2. **Consistency**: Keep author name formatting consistent
3. **Chronology**: Add new books at the top of their respective year section
4. **Testing**: Always test the dropdown functionality after adding books with notes
5. **Images**: If your notes include images, place them in `notes/books/YYYY/images/` folder

## Troubleshooting

- **Dropdown not working**: Check that the `data-file` path is correct and the markdown file exists
- **No arrow showing**: Ensure the button has the `data-file` attribute and does NOT have the `no-notes` class
- **Styling issues**: Verify the HTML structure matches the examples exactly 