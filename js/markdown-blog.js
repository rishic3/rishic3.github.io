// Markdown Blog System
// Handles parsing markdown files with YAML frontmatter and rendering them as blog posts

class MarkdownBlog {
    constructor() {
        this.posts = [];
        this.currentPost = null;
    }

    // Generate a consistent color for a tag based on its name
    generateTagColor(tagName) {
        // Simple hash function to convert string to number
        let hash = 0;
        for (let i = 0; i < tagName.length; i++) {
            const char = tagName.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Convert hash to positive number and use it to generate HSL color
        const positiveHash = Math.abs(hash);
        
        // Generate hue (0-360), keeping saturation and lightness consistent for readability
        const hue = positiveHash % 360;
        const saturation = 65; // Good saturation for readability
        const lightness = 85; // Light background
        
        const backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        // Generate a darker color for text (same hue, higher saturation, lower lightness)
        const textLightness = 25; // Dark text
        const textSaturation = 80; // Higher saturation for text
        const textColor = `hsl(${hue}, ${textSaturation}%, ${textLightness}%)`;
        
        return {
            backgroundColor,
            color: textColor
        };
    }

    // Parse YAML frontmatter from markdown content
    parseFrontmatter(content) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);
        
        if (!match) {
            return {
                frontmatter: {},
                content: content
            };
        }

        const frontmatterText = match[1];
        const markdownContent = match[2];
        
        // Simple YAML parser for our frontmatter
        const frontmatter = {};
        const lines = frontmatterText.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) continue;
            
            const key = trimmed.substring(0, colonIndex).trim();
            let value = trimmed.substring(colonIndex + 1).trim();
            
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            
            // Handle arrays (tags)
            if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(item => 
                    item.trim().replace(/['"]/g, '')
                );
            }
            
            frontmatter[key] = value;
        }
        
        return {
            frontmatter,
            content: markdownContent
        };
    }

    // Load and parse a markdown file
    async loadPost(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load ${path}: ${response.status}`);
            }
            
            const content = await response.text();
            const { frontmatter, content: markdownContent } = this.parseFrontmatter(content);
            
            // Convert relative image paths to absolute paths
            const basePath = path.substring(0, path.lastIndexOf('/') + 1);
            let processedContent = markdownContent;

            // Process markdown-style images: ![alt](path)
            processedContent = processedContent.replace(
                /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
                `![$1](${basePath}$2)`
            );

            // Process HTML img tags: <img src="path" ...>
            processedContent = processedContent.replace(
                /<img([^>]*)\ssrc=["'](?!https?:\/\/)([^"']+)["']([^>]*)>/g,
                `<img$1 src="${basePath}$2"$3>`
            );
            
            return {
                path,
                frontmatter,
                content: processedContent,
                basePath
            };
        } catch (error) {
            console.error('Error loading post:', error);
            throw error;
        }
    }

    // Render markdown to HTML using marked.js
    renderMarkdown(content) {
        if (typeof marked === 'undefined') {
            console.error('marked.js library not loaded');
            return content;
        }
        
        // Configure marked for math support
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false
        });
        
        return marked.parse(content);
    }

    // Generate blog post HTML
    generatePostHTML(post) {
        const { frontmatter, content } = post;
        const htmlContent = this.renderMarkdown(content);
        
        // Format date
        const date = frontmatter.date ? new Date(frontmatter.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '';
        
        // Generate tags HTML with dynamic colors
        const tagsHTML = frontmatter.tags ? 
            frontmatter.tags.map(tag => {
                const colors = this.generateTagColor(tag);
                return `<span class="tag" style="background-color: ${colors.backgroundColor}; color: ${colors.color};">${tag}</span>`;
            }).join('') : '';
        
        return `
            <article class="blog-post">
                <header class="post-header">
                    <h1 class="post-title">${frontmatter.title || 'Untitled'}</h1>
                    <div class="post-meta">
                        ${date ? `<time class="post-date">${date}</time>` : ''}
                    </div>
                    ${frontmatter.description ? `<p class="post-description">${frontmatter.description}</p>` : ''}
                    ${tagsHTML ? `<div class="post-tags">${tagsHTML}</div>` : ''}
                </header>
                <div class="post-content tex2jax_process">
                    ${htmlContent}
                </div>
            </article>
        `;
    }

    // Render a single post to the page
    async renderPost(path, containerId = 'blog-content') {
        try {
            const post = await this.loadPost(path);
            this.currentPost = post;
            
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container with id '${containerId}' not found`);
            }
            
            container.innerHTML = this.generatePostHTML(post);
            
            // Re-render MathJax if available
            if (window.MathJax && window.MathJax.typesetPromise) {
                await window.MathJax.typesetPromise([container]);
            }
            
            // Trigger syntax highlighting
            if (window.Prism) {
                window.Prism.highlightAllUnder(container);
            }
            
            return post;
        } catch (error) {
            console.error('Error rendering post:', error);
            throw error;
        }
    }

    // Generate post list for index page
    generatePostListHTML(posts) {
        return posts.map(post => {
            const { frontmatter, path } = post;
            const date = frontmatter.date ? new Date(frontmatter.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : '';
            
            const tagsHTML = frontmatter.tags ? 
                frontmatter.tags.slice(0, 3).map(tag => {
                    const colors = this.generateTagColor(tag);
                    return `<span class="tag" style="background-color: ${colors.backgroundColor}; color: ${colors.color};">${tag}</span>`;
                }).join('') : '';
            
            return `
                <li class="notes-item">
                    <a href="javascript:void(0)" onclick="loadBlogPost('${path}')">
                        <div class="note-title">${frontmatter.title || 'Untitled'}</div>
                        ${frontmatter.description ? `<div class="note-description">${frontmatter.description}</div>` : ''}
                        <div class="note-meta">
                            ${date ? `<span class="note-date">${date}</span>` : ''}
                        </div>
                        ${tagsHTML ? `<div class="note-tags">${tagsHTML}</div>` : ''}
                    </a>
                </li>
            `;
        }).join('');
    }

    // Load multiple posts for index
    async loadPosts(paths) {
        const posts = [];
        for (const path of paths) {
            try {
                const post = await this.loadPost(path);
                posts.push(post);
            } catch (error) {
                console.error(`Failed to load post ${path}:`, error);
            }
        }
        
        // Sort by date (newest first)
        posts.sort((a, b) => {
            const dateA = new Date(a.frontmatter.date || '1970-01-01');
            const dateB = new Date(b.frontmatter.date || '1970-01-01');
            return dateB - dateA;
        });
        
        this.posts = posts;
        return posts;
    }
}

// Global instance
window.markdownBlog = new MarkdownBlog();

// Global function to load a blog post
window.loadBlogPost = async function(path) {
    try {
        // Hide the notes list and show blog content
        const notesList = document.querySelector('.notes-list');
        const header = document.querySelector('.header');
        
        if (notesList) notesList.style.display = 'none';
        if (header) header.style.display = 'none';
        
        // Create or show blog content container
        let blogContainer = document.getElementById('blog-content');
        if (!blogContainer) {
            blogContainer = document.createElement('div');
            blogContainer.id = 'blog-content';
            blogContainer.className = 'blog-content';
            document.querySelector('.container').appendChild(blogContainer);
        }
        
        // Show the blog container
        blogContainer.style.display = 'block';
        
        // Show loading state
        blogContainer.innerHTML = '<div class="loading">Loading...</div>';
        
        // Load and render the post
        const post = await window.markdownBlog.loadPost(path);
        window.markdownBlog.currentPost = post;
        
        // Generate the complete blog content with back button
        const backButtonHTML = '<div class="blog-nav"><button onclick="showPostList()" class="back-button">← Back to Writing</button></div>';
        const postHTML = window.markdownBlog.generatePostHTML(post);
        
        blogContainer.innerHTML = backButtonHTML + postHTML;
        
        // Re-render MathJax if available
        if (window.MathJax && window.MathJax.typesetPromise) {
            await window.MathJax.typesetPromise([blogContainer]);
        }
        
        // Trigger syntax highlighting
        if (window.Prism) {
            window.Prism.highlightAllUnder(blogContainer);
        }
        
        // Update page title
        if (post && post.frontmatter.title) {
            document.title = `${post.frontmatter.title} - Rishi Chandra`;
        }
        
    } catch (error) {
        console.error('Error loading blog post:', error);
        const blogContainer = document.getElementById('blog-content');
        if (blogContainer) {
            blogContainer.innerHTML = `<div class="error">Error loading post: ${error.message}</div>`;
        }
    }
};

// Global function to show post list
window.showPostList = function() {
    const notesList = document.querySelector('.notes-list');
    const header = document.querySelector('.header');
    const blogContent = document.getElementById('blog-content');
    
    if (notesList) notesList.style.display = 'block';
    if (header) header.style.display = 'block';
    if (blogContent) blogContent.style.display = 'none';
    
    // Reset page title
    document.title = 'Rishi Chandra';
}; 