# Adding New Writing Posts

Step-by-step guide for adding new technical notes to the Writing section.

## Overview

The writing system uses:
- **Marked** for Markdown → HTML conversion
- **KaTeX** for LaTeX math rendering (inline `$...$` and display `$$...$$`)
- **Highlight.js** for syntax-highlighted code blocks
- Hash-based routing (`#/post/slug`) for individual post URLs
- YAML frontmatter for post metadata (title, date, tags, description)

## Step 1: Create the Directory Structure

### 1.1 Choose a topic name
Pick a short, lowercase, hyphenated name: `neural-networks`, `linear-algebra`, `algorithms`, etc.

### 1.2 Create the directory and (optionally) an images folder
```
notes/technical/your-topic-name/
notes/technical/your-topic-name/images/   # if your post includes images
```

## Step 2: Create the Markdown File

### 2.1 Create the file
The filename should match the directory name:
```
notes/technical/your-topic-name/your-topic-name.md
```

### 2.2 Add YAML frontmatter
Every post starts with frontmatter between `---` delimiters:

```yaml
---
title: "Your Post Title"
date: "YYYY-MM-DD"
tags: ["tag1", "tag2", "tag3"]
description: "A brief 1-2 sentence summary shown in the post list."
---
```

**Fields:**
| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Display title |
| `date` | Yes | `YYYY-MM-DD` format, used for sort order |
| `tags` | No | Array of tags — each gets a unique Notion-style color automatically |
| `description` | No | Summary shown beneath the title in the post list |

## Step 3: Write Your Content

### 3.1 Structure
Use standard Markdown after the frontmatter:

```markdown
# Main Topic

Brief introduction.

## Section 1

Content here...

### Subsection

More detail...
```

### 3.2 Math (KaTeX)
- **Inline**: `$E = mc^2$`
- **Display** (on its own line):
  ```
  $$
  \frac{\partial}{\partial x} \int_{a}^{x} f(t)\,dt = f(x)
  $$
  ```
- Full LaTeX is supported: matrices, integrals, summations, aligned environments, etc.
- Custom macros available: `\implies` → ⇒, `\iff` → ⇔

### 3.3 Code blocks
Use fenced code blocks with a language tag. The system adds a language label, a "Copy" button, and syntax highlighting automatically.

````
```python
def gradient_descent(f, grad_f, x0, alpha=0.01):
    x = x0
    for _ in range(1000):
        x = x - alpha * grad_f(x)
    return x
```
````

### 3.4 Images
Place images in the `images/` subfolder and reference with relative paths:
```markdown
![Neural network architecture](images/nn-diagram.png)
```
HTML `<img>` tags also work. Relative paths are resolved automatically.

### 3.5 Annotations (hover tooltips)
Attach hidden commentary to any text:
```markdown
The algorithm uses [amortized analysis]{"We average the cost over a sequence of operations rather than looking at worst-case per-operation cost."} to achieve O(1).
```
The bracketed text renders with a dotted underline. Hovering reveals the tooltip. Moving the mouse away (or pressing Escape) dismisses it.

## Step 4: Register the Post

Posts are **not** auto-discovered. You must add the path to the `NOTE_PATHS` array in `math-notes.html`:

```html
<script>
    const NOTE_PATHS = [
        'notes/technical/memory-virtualization/memory-virtualization.md',
        'notes/technical/torch-compile/torch-compile.md',
        'notes/technical/gbdt/gbdt.md',
        'notes/technical/svd/svd.md',
        'notes/technical/umap/umap.md',
        'notes/technical/your-topic-name/your-topic-name.md'   // ← add here
    ];
```

Without this step the post will not appear.

## Step 5: Testing

1. Start a local server: `python -m http.server 7000`
2. Open `http://localhost:7000/math-notes.html`
3. Verify:
   - Post appears in the list with correct title, description, date, and colored tags
   - Clicking the post navigates to `#/post/your-topic-name`
   - Math renders correctly (both inline and display)
   - Code blocks have syntax highlighting, language label, and Copy button
   - Images load
   - "← Back to Writing" returns to the list
   - Annotations show tooltips on hover

## Tag Guidelines

- Use lowercase, hyphenated names: `linear-algebra`, `machine-learning`
- Reuse existing tags for consistency
- Each tag gets a unique color automatically (collision-avoidant up to 7 tags)
- Common tags: `linear-algebra`, `machine-learning`, `deep-learning`, `optimization`, `python`, `pytorch`, `algorithms`, `statistics`, `gpu`, `notes`

## Example: Complete Post

```markdown
---
title: "Understanding Gradient Descent"
date: "2024-03-15"
tags: ["optimization", "machine-learning", "calculus"]
description: "An intuitive explanation of gradient descent with derivations and Python code."
---

# Understanding Gradient Descent

Gradient descent minimizes $f(x)$ by iteratively stepping in the direction of steepest descent:

$$
x_{n+1} = x_n - \alpha \nabla f(x_n)
$$

## Implementation

```python
def gradient_descent(f, grad_f, x0, alpha=0.01, max_iter=1000):
    x = x0
    for i in range(max_iter):
        x = x - alpha * grad_f(x)
    return x
```

![Gradient descent path](images/gradient-descent.png)
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Post not appearing | Ensure path is in `NOTE_PATHS` in `math-notes.html` |
| Math not rendering | Check LaTeX syntax; verify `$` delimiters aren't ambiguous |
| Images not loading | Check relative path; images should be in `images/` subfolder |
| Tags all gray | Verify tags field is an array in frontmatter: `["a", "b"]` |
| Code not highlighted | Add a language tag to the fenced code block |
