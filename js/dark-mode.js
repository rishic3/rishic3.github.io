(function () {
    'use strict';

    const stored = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', stored);

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.querySelector('.dark-mode-toggle');
        if (!btn) return;
        sync(btn, stored);
        btn.addEventListener('click', () => toggle(btn));
    });

    function sync(btn, theme) {
        btn.classList.toggle('dark', theme === 'dark');
        btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }

    function toggle(btn) {
        const curr = document.documentElement.getAttribute('data-theme');
        const next = curr === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        sync(btn, next);
    }
})();
