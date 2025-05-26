# Adding New Math/CS Notes Pages

This guide provides step-by-step instructions for adding new technical notes to the math/CS blog system.

## Overview

The math/CS notes are displayed as a dynamic blog with:
- Automatic post listing with descriptions and tags
- Individual post pages with full content
- Color-coded tags based on content
- Mathematical formula support via MathJax
- Image support with automatic path resolution

## Step 1: Create the Directory Structure

### 1.1 Choose a topic name
Pick a short, descriptive name for your topic using lowercase letters and hyphens.
Examples: `neural-networks`, `linear-algebra`, `algorithms`

### 1.2 Create the directory
Create a new folder in the technical notes directory:
```
notes/technical/your-topic-name/
```

### 1.3 Create images folder (if needed)
If your notes will include images:
```
notes/technical/your-topic-name/images/
```

## Step 2: Create the Markdown File

### 2.1 Create the main file
Create a markdown file with the same name as your directory:
```
notes/technical/your-topic-name/your-topic-name.md
```

Example: `notes/technical/neural-networks/neural-networks.md`

### 2.2 Add YAML frontmatter
Start your markdown file with comprehensive frontmatter:

```yaml
---
title: "Your Post Title"
date: "YYYY-MM-DD"
layout: "post"
category: "machine-learning"  # or "mathematics", "computer-science", "algorithms", etc.
tags: ["tag1", "tag2", "tag3", "tag4"]
description: "A brief 1-2 sentence description of what this post covers. This will appear in the post list."
---
```

### 2.3 Frontmatter field guide

- **title**: The display title for your post (can include spaces and special characters)
- **date**: Publication date in YYYY-MM-DD format
- **layout**: Always use "post"
- **category**: Main category (used for organization, not displayed)
- **tags**: Array of relevant tags (will be color-coded automatically)
- **description**: Brief summary for the post list (keep it concise)

## Step 3: Write Your Content

### 3.1 Content structure
After the frontmatter, write your content using standard markdown:

```markdown
# Main Topic

Brief introduction to the topic.

## Section 1: Fundamentals

Content here...

### Subsection
More detailed content...

## Section 2: Advanced Concepts

More content...

## Mathematical Formulas

Inline math: $E = mc^2$

Block math:
$$
\frac{\partial}{\partial x} \int_{a}^{x} f(t) dt = f(x)
$$

## Code Examples

```python
def example_function():
    return "Hello, World!"
```

## Images

![Description](images/your-image.png)
```

### 3.2 Mathematical formulas
- **Inline math**: Use single dollar signs `$formula$`
- **Block math**: Use double dollar signs on separate lines:
  ```
  $$
  formula here
  $$
  ```

### 3.3 Images
- Place images in the `images/` subfolder
- Reference them with relative paths: `images/filename.png`
- Use descriptive alt text: `![Neural network architecture](images/nn-diagram.png)`
- Both markdown format `![alt](path)` and HTML `<img src="path">` work

### 3.4 Code blocks
Use triple backticks with language specification:
```
```python
your code here
```
```

## Step 4: Tag Selection Guidelines

### 4.1 Choose relevant tags
Select 3-6 tags that best describe your content. Each tag will get a unique color automatically.

### 4.2 Common tag categories
- **Math topics**: `linear-algebra`, `calculus`, `statistics`, `probability`
- **ML/AI**: `machine-learning`, `deep-learning`, `neural-networks`, `optimization`
- **CS topics**: `algorithms`, `data-structures`, `complexity-theory`
- **Programming**: `python`, `pytorch`, `numpy`, `implementation`
- **Applications**: `computer-vision`, `nlp`, `reinforcement-learning`

### 4.3 Tag naming conventions
- Use lowercase letters
- Separate words with hyphens
- Be specific but not overly narrow
- Reuse existing tags when appropriate for consistency

## Step 5: Testing Your Post

### 5.1 Check the post list
1. Open `math-notes.html` in your browser
2. Verify your post appears in the list
3. Check that the description and tags display correctly
4. Verify tag colors are applied

### 5.2 Check the individual post
1. Click on your post title
2. Verify all content renders correctly
3. Test mathematical formulas
4. Check that images load properly
5. Test the "Back to Notes" functionality

## Example: Complete Post Structure

```markdown
---
title: "Understanding Gradient Descent"
date: "2024-03-15"
layout: "post"
category: "machine-learning"
tags: ["optimization", "machine-learning", "calculus", "algorithms"]
description: "An intuitive explanation of gradient descent optimization with mathematical derivations and Python implementations."
---

# Understanding Gradient Descent

Gradient descent is a fundamental optimization algorithm used extensively in machine learning...

## The Mathematical Foundation

The core idea is to minimize a function $f(x)$ by iteratively moving in the direction of steepest descent:

$$
x_{n+1} = x_n - \alpha \nabla f(x_n)
$$

where $\alpha$ is the learning rate.

## Implementation

```python
def gradient_descent(f, grad_f, x0, alpha=0.01, max_iter=1000):
    x = x0
    for i in range(max_iter):
        x = x - alpha * grad_f(x)
    return x
```

## Visualization

![Gradient descent path](images/gradient-descent.png)

The image above shows how gradient descent navigates the loss landscape...
```

## Step 6: Advanced Features

### 6.1 Complex mathematical notation
The system supports full LaTeX math notation:
- Matrices: `\begin{pmatrix} a & b \\ c & d \end{pmatrix}`
- Integrals: `\int_{-\infty}^{\infty} e^{-x^2} dx`
- Summations: `\sum_{i=1}^{n} x_i`

### 6.2 Image optimization
- Use web-optimized formats (PNG, JPG, WebP)
- Keep file sizes reasonable for web loading
- Use descriptive filenames

### 6.3 Cross-referencing
You can link to other posts or external resources:
```markdown
See my previous post on [Linear Algebra](../linear-algebra/linear-algebra.md) for background.
```

## Troubleshooting

### Common issues:
- **Post not appearing**: Check frontmatter syntax and file location
- **Math not rendering**: Verify LaTeX syntax and dollar sign placement
- **Images not loading**: Check file paths and ensure images exist
- **Tags not colored**: Verify tags are in array format in frontmatter
- **Broken layout**: Check markdown syntax and frontmatter formatting

### Debugging steps:
1. Check browser console for JavaScript errors
2. Verify file paths are correct
3. Test markdown syntax in a markdown preview tool
4. Ensure frontmatter is valid YAML

## Tips for Great Posts

1. **Start with motivation**: Explain why the topic matters
2. **Build incrementally**: Start simple, add complexity gradually
3. **Use examples**: Concrete examples help understanding
4. **Include visuals**: Diagrams and plots enhance comprehension
5. **Provide implementations**: Code examples make concepts tangible
6. **Cross-reference**: Link to related concepts and external resources
7. **Keep it focused**: One main concept per post works best 