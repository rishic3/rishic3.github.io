/**
 * Dark Mode Toggle Functionality
 * Handles the toggle between light and dark themes with localStorage persistence
 */

(function() {
    'use strict';
    
    // Get stored theme preference or default to light mode
    const storedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply theme immediately to prevent flash
    document.documentElement.setAttribute('data-theme', storedTheme);
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeDarkModeToggle();
    });
    
    function initializeDarkModeToggle() {
        // Create the toggle button
        const toggleButton = createToggleButton();
        document.body.appendChild(toggleButton);
        
        // Update button state based on current theme
        updateToggleState(toggleButton, storedTheme);
        
        // Add click event listener
        toggleButton.addEventListener('click', function() {
            toggleTheme(toggleButton);
        });
    }
    
    function createToggleButton() {
        const button = document.createElement('button');
        button.className = 'dark-mode-toggle';
        button.setAttribute('aria-label', 'Toggle dark mode');
        button.setAttribute('title', 'Toggle dark mode');
        return button;
    }
    
    function updateToggleState(button, theme) {
        if (theme === 'dark') {
            button.classList.add('dark');
            button.setAttribute('aria-label', 'Switch to light mode');
            button.setAttribute('title', 'Switch to light mode');
        } else {
            button.classList.remove('dark');
            button.setAttribute('aria-label', 'Switch to dark mode');
            button.setAttribute('title', 'Switch to dark mode');
        }
    }
    
    function toggleTheme(button) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Apply new theme
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Save to localStorage
        localStorage.setItem('theme', newTheme);
        
        // Update button state
        updateToggleState(button, newTheme);
        
        // Add a small animation effect
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }
})(); 