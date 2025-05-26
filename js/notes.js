document.addEventListener('DOMContentLoaded', () => {
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