document.addEventListener('DOMContentLoaded', () => {
    const notesType = document.body.dataset.notesType;

    document.querySelectorAll('.file-toggle').forEach(toggle => {
        const filePath = toggle.getAttribute('data-file');
        const titleSpan = toggle.querySelector('.post-title');

        // only add italics/emoji for reading notes
        if (!filePath.endsWith("blank.md") && notesType === 'reading') {
            titleSpan.innerHTML += " 📝";
        }

        if (notesType === 'reading') {
            titleSpan.innerHTML = `<i>${titleSpan.textContent}</i>`;
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
                    
                    // find absoluate path of image
                    const baseDir = filePath.substring(0, filePath.lastIndexOf('/'));
                    const modifiedMarkdown = markdown.replace(
                        /!\[([^\]]*)\]\(images\//g,
                        `![$1](${baseDir}/images/`
                    );
                    
                    fileContentDiv.innerHTML = marked.parse(modifiedMarkdown);
                    
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