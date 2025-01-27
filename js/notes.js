document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.file-toggle').forEach(toggle => {
        const filePath = toggle.getAttribute('data-file');
        const titleSpan = toggle.querySelector('.post-title');

        if (!filePath.endsWith("blank.md")) {
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
                    fileContentDiv.innerHTML = marked.parse(markdown);
                } catch (error) {
                    fileContentDiv.innerHTML = `<p>Error loading content: ${error.message}</p>`;
                }
            }
        });
    });
});