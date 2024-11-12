document.addEventListener('DOMContentLoaded', () => {
    const fileSelector = document.getElementById('file-selector');
    const contentDiv = document.getElementById('markdown-content');
  
    const loadMarkdown = async (fileName) => {
      try {
        const response = await fetch(`markdown/${fileName}`);
        const markdown = await response.text();
        contentDiv.innerHTML = marked.parse(markdown);
      } catch (error) {
        contentDiv.innerHTML = `<p>Error loading markdown: ${error.message}</p>`;
      }
    };
  
    fileSelector.addEventListener('change', (event) => {
      loadMarkdown(event.target.value);
    });
  
    // Load the default file initially
    loadMarkdown(fileSelector.value);
  });
  