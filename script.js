document.addEventListener('DOMContentLoaded', function() {
    const projects = [
      { name: 'Project 1', description: 'Description of Project 1' },
      { name: 'Project 2', description: 'Description of Project 2' }
      // Add more projects as needed
    ];
  
    const projectsSection = document.getElementById('projects');
    projects.forEach(project => {
      const projectElement = document.createElement('div');
      projectElement.innerHTML = `
        <h3>${project.name}</h3>
        <p>${project.description}</p>
      `;
      projectsSection.appendChild(projectElement);
    });
  });