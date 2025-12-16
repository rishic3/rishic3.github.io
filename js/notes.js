document.addEventListener('DOMContentLoaded', () => {
    // Generate star ratings for books
    function generateStarRatings() {
        // Find all buttons with data-rating attribute
        document.querySelectorAll('.file-toggle[data-rating]').forEach(button => {
            const rating = parseInt(button.getAttribute('data-rating'));
            
            // Get the existing title and subtitle elements
            const titleElement = button.querySelector('.post-title');
            const subtitleElement = button.querySelector('.post-subtitle');
            
            if (titleElement && subtitleElement) {
                // Clear existing content
                button.innerHTML = '';
                
                // Create new structure
                const bookInfo = document.createElement('div');
                bookInfo.className = 'book-info';
                
                const titleAuthorRow = document.createElement('div');
                titleAuthorRow.className = 'title-author-row';
                titleAuthorRow.appendChild(titleElement.cloneNode(true));
                titleAuthorRow.appendChild(subtitleElement.cloneNode(true));
                
                const starRating = document.createElement('div');
                starRating.className = 'star-rating';
                
                // Generate 10 stars
                for (let i = 1; i <= 10; i++) {
                    const star = document.createElement('span');
                    star.textContent = '★';
                    star.className = i <= rating ? 'star' : 'star star-empty';
                    starRating.appendChild(star);
                }
                
                bookInfo.appendChild(titleAuthorRow);
                bookInfo.appendChild(starRating);
                button.appendChild(bookInfo);
                
                // If the button has a dropdown arrow (books with notes), add it back
                if (button.hasAttribute('data-file')) {
                    button.style.display = 'flex';
                    button.style.alignItems = 'flex-start';
                    // The CSS ::after pseudo-element will handle the arrow
                }
            }
        });
        
        // Also handle buttons without ratings to show empty stars
        document.querySelectorAll('.file-toggle:not([data-rating])').forEach(button => {
            const titleElement = button.querySelector('.post-title');
            const subtitleElement = button.querySelector('.post-subtitle');
            
            if (titleElement && subtitleElement) {
                // Clear existing content
                button.innerHTML = '';
                
                // Create new structure
                const bookInfo = document.createElement('div');
                bookInfo.className = 'book-info';
                
                const titleAuthorRow = document.createElement('div');
                titleAuthorRow.className = 'title-author-row';
                titleAuthorRow.appendChild(titleElement.cloneNode(true));
                titleAuthorRow.appendChild(subtitleElement.cloneNode(true));
                
                const starRating = document.createElement('div');
                starRating.className = 'star-rating';
                
                // Generate 10 empty stars
                for (let i = 1; i <= 10; i++) {
                    const star = document.createElement('span');
                    star.textContent = '★';
                    star.className = 'star star-empty';
                    starRating.appendChild(star);
                }
                
                bookInfo.appendChild(titleAuthorRow);
                bookInfo.appendChild(starRating);
                button.appendChild(bookInfo);
                
                // If the button has a dropdown arrow (books with notes), add it back
                if (button.hasAttribute('data-file')) {
                    button.style.display = 'flex';
                    button.style.alignItems = 'flex-start';
                    // The CSS ::after pseudo-element will handle the arrow
                }
            }
        });
    }
    
    // Run star generation on page load
    generateStarRatings();

    // handle inline and block math
    const blockMathExtension = {
        name: 'blockMath',
        level: 'block',
        start(src) {
            return src.match(/\$\$\n/)?.index;
        },
        tokenizer(src) {
            const rule = /^\$\$\n([\s\S]*?)\n\$\$/;
            const match = rule.exec(src);
            if (match) {
                return {
                    type: 'blockMath',
                    raw: match[0],
                    text: match[1]
                };
            }
        },
        renderer(token) {
            return `$$\n${token.text}\n$$\n`;
        }
    };

    const inlineMathExtension = {
        name: 'inlineMath',
        level: 'inline',
        start(src) {
            return src.match(/\$/)?.index;
        },
        tokenizer(src) {
            const rule = /^\$([^\n$]+)\$/;
            const match = rule.exec(src);
            if (match) {
                return {
                    type: 'inlineMath',
                    raw: match[0],
                    text: match[1]
                };
            }
        },
        renderer(token) {
            return `$${token.text}$`;
        }
    };

    marked.setOptions({
        breaks: true,
        mangle: false,
        headerIds: false
    });

    marked.use({ extensions: [blockMathExtension, inlineMathExtension] });

    // Only activate toggles on reading-notes page
    if (document.body.dataset.notesType === 'reading') {
        document.querySelectorAll('.file-toggle[data-file]').forEach(toggle => {
            const filePath = toggle.getAttribute('data-file');
            
            toggle.addEventListener('click', async () => {
                const fileContentDiv = toggle.nextElementSibling.querySelector('.markdown-content');
                toggle.classList.toggle('active');
                toggle.nextElementSibling.classList.toggle('active');

                if (toggle.classList.contains('active') && !fileContentDiv.innerHTML.trim()) {
                    try {
                        const response = await fetch(filePath);
                        if (!response.ok) throw new Error(`Could not load ${filePath}`);
                        const markdown = await response.text();
                        
                        const baseDir = filePath.substring(0, filePath.lastIndexOf('/'));
                        let modifiedMarkdown = markdown.replace(
                            /!\[([^\]]*)\]\((images\/[^)]+)\)/g,
                            (match, altText, imagePath) => {
                                const newPath = `${baseDir}/${imagePath}`;
                                return `![${altText}](${newPath})`;
                            }
                        ).replace(
                            /<img[^>]*src="images\/([^"]+)"([^>]*)>/g,
                            (match, imagePath, rest) => {
                                const newPath = `${baseDir}/images/${imagePath}`;
                                return `<img src="${newPath}"${rest}>`;
                            }
                        );

                        fileContentDiv.innerHTML = marked.parse(modifiedMarkdown);
                        
                        if (window.MathJax) {
                            window.MathJax.texReset();
                            window.MathJax.typesetClear([fileContentDiv]);
                            window.MathJax.typesetPromise([fileContentDiv]).catch((err) => {
                                console.error('MathJax error:', err);
                            });
                        }
                    } catch (error) {
                        fileContentDiv.innerHTML = `<p>Error loading content: ${error.message}</p>`;
                    }
                }
            });
        });
    }
});
