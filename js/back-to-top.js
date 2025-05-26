// Back to Top Button Functionality

(function() {
    // Create the back to top button
    function createBackToTopButton() {
        const button = document.createElement('button');
        button.className = 'back-to-top';
        button.innerHTML = '↑';
        button.setAttribute('aria-label', 'Back to top');
        button.setAttribute('title', 'Back to top');
        
        // Add click event listener
        button.addEventListener('click', scrollToTop);
        
        // Add to body
        document.body.appendChild(button);
        
        return button;
    }
    
    // Smooth scroll to top function
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    // Show/hide button based on scroll position
    function toggleButtonVisibility(button) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const threshold = 300; // Show button after scrolling 300px
        
        if (scrollTop > threshold) {
            button.classList.add('visible');
        } else {
            button.classList.remove('visible');
        }
    }
    
    // Initialize the back to top functionality
    function init() {
        // Only add the button if it doesn't already exist
        if (document.querySelector('.back-to-top')) {
            return;
        }
        
        const button = createBackToTopButton();
        
        // Add scroll event listener with throttling for better performance
        let ticking = false;
        
        function handleScroll() {
            if (!ticking) {
                requestAnimationFrame(function() {
                    toggleButtonVisibility(button);
                    ticking = false;
                });
                ticking = true;
            }
        }
        
        window.addEventListener('scroll', handleScroll);
        
        // Initial check
        toggleButtonVisibility(button);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 