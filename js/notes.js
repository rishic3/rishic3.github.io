document.addEventListener('DOMContentLoaded', () => {
    marked.setOptions({
        breaks: true,
        mangle: false,
        headerIds: false
    });

    // handle multi-line LaTeX blocks
    const mathExtension = {
        name: 'math',
        level: 'block',
        start(src) {
            return src.match(/\$\$/)?.index;
        },
        tokenizer(src) {
            const multilineRule = /^\$\$\n([\s\S]*?)\n\$\$/;
            const inlineRule = /^\$([^\n]*?)\$/;
            
            let match = multilineRule.exec(src) || inlineRule.exec(src);
            if (match) {
                return {
                    type: 'math',
                    raw: match[0],
                    text: match[1],
                    displayMode: match[0].startsWith('$$\n')
                };
            }
        },
        renderer(token) {
            if (token.displayMode) {
                return `$$\n${token.text}\n$$\n`;
            }
            return `$${token.text}$`;
        }
    };

    marked.use({ extensions: [mathExtension] });

    const notesType = document.body.dataset.notesType;

    document.querySelectorAll('.file-toggle').forEach(toggle => {
        const filePath = toggle.getAttribute('data-file');
        const titleSpan = toggle.querySelector('.post-title');

        if (!filePath.endsWith("blank.md") && notesType === 'reading') {
            titleSpan.innerHTML += " 📝";
        }

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
});