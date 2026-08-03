(function () {
    'use strict';

    const SCROLL_DURATION_MS = 280;
    let scrollAnimationFrame = null;

    function smoothScrollTo(target) {
        const destination = typeof target === 'number'
            ? target
            : target.getBoundingClientRect().top + window.scrollY;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            window.scrollTo(0, destination);
            return;
        }

        if (scrollAnimationFrame) cancelAnimationFrame(scrollAnimationFrame);
        const start = window.scrollY;
        const distance = destination - start;
        const startTime = performance.now();

        function step(now) {
            const progress = Math.min((now - startTime) / SCROLL_DURATION_MS, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            window.scrollTo(0, start + distance * eased);
            if (progress < 1) scrollAnimationFrame = requestAnimationFrame(step);
            else scrollAnimationFrame = null;
        }

        scrollAnimationFrame = requestAnimationFrame(step);
    }

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
    function extractFootnoteDefinitions(md) {
        const definitions = new Map();
        const output = [];
        const lines = md.split('\n');
        let inFence = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (/^\s*(```|~~~)/.test(line)) {
                inFence = !inFence;
                output.push(line);
                continue;
            }

            const match = !inFence && line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
            if (!match) {
                output.push(line);
                continue;
            }

            const content = [match[2]];
            while (i + 1 < lines.length) {
                const continuation = lines[i + 1].match(/^(?: {2,}|\t)(.*)$/);
                if (!continuation) break;
                content.push(continuation[1]);
                i++;
            }
            definitions.set(match[1], content.join('\n').trim());
        }

        return { markdown: output.join('\n'), definitions };
    }

    function extractCustomBlocks(md) {
        const blocks = [];
        const output = [];
        const lines = md.split('\n');
        let inFence = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (/^\s*(```|~~~)/.test(line)) {
                inFence = !inFence;
                output.push(line);
                continue;
            }

            const opening = !inFence && line.match(/^\s*:::\s+(indent)\s*$/);
            if (!opening) {
                output.push(line);
                continue;
            }

            const content = [];
            let blockFence = false;
            let closed = false;

            while (i + 1 < lines.length) {
                const nextLine = lines[++i];
                if (/^\s*(```|~~~)/.test(nextLine)) blockFence = !blockFence;
                if (!blockFence && /^\s*:::\s*$/.test(nextLine)) {
                    closed = true;
                    break;
                }
                content.push(nextLine);
            }

            if (!closed) {
                output.push(line, ...content);
                continue;
            }

            const index = blocks.length;
            blocks.push({ type: opening[1], content: content.join('\n') });
            output.push(`%%CUSTOMBLOCK${index}%%`);
        }

        return { markdown: output.join('\n'), blocks };
    }

    function extractCaptions(md) {
        const captions = [];
        const output = [];
        const lines = md.split('\n');
        let inFence = false;

        for (const line of lines) {
            if (/^\s*(```|~~~)/.test(line)) {
                inFence = !inFence;
                output.push(line);
                continue;
            }

            const match = !inFence && line.match(/^\s*\{caption:\s*(.*)\}\s*$/);
            if (!match) {
                output.push(line);
                continue;
            }

            const index = captions.length;
            captions.push(match[1]);
            output.push('', `%%CAPTION${index}%%`, '');
        }

        return { markdown: output.join('\n'), captions };
    }

    function attachCaptions(html, captions) {
        if (!captions.length) return html;

        const template = document.createElement('template');
        template.innerHTML = html;

        captions.forEach((caption, index) => {
            const placeholder = `%%CAPTION${index}%%`;
            const captionParagraph = [...template.content.querySelectorAll('p')]
                .find(paragraph => paragraph.textContent.trim() === placeholder);
            const previous = captionParagraph?.previousElementSibling;

            let type = null;
            let content = null;
            if (previous?.tagName === 'PRE') {
                type = 'code';
                content = previous;
            } else if (previous?.tagName === 'IMG') {
                type = 'image';
                content = previous;
            } else if (
                previous?.tagName === 'P' &&
                previous.children.length === 1 &&
                previous.firstElementChild?.tagName === 'IMG' &&
                previous.textContent.trim() === ''
            ) {
                type = 'image';
                content = previous.firstElementChild;
            }

            if (!captionParagraph || !content) {
                if (captionParagraph) captionParagraph.textContent = `{caption: ${caption}}`;
                return;
            }

            const figure = document.createElement('figure');
            figure.className = `captioned-block captioned-${type}`;
            previous.replaceWith(figure);
            figure.appendChild(content);

            const figcaption = document.createElement('figcaption');
            figcaption.innerHTML = marked.parseInline(caption);
            figure.appendChild(figcaption);
            captionParagraph.remove();
        });

        return template.innerHTML;
    }

    function renderMarkdown(md) {
        const { markdown, definitions: footnoteDefinitions } = extractFootnoteDefinitions(md);
        md = markdown;

        const footnotesByLabel = new Map();
        const footnoteReferences = [];
        md = md.replace(/\[\^([^\]]+)\]/g, (match, label) => {
            if (!footnoteDefinitions.has(label)) return match;

            if (!footnotesByLabel.has(label)) {
                footnotesByLabel.set(label, {
                    number: footnotesByLabel.size + 1,
                    definition: footnoteDefinitions.get(label),
                    referenceIds: []
                });
            }

            const footnote = footnotesByLabel.get(label);
            const occurrence = footnote.referenceIds.length + 1;
            const referenceId = `fnref-${footnote.number}${occurrence > 1 ? `-${occurrence}` : ''}`;
            footnote.referenceIds.push(referenceId);
            footnoteReferences.push({ number: footnote.number, referenceId });
            return `%%FOOTREF${footnoteReferences.length - 1}%%`;
        });

        const annotations = [];
        let ai = 0;
        md = md.replace(/\[([^\]]+)\]\{"([\s\S]*?)"\}/g, (_, text, comment) => {
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

        const { markdown: markdownWithCaptions, captions } = extractCaptions(md);
        md = markdownWithCaptions;

        const { markdown: markdownWithBlocks, blocks: customBlocks } = extractCustomBlocks(md);
        md = markdownWithBlocks;

        marked.setOptions({ breaks: false, gfm: true });
        let html = marked.parse(md);

        for (let i = 0; i < customBlocks.length; i++) {
            const block = customBlocks[i];
            const rendered = marked.parse(block.content);
            const blockHTML = `<div class="${block.type}-block">${rendered}</div>`;
            html = html.replace(`<p>%%CUSTOMBLOCK${i}%%</p>`, blockHTML);
            html = html.replace(`%%CUSTOMBLOCK${i}%%`, blockHTML);
        }

        html = attachCaptions(html, captions);

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

        for (let i = 0; i < footnoteReferences.length; i++) {
            const { number, referenceId } = footnoteReferences[i];
            html = html.replace(
                `%%FOOTREF${i}%%`,
                `<sup class="footnote-ref" id="${referenceId}"><a href="#fn-${number}" aria-label="Footnote ${number}">${number}</a></sup>`
            );
        }

        if (footnotesByLabel.size) {
            const items = [...footnotesByLabel.values()].map(footnote => {
                const content = marked.parseInline(footnote.definition);
                const backReferences = footnote.referenceIds.map((referenceId, index) => {
                    const suffix = footnote.referenceIds.length > 1 ? ` ${index + 1}` : '';
                    return `<a class="footnote-backref" href="#${referenceId}" aria-label="Back to reference ${footnote.number}${suffix}">↩</a>`;
                }).join(' ');
                return `<li id="fn-${footnote.number}">${content} ${backReferences}</li>`;
            }).join('');

            html += `<section class="footnotes" aria-label="Footnotes"><hr><ol>${items}</ol></section>`;
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
    function renderAnnotationContent(container, comment) {
        const linkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
        let lastIndex = 0;
        let match;

        while ((match = linkPattern.exec(comment)) !== null) {
            container.appendChild(document.createTextNode(comment.slice(lastIndex, match.index)));

            try {
                const url = new URL(match[2], window.location.href);
                if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) throw new Error('Unsupported URL');

                const link = document.createElement('a');
                link.href = match[2];
                link.textContent = match[1];
                if (url.origin !== window.location.origin && ['http:', 'https:'].includes(url.protocol)) {
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                }
                container.appendChild(link);
            } catch {
                container.appendChild(document.createTextNode(match[0]));
            }

            lastIndex = linkPattern.lastIndex;
        }

        container.appendChild(document.createTextNode(comment.slice(lastIndex)));
    }

    function initAnnotations() {
        let hideTimer = null;

        function showTooltip(ann) {
            clearTimeout(hideTimer);
            const existing = document.querySelector('.annotation-tooltip');
            if (existing) existing.remove();
            document.querySelectorAll('.annotation.active').forEach(a => a.classList.remove('active'));

            const tip = document.createElement('div');
            tip.className = 'annotation-tooltip';
            renderAnnotationContent(tip, ann.dataset.comment);
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

        if (headings.length < 3) return null;

        return `<div class="toc-wrapper">
            <button class="toc-trigger" type="button" aria-label="Open table of contents" aria-expanded="false">${triggerLines.join('')}</button>
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
        const trigger = tocWrapper.querySelector('.toc-trigger');
        const contentEl = wrapper.querySelector('.post-content');
        const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        let hideTimer = null;

        function show() {
            clearTimeout(hideTimer);
            tocWrapper.classList.add('active');
            trigger.setAttribute('aria-expanded', 'true');
            trigger.setAttribute('aria-label', 'Close table of contents');
        }

        function hide() {
            clearTimeout(hideTimer);
            tocWrapper.classList.remove('active');
            trigger.setAttribute('aria-expanded', 'false');
            trigger.setAttribute('aria-label', 'Open table of contents');
        }

        function scheduleHide() {
            hideTimer = setTimeout(hide, 200);
        }

        function toggle() {
            if (tocWrapper.classList.contains('active')) hide();
            else show();
        }

        function handleTriggerClick(event) {
            if (supportsHover && event.detail > 0) show();
            else toggle();
        }

        function handleDocumentClick(event) {
            if (!tocWrapper.contains(event.target)) hide();
        }

        function handleKeydown(event) {
            if (event.key === 'Escape' && tocWrapper.classList.contains('active')) {
                hide();
                trigger.focus();
            }
        }

        if (supportsHover) {
            tocWrapper.addEventListener('mouseenter', show);
            tocWrapper.addEventListener('mouseleave', scheduleHide);
        }
        trigger.addEventListener('click', handleTriggerClick);
        document.addEventListener('click', handleDocumentClick);
        document.addEventListener('keydown', handleKeydown);

        panel.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const id = link.getAttribute('href').slice(1);
                const target = document.getElementById(id);
                if (target) {
                    smoothScrollTo(target);
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
            if (supportsHover) {
                tocWrapper.removeEventListener('mouseenter', show);
                tocWrapper.removeEventListener('mouseleave', scheduleHide);
            }
            trigger.removeEventListener('click', handleTriggerClick);
            document.removeEventListener('click', handleDocumentClick);
            document.removeEventListener('keydown', handleKeydown);
        };
    }

    /* ------------------------------------------------
       Image lightbox
       ------------------------------------------------ */
    function initImageLightbox() {
        const imageSelector = '.post-content img';
        let lightbox = null;
        let previouslyFocused = null;

        function prepareImages(root) {
            const images = [];
            if (root.matches && root.matches(imageSelector)) images.push(root);
            if (root.querySelectorAll) images.push(...root.querySelectorAll(imageSelector));

            images.forEach(image => {
                if (!image.hasAttribute('tabindex')) image.tabIndex = 0;
                if (!image.hasAttribute('role')) image.setAttribute('role', 'button');
                if (!image.hasAttribute('aria-label')) {
                    const description = image.alt ? `: ${image.alt}` : '';
                    image.setAttribute('aria-label', `Expand image${description}`);
                }
            });
        }

        function closeLightbox() {
            if (!lightbox) return;
            lightbox.remove();
            lightbox = null;
            document.body.classList.remove('image-lightbox-open');
            if (previouslyFocused) previouslyFocused.focus();
            previouslyFocused = null;
        }

        function openLightbox(source) {
            closeLightbox();
            previouslyFocused = source;

            lightbox = document.createElement('div');
            lightbox.className = 'image-lightbox';
            lightbox.setAttribute('role', 'dialog');
            lightbox.setAttribute('aria-modal', 'true');
            lightbox.setAttribute('aria-label', source.alt || 'Expanded image');

            const image = document.createElement('img');
            image.src = source.currentSrc || source.src;
            image.alt = source.alt;

            const closeButton = document.createElement('button');
            closeButton.className = 'image-lightbox-close';
            closeButton.type = 'button';
            closeButton.setAttribute('aria-label', 'Close expanded image');
            closeButton.textContent = '×';

            lightbox.append(image, closeButton);
            document.body.appendChild(lightbox);
            document.body.classList.add('image-lightbox-open');
            requestAnimationFrame(() => lightbox && lightbox.classList.add('active'));
            closeButton.focus();

            lightbox.addEventListener('click', event => {
                if (event.target === lightbox || event.target === image ||
                    event.target.closest('.image-lightbox-close')) {
                    closeLightbox();
                }
            });
        }

        function handleClick(event) {
            const image = event.target.closest(imageSelector);
            if (!image) return;
            event.preventDefault();
            openLightbox(image);
        }

        function handleKeydown(event) {
            if (event.key === 'Escape' && lightbox) {
                closeLightbox();
                return;
            }

            const image = event.target.closest && event.target.closest(imageSelector);
            if (image && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                openLightbox(image);
            }
        }

        prepareImages(document);
        const observer = new MutationObserver(records => {
            records.forEach(record => {
                record.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) prepareImages(node);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

        document.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleKeydown);
    }

    /* ------------------------------------------------
       In-post navigation (preserves hash-based routes)
       ------------------------------------------------ */
    function initInternalLinks(container) {
        let highlightTimer = null;

        function handleClick(event) {
            const link = event.target.closest('a[href^="#"]');
            if (!link || !container.contains(link) || link.closest('.toc-wrapper')) return;

            const href = link.getAttribute('href');
            const targetId = decodeURIComponent(href.slice(1));
            const target = document.getElementById(targetId);
            if (!target || !container.contains(target)) return;

            event.preventDefault();
            clearTimeout(highlightTimer);
            container.querySelectorAll('.footnote-highlight')
                .forEach(element => element.classList.remove('footnote-highlight'));
            const isFootnote = target.matches('.footnote-ref, .footnotes li');
            if (isFootnote) target.classList.add('footnote-highlight');
            smoothScrollTo(target);
            if (isFootnote) {
                highlightTimer = setTimeout(() => target.classList.remove('footnote-highlight'), 1200);
            }
        }

        container.addEventListener('click', handleClick);

        return () => {
            clearTimeout(highlightTimer);
            container.removeEventListener('click', handleClick);
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
        initImageLightbox,
        initInternalLinks,
        smoothScrollTo,

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
    initImageLightbox();
})();
