document.addEventListener('DOMContentLoaded', () => {
    const postList = document.getElementById('post-list');
    const postContent = document.getElementById('post-content');
  
    const loadPost = async (postFile) => {
      try {
        const response = await fetch(`posts/${postFile}`);
        if (!response.ok) {
          throw new Error(`Could not load ${postFile}`);
        }
        const markdown = await response.text();
        postContent.innerHTML = marked.parse(markdown);
      } catch (error) {
        postContent.innerHTML = `<p>Error loading post: ${error.message}</p>`;
      }
    };
  
    postList.addEventListener('click', (event) => {
      if (event.target.tagName === 'A') {
        event.preventDefault();
        const postFile = event.target.getAttribute('data-post');
        loadPost(postFile);
      }
    });
  
    // Optionally load the first post by default
    loadPost('post1.md');
  });
  