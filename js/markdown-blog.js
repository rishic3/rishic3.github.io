(function () {
    'use strict';

    /* ------------------------------------------------
       YAML Front-matter Parser
       ------------------------------------------------ */
    function parseFrontmatter(raw) {
        const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        if (!m) return { meta: {}, body: raw };

        const meta = {};
        for (const line of m[1].split('\n')) {
            const t = line.trim();
            if (!t || t.startsWith('#')) continue;
            const idx = t.indexOf(':');
            if (idx === -1) continue;
            const key = t.slice(0, idx).trim();
            let val = t.slice(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'")))
                val = val.slice(1, -1);
            if (val.startsWith('[') && val.endsWith(']'))
                val = val.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
            meta[key] = val;
        }
        return { meta, body: m[2] };
    }

    /* ------------------------------------------------
       Image path fixer
       ------------------------------------------------ */
    function fixRelativeImages(md, basePath) {
        md = md.replace(
            /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
            `![$1](${basePath}$2)`
        );
        md = md.replace(
            /<img([^>]*)\ssrc=["'](?!https?:\/\/)([^"']+)["']([^>]*)>/g,
            `<img$1 src="${basePath}$2"$3>`
        );
        return md;
    }

    /* ------------------------------------------------
       Markdown → HTML  (with math + annotation protection)
       ------------------------------------------------ */
    function renderMarkdown(md) {
        const annotations = [];
        let ai = 0;
        md = md.replace(/\[([^\]]+)\]\{"([^"]*?)"\}/g, (_, text, comment) => {
            const ph = `%%ANNOT${ai}%%`;
            annotations[ai++] = { text, comment };
            return ph;
        });

        const mathBlocks = [];
        let mi = 0;

        // Display math $$...$$
        md = md.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
            const ph = `%%MATH${mi}%%`;
            mathBlocks[mi++] = { display: true, tex: inner };
            return ph;
        });

        // Inline math $...$
        md = md.replace(/\$([^\$\n]+?)\$/g, (match, inner) => {
            if (/^[\d\s$]/.test(inner) && !/[a-zA-Z\\{]/.test(inner)) return match;
            const ph = `%%MATH${mi}%%`;
            mathBlocks[mi++] = { display: false, tex: inner };
            return ph;
        });

        marked.setOptions({ breaks: false, gfm: true });
        let html = marked.parse(md);

        // Restore math → render with KaTeX
        for (let i = 0; i < mathBlocks.length; i++) {
            const { display, tex } = mathBlocks[i];
            let rendered;
            try {
                rendered = katex.renderToString(tex.trim(), {
                    displayMode: display,
                    throwOnError: false,
                    trust: true,
                    strict: false,
                    macros: {
                        "\\implies": "\\Rightarrow",
                        "\\iff": "\\Leftrightarrow"
                    }
                });
            } catch (e) {
                rendered = `<span class="katex-error" title="${e.message}">${display ? '$$' : '$'}${tex}${display ? '$$' : '$'}</span>`;
            }
            if (display) {
                rendered = `<div class="katex-display">${rendered}</div>`;
                // Display math on its own line gets wrapped in <p> by marked; unwrap it
                html = html.replace(`<p>%%MATH${i}%%</p>`, rendered);
            }
            html = html.replace(`%%MATH${i}%%`, rendered);
        }

        // Restore annotations
        for (let i = 0; i < annotations.length; i++) {
            const { text, comment } = annotations[i];
            const esc = comment.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html = html.replace(
                `%%ANNOT${i}%%`,
                `<span class="annotation" data-comment="${esc}">${text}</span>`
            );
        }

        return html;
    }

    /* ------------------------------------------------
       Code-block post-processing (language labels, copy)
       ------------------------------------------------ */
    function enhanceCodeBlocks(container) {
        container.querySelectorAll('pre > code').forEach(codeEl => {
            const pre = codeEl.parentElement;
            if (pre.querySelector('.code-block-header')) return;

            const langClass = [...codeEl.classList].find(c => c.startsWith('language-'));
            const lang = langClass ? langClass.replace('language-', '') : '';

            if (lang) {
                const header = document.createElement('div');
                header.className = 'code-block-header';

                const langLabel = document.createElement('span');
                langLabel.textContent = lang;

                const copyBtn = document.createElement('button');
                copyBtn.className = 'code-copy-btn';
                copyBtn.textContent = 'Copy';
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(codeEl.textContent).then(() => {
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
                    });
                });

                header.appendChild(langLabel);
                header.appendChild(copyBtn);
                pre.insertBefore(header, codeEl);
            }

            if (typeof hljs !== 'undefined') hljs.highlightElement(codeEl);
        });
    }

    /* ------------------------------------------------
       Annotation tooltip system
       ------------------------------------------------ */
    function initAnnotations() {
        let hideTimer = null;

        function showTooltip(ann) {
            clearTimeout(hideTimer);
            const existing = document.querySelector('.annotation-tooltip');
            if (existing) existing.remove();
            document.querySelectorAll('.annotation.active').forEach(a => a.classList.remove('active'));

            const tip = document.createElement('div');
            tip.className = 'annotation-tooltip';
            tip.textContent = ann.dataset.comment;
            document.body.appendChild(tip);
            ann.classList.add('active');

            const rect = ann.getBoundingClientRect();
            const tw = tip.offsetWidth;
            const th = tip.offsetHeight;
            let top = rect.bottom + window.scrollY + 8;
            let left = rect.left + window.scrollX + (rect.width / 2) - (tw / 2);
            if (left < 10) left = 10;
            if (left + tw > window.innerWidth - 10) left = window.innerWidth - tw - 10;
            if (rect.bottom + th + 16 > window.innerHeight) top = rect.top + window.scrollY - th - 8;
            tip.style.top = `${top}px`;
            tip.style.left = `${left}px`;

            tip.addEventListener('mouseenter', () => clearTimeout(hideTimer));
            tip.addEventListener('mouseleave', () => scheduleHide(ann));
        }

        function scheduleHide(ann) {
            hideTimer = setTimeout(() => {
                const tip = document.querySelector('.annotation-tooltip');
                if (tip) tip.remove();
                if (ann) ann.classList.remove('active');
            }, 150);
        }

        document.addEventListener('mouseover', (e) => {
            const ann = e.target.closest('.annotation');
            if (ann) showTooltip(ann);
        });

        document.addEventListener('mouseout', (e) => {
            const ann = e.target.closest('.annotation');
            if (ann) scheduleHide(ann);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearTimeout(hideTimer);
                const tip = document.querySelector('.annotation-tooltip');
                if (tip) tip.remove();
                document.querySelectorAll('.annotation.active').forEach(a => a.classList.remove('active'));
            }
        });
    }

    /* ------------------------------------------------
       Tag color mapping (Notion-style, collision-avoidant)
       ------------------------------------------------ */
    const TAG_COLORS = ['blue', 'green', 'purple', 'orange', 'red', 'yellow', 'pink'];
    const _tagColorCache = new Map();

    function tagColor(tag) {
        if (_tagColorCache.has(tag)) return _tagColorCache.get(tag);

        let hash = 5381;
        for (let i = 0; i < tag.length; i++) {
            hash = ((hash << 5) + hash + tag.charCodeAt(i)) | 0;
        }

        const usedColors = new Set(_tagColorCache.values());
        let idx = Math.abs(hash) % TAG_COLORS.length;
        let color = TAG_COLORS[idx];

        if (usedColors.has(color) && usedColors.size < TAG_COLORS.length) {
            for (let j = 1; j < TAG_COLORS.length; j++) {
                const candidate = TAG_COLORS[(idx + j) % TAG_COLORS.length];
                if (!usedColors.has(candidate)) { color = candidate; break; }
            }
        }

        _tagColorCache.set(tag, color);
        return color;
    }

    /* ------------------------------------------------
       Table of Contents (hover-to-reveal)
       ------------------------------------------------ */
    function slugify(text) {
        return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
    }

    function generateTOC(contentEl) {
        const headings = contentEl.querySelectorAll('h1, h2, h3, h4');
        if (headings.length < 3) return null;

        const usedIds = new Set();
        const items = [];
        const triggerLines = [];

        headings.forEach((h, i) => {
            let id = slugify(h.textContent);
            if (!id) id = 'heading';
            if (usedIds.has(id)) {
                let c = 2;
                while (usedIds.has(`${id}-${c}`)) c++;
                id = `${id}-${c}`;
            }
            usedIds.add(id);
            h.id = id;

            const level = h.tagName.toLowerCase();
            items.push(`<li class="toc-${level}"><a href="#${id}">${h.textContent}</a></li>`);
            triggerLines.push(`<span class="toc-line toc-line-${level}" data-idx="${i}"></span>`);
        });

        return `<div class="toc-wrapper">
            <div class="toc-trigger">${triggerLines.join('')}</div>
            <nav class="toc-panel">
                <div class="toc-title">Contents</div>
                <ul>${items.join('')}</ul>
            </nav>
        </div>`;
    }

    function initTOC(wrapper) {
        const tocWrapper = wrapper.querySelector('.toc-wrapper');
        if (!tocWrapper) return () => {};

        const panel = tocWrapper.querySelector('.toc-panel');
        const contentEl = wrapper.querySelector('.post-content');
        let hideTimer = null;

        function show() {
            clearTimeout(hideTimer);
            tocWrapper.classList.add('active');
        }

        function scheduleHide() {
            hideTimer = setTimeout(() => tocWrapper.classList.remove('active'), 200);
        }

        tocWrapper.addEventListener('mouseenter', show);
        tocWrapper.addEventListener('mouseleave', scheduleHide);

        panel.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const id = link.getAttribute('href').slice(1);
                const target = document.getElementById(id);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setTimeout(() => tocWrapper.classList.remove('active'), 300);
                }
            });
        });

        const headings = contentEl.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');
        const tocLinks = panel.querySelectorAll('a');
        const triggerLines = tocWrapper.querySelectorAll('.toc-line');
        const linkByHref = new Map();
        tocLinks.forEach((a, i) => linkByHref.set(a.getAttribute('href').slice(1), { link: a, idx: i }));

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    tocLinks.forEach(a => a.classList.remove('active'));
                    triggerLines.forEach(l => l.classList.remove('active'));
                    const match = linkByHref.get(entry.target.id);
                    if (match) {
                        match.link.classList.add('active');
                        if (triggerLines[match.idx]) triggerLines[match.idx].classList.add('active');
                    }
                }
            });
        }, { rootMargin: '0px 0px -70% 0px', threshold: 0 });

        headings.forEach(h => observer.observe(h));

        return () => {
            observer.disconnect();
            tocWrapper.removeEventListener('mouseenter', show);
            tocWrapper.removeEventListener('mouseleave', scheduleHide);
        };
    }

    /* ------------------------------------------------
       Public API
       ------------------------------------------------ */
    window.Blog = {
        parseFrontmatter,
        fixRelativeImages,
        renderMarkdown,
        enhanceCodeBlocks,
        initAnnotations,
        tagColor,
        generateTOC,
        initTOC,

        async fetchPost(path) {
            const resp = await fetch(path);
            if (!resp.ok) throw new Error(`Failed to load ${path}: ${resp.status}`);
            const raw = await resp.text();
            const { meta, body } = parseFrontmatter(raw);
            const basePath = path.substring(0, path.lastIndexOf('/') + 1);
            const content = fixRelativeImages(body, basePath);
            return { path, meta, content, basePath };
        },

        async fetchAllPosts(paths) {
            const posts = await Promise.all(
                paths.map(p => this.fetchPost(p).catch(err => {
                    console.error(`Failed to load ${p}:`, err);
                    return null;
                }))
            );
            return posts
                .filter(Boolean)
                .sort((a, b) => new Date(b.meta.date || 0) - new Date(a.meta.date || 0));
        },

        formatDate(dateStr) {
            if (!dateStr) return '';
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        }
    };

    initAnnotations();
})();
