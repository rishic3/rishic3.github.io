// This script adds navigation headers to technical note pages
(function() {
    // Run this as soon as possible - immediately executing function
    function addNavigation() {
        console.log('Checking if navigation needed for path: ' + window.location.pathname);

        // Simple check: is this a technical note page?
        const path = window.location.pathname;
        const isTechnicalPage = path.includes('/technical/') && path.endsWith('.html');

        // Don't add navigation if already present or not a technical page
        if (!isTechnicalPage || document.querySelector('.nav-bar')) {
            console.log('Skipping navigation - not needed or already present');
            return;
        }

        console.log('Adding navigation to technical note page');

        // Create navigation elements
        const container = document.createElement('div');
        container.className = 'container';
        container.style.margin = '0 auto';
        container.style.maxWidth = '800px';
        container.style.padding = '20px 0'; // Match the container padding from style.css
        container.style.width = '100%';
        container.style.flex = '1';
        container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

        const navBar = document.createElement('nav');
        navBar.className = 'nav-bar';
        navBar.style.marginBottom = '2rem';
        navBar.style.paddingBottom = '1rem';
        navBar.style.borderBottom = '1px solid #eee';
        navBar.style.paddingTop = '0'; // Remove top padding since we just want a simple back button

        const backButton = document.createElement('a');
        backButton.href = '../../../math-notes.html';
        backButton.className = 'back-button';
        backButton.textContent = '← Back to Math/CS';
        backButton.style.display = 'inline-flex';
        backButton.style.alignItems = 'center';
        backButton.style.padding = '0.5rem 0';
        backButton.style.color = '#333';
        backButton.style.textDecoration = 'none';
        backButton.style.transition = 'color 0.2s';

        backButton.addEventListener('mouseover', function() {
            this.style.color = '#000';
        });
        backButton.addEventListener('mouseout', function() {
            this.style.color = '#333';
        });

        // Assemble the elements - no more header or title
        navBar.appendChild(backButton);
        container.appendChild(navBar);

        // Add to the beginning of the body - highest priority
        if (document.body) {
            document.body.insertBefore(container, document.body.firstChild);
        } else {
            // If body isn't available yet, try again when it is
            requestAnimationFrame(() => {
                if (document.body) {
                    document.body.insertBefore(container, document.body.firstChild);
                }
            });
        }

        // Remove page header icon if present - high priority
        const headerIcon = document.querySelector('.page-header-icon');
        if (headerIcon) {
            console.log('Removing page header icon');
            headerIcon.remove();
        }

        // Defer code highlighting to ensure header appears first
        setTimeout(() => {
            // Add custom CSS to control code font size and appearance - do this early
            addCustomCodeStyles();
            
            // Fix capitalization immediately
            fixCodeCapitalization();
            
            // Then load Prism for syntax highlighting with a slight delay
            setTimeout(loadPrismHighlighter, 50);
        }, 0);
    }

    // Add custom CSS styles for code
    function addCustomCodeStyles() {
        // Check if styles already exist
        if (document.querySelector('#custom-code-styles')) {
            return;
        }
        
        const customStyles = document.createElement('style');
        customStyles.id = 'custom-code-styles';
        customStyles.textContent = `
            pre, code {
                font-size: 14px !important;
                line-height: 1.5 !important;
                font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace !important;
            }
            pre.code {
                padding: 1rem !important;
                background: #f6f8fa !important;
                border-radius: 5px !important;
                overflow: auto !important;
                margin-bottom: 1.5rem !important;
            }
            .token.comment,
            .token.prolog,
            .token.doctype,
            .token.cdata {
                color: #6a737d !important;
            }
            .token.punctuation {
                color: #24292e !important;
            }
            .token.property,
            .token.tag,
            .token.boolean,
            .token.number,
            .token.constant,
            .token.symbol {
                color: #005cc5 !important;
            }
            .token.selector,
            .token.attr-name,
            .token.string,
            .token.char,
            .token.builtin {
                color: #032f62 !important;
            }
            .token.operator,
            .token.entity,
            .token.url,
            .token.variable {
                color: #d73a49 !important;
            }
            .token.atrule,
            .token.attr-value,
            .token.keyword {
                color: #d73a49 !important;
            }
            .token.function,
            .token.class-name {
                color: #6f42c1 !important;
            }
            .token.regex,
            .token.important {
                color: #e36209 !important;
            }
        `;
        document.head.appendChild(customStyles);
    }

    // Fix code capitalization
    function fixCodeCapitalization() {
        document.querySelectorAll('code[class*="language-"]').forEach(block => {
            const currentClass = block.className;
            const newClass = currentClass.replace(/language-([A-Z])/g, function(match, p1) {
                return 'language-' + p1.toLowerCase();
            });
            block.className = newClass;
        });
    }

    // Load Prism highlighter
    function loadPrismHighlighter() {
        console.log('Setting up code highlighting');
        
        // Remove any existing Prism scripts to avoid conflicts
        document.querySelectorAll('script[src*="prism"]').forEach(script => {
            script.remove();
        });
        
        // Load Prism as a single bundle with common languages
        const prismScript = document.createElement('script');
        prismScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
        prismScript.defer = true;
        prismScript.onload = function() {
            // Load Python language addon specifically
            const pythonScript = document.createElement('script');
            pythonScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js';
            pythonScript.defer = true;
            pythonScript.onload = function() {
                console.log('Prism fully loaded, highlighting code blocks');
                
                // Force re-highlighting of all code blocks
                if (window.Prism) {
                    document.querySelectorAll('pre code').forEach(block => {
                        if (!block.closest('pre').classList.contains('highlighted')) {
                            window.Prism.highlightElement(block);
                            block.closest('pre').classList.add('highlighted');
                        }
                    });
                }
            };
            document.body.appendChild(pythonScript);
        };
        document.body.appendChild(prismScript);
        
        // Load Prism CSS
        const prismCSS = document.createElement('link');
        prismCSS.rel = 'stylesheet';
        prismCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css';
        document.head.appendChild(prismCSS);
    }

    // Execute navigation setup immediately if possible
    addNavigation();
    
    // Also ensure it runs when the DOM is ready as a fallback
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addNavigation);
    }
})(); 