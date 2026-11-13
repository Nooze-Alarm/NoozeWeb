// ===== Nooze website: global script =====
// Nav, mobile menu, scroll reveals, back-to-top, FAQ accordion.

(function () {
    var root = document.documentElement;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function ready(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    ready(function () {
        // --- Scroll reveal (.nz-reveal, plus legacy .reveal*) ---
        // [data-stagger] staggers its .nz-reveal children by index.
        document.querySelectorAll('[data-stagger]').forEach(function (group) {
            group.querySelectorAll('.nz-reveal').forEach(function (el, i) {
                if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', String(i));
            });
        });
        var revealEls = document.querySelectorAll('.nz-reveal, .reveal, .reveal-left, .reveal-right, .reveal-scale');
        if (reduce || !('IntersectionObserver' in window)) {
            revealEls.forEach(function (el) { el.classList.add('is-in', 'visible'); });
        } else {
            // A bottom inset, not a visible fraction: very tall elements still trigger.
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (!e.isIntersecting) return;
                    e.target.classList.add('is-in', 'visible');
                    io.unobserve(e.target);
                });
            }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
            revealEls.forEach(function (el) { io.observe(el); });
        }

        // --- Nav: denser glass once the page scrolls ---
        var nav = document.querySelector('[data-nav]');
        var topBtn = document.getElementById('backToTop');
        // Phone download dock: shows once the hero button has scrolled away,
        // hides while the closing CTA or the footer is on screen.
        var dock = document.querySelector('[data-dock]');
        var heroBtn = document.querySelector('.hx .nz-btn');
        var heroVis = !!heroBtn;
        var blockers = document.querySelectorAll('.nz-cta, .nz-footer');
        var blocked = new Map();
        if (dock && 'IntersectionObserver' in window) {
            var dockIo = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.target === heroBtn) heroVis = e.isIntersecting;
                    else blocked.set(e.target, e.isIntersecting);
                });
                onScroll();
            });
            if (heroBtn) dockIo.observe(heroBtn);
            blockers.forEach(function (el) { dockIo.observe(el); });
        }
        var ticking = false;
        function onScroll() {
            ticking = false;
            var y = window.scrollY || window.pageYOffset;
            if (nav) nav.classList.toggle('is-scrolled', y > 24);
            if (topBtn) topBtn.classList.toggle('is-on', y > 900);
            if (dock) {
                var past = heroBtn ? !heroVis && y > 200 : y > 480;
                var hidden = false;
                blocked.forEach(function (v) { if (v) hidden = true; });
                dock.classList.toggle('is-on', past && !hidden);
            }
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
        }, { passive: true });
        onScroll();
        if (topBtn) topBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        });

        // --- Mobile menu ---
        var burger = document.querySelector('[data-burger]');
        var menu = document.querySelector('[data-menu]');
        if (burger && menu) {
            var focusables = menu.querySelectorAll('a');
            // While the menu is open, everything behind it is out of reach (focus stays in the menu).
            var behind = document.querySelectorAll('#main, .nz-footer, #backToTop, [data-dock], .nz-skip');
            var setMenu = function (open) {
                root.classList.toggle('nz-menu-open', open);
                behind.forEach(function (el) { el.inert = open; });
                burger.setAttribute('aria-expanded', open ? 'true' : 'false');
                burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
                focusables.forEach(function (a) { a.tabIndex = open ? 0 : -1; });
                if (open && focusables[0]) setTimeout(function () { focusables[0].focus({ preventScroll: true }); }, 60);
            };
            burger.addEventListener('click', function () {
                setMenu(!root.classList.contains('nz-menu-open'));
            });
            menu.addEventListener('click', function (e) {
                if (e.target.closest('a')) setMenu(false);
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && root.classList.contains('nz-menu-open')) {
                    setMenu(false);
                    burger.focus();
                }
            });
            window.matchMedia('(min-width: 861px)').addEventListener('change', function (e) {
                if (e.matches) setMenu(false);
            });
        }

        // --- FAQ accordion (legacy .faq-item markup) ---
        function fitFaqAnswer(item) {
            var answer = item && item.querySelector('.faq-answer');
            if (answer) answer.style.maxHeight = (answer.scrollHeight + 24) + 'px';
        }
        document.querySelectorAll('.faq-question').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var item = btn.closest('.faq-item');
                var wasOpen = item.classList.contains('open');
                document.querySelectorAll('.faq-item').forEach(function (i) {
                    i.classList.remove('open');
                    var q = i.querySelector('.faq-question');
                    if (q) q.setAttribute('aria-expanded', 'false');
                    var a = i.querySelector('.faq-answer');
                    if (a) a.style.maxHeight = '';
                });
                if (!wasOpen) {
                    item.classList.add('open');
                    btn.setAttribute('aria-expanded', 'true');
                    fitFaqAnswer(item);
                }
            });
        });
        window.addEventListener('resize', function () {
            fitFaqAnswer(document.querySelector('.faq-item.open'));
        });

        // --- Legacy counters: show the final value (no count-up) ---
        document.querySelectorAll('[data-counter]').forEach(function (el) {
            var d = parseInt(el.dataset.decimals || '0', 10);
            el.textContent = parseFloat(el.dataset.counter).toFixed(d);
        });
    });
})();
