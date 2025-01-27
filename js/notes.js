document.addEventListener('DOMContentLoaded', () => {
    const notesType = document.body.dataset.notesType;

    document.querySelectorAll('.file-toggle').forEach(toggle => {
        const filePath = toggle.getAttribute('data-file');
        const titleSpan = toggle.querySelector('.post-title');

        // only add italics/emoji for reading notes
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
                    
                    // Debug: Log raw markdown content
                    console.log('Raw markdown:', markdown);
                    // Debug: Look for LaTeX content
                    const latexMatches = markdown.match(/\$\$(.*?)\$\$/g);
                    console.log('Found LaTeX blocks:', latexMatches);

                    // find absoluate path of image
                    const baseDir = filePath.substring(0, filePath.lastIndexOf('/'));
                    let modifiedMarkdown = markdown.replace(
                        /!\[([^\]]*)\]\((images\/[^)]+)\)/g,
                        (match, altText, imagePath) => {
                            const newPath = `${baseDir}/${imagePath}`;
                            return `![${altText}](${newPath})`;
                        }
                    );
                    
                    modifiedMarkdown = modifiedMarkdown.replace(
                        /<img[^>]*src="images\/([^"]+)"([^>]*)>/g,
                        (match, imagePath, rest) => {
                            const newPath = `${baseDir}/images/${imagePath}`;
                            return `<img src="${newPath}"${rest}>`;
                        }
                    );

                    // Debug: Log the parsed HTML before insertion
                    const parsedHTML = marked.parse(modifiedMarkdown);
                    console.log('Parsed HTML:', parsedHTML);
                    
                    fileContentDiv.innerHTML = marked.parse(modifiedMarkdown);
                    
                    // Debug: Check if MathJax is available
                    console.log('MathJax available:', !!window.MathJax);

                    // render latex
                    if (window.MathJax) {
                        window.MathJax.typesetPromise([fileContentDiv]).catch((err) => {
                            console.log('MathJax failed to typeset:', err);
                        });
                    }
                } catch (error) {
                    fileContentDiv.innerHTML = `<p>Error loading content: ${error.message}</p>`;
                }
            }
        });
    });
});