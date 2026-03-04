// ===== Nooze Website - Main Script =====

// --- Page Pixelation Transition ---
(function initPageTransition() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var PIXEL = 40;
    var WAVE_DURATION = 450;
    var PIXEL_ANIM = 180;
    var BG_COLORS = ['#050510', '#060614', '#070718', '#08081c', '#0a0a1a', '#0b0b1e'];
    var ACCENTS = ['rgba(0,188,212,0.5)', 'rgba(124,58,237,0.4)', 'rgba(59,130,246,0.35)'];

    function pickColor() {
        if (Math.random() < 0.07) return ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
        return BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)];
    }

    function makeCanvas() {
        var c = document.createElement('canvas');
        c.id = 'pixelTransition';
        c.width = window.innerWidth;
        c.height = window.innerHeight;
        document.body.appendChild(c);
        return c;
    }

    function buildGrid(ox, oy, w, h) {
        var cols = Math.ceil(w / PIXEL);
        var rows = Math.ceil(h / PIXEL);
        var maxDist = Math.sqrt(w * w + h * h);
        var grid = [];
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var cx = c * PIXEL + PIXEL / 2;
                var cy = r * PIXEL + PIXEL / 2;
                var d = Math.sqrt((cx - ox) * (cx - ox) + (cy - oy) * (cy - oy));
                grid.push({
                    x: c * PIXEL,
                    y: r * PIXEL,
                    delay: (d / maxDist) * WAVE_DURATION + Math.random() * 60,
                    color: pickColor()
                });
            }
        }
        return grid;
    }

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function easeIn(t) { return t * t * t; }

    // EXIT: pixels grow in from click point, then navigate
    function animateExit(originX, originY, url) {
        var canvas = makeCanvas();
        var ctx = canvas.getContext('2d');
        var grid = buildGrid(originX, originY, canvas.width, canvas.height);
        var start = performance.now();

        function draw(now) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var elapsed = now - start;
            var done = true;

            for (var i = 0; i < grid.length; i++) {
                var p = grid[i];
                var local = elapsed - p.delay;
                if (local <= 0) { done = false; continue; }
                var t = Math.min(1, local / PIXEL_ANIM);
                t = easeOut(t);
                if (t < 1) done = false;
                var sz = PIXEL * t;
                var off = (PIXEL - sz) / 2;
                ctx.globalAlpha = t;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x + off, p.y + off, sz, sz);
            }

            if (!done) {
                requestAnimationFrame(draw);
            } else {
                // Fill solid to prevent gaps
                ctx.globalAlpha = 1;
                for (var i = 0; i < grid.length; i++) {
                    ctx.fillStyle = grid[i].color;
                    ctx.fillRect(grid[i].x, grid[i].y, PIXEL, PIXEL);
                }
                sessionStorage.setItem('nooze_pixel_transition', '1');
                window.location.href = url;
            }
        }

        requestAnimationFrame(draw);
    }

    // ENTER: pixels shrink out from center, revealing the page
    function animateEnter() {
        var canvas = makeCanvas();
        var ctx = canvas.getContext('2d');
        var ox = canvas.width / 2;
        var oy = canvas.height / 2;
        var grid = buildGrid(ox, oy, canvas.width, canvas.height);

        // Draw initial solid cover
        for (var i = 0; i < grid.length; i++) {
            ctx.fillStyle = grid[i].color;
            ctx.fillRect(grid[i].x, grid[i].y, PIXEL, PIXEL);
        }

        // Reveal body (hidden by inline head script to prevent flash)
        document.body.style.visibility = 'visible';
        var hideStyle = document.getElementById('pxl-hide');
        if (hideStyle) hideStyle.remove();

        var start = performance.now();

        function draw(now) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var elapsed = now - start;
            var alive = false;

            for (var i = 0; i < grid.length; i++) {
                var p = grid[i];
                var local = elapsed - p.delay;
                if (local <= 0) {
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x, p.y, PIXEL, PIXEL);
                    alive = true;
                    continue;
                }
                var t = Math.min(1, local / PIXEL_ANIM);
                t = easeIn(t);
                if (t >= 1) continue; // fully gone
                alive = true;
                var alpha = 1 - t;
                var sz = PIXEL * (1 - t);
                var off = (PIXEL - sz) / 2;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x + off, p.y + off, sz, sz);
            }

            if (alive) {
                requestAnimationFrame(draw);
            } else {
                canvas.remove();
            }
        }

        // Tiny delay so the page content renders underneath
        requestAnimationFrame(function() {
            start = performance.now();
            requestAnimationFrame(draw);
        });
    }

    // If arriving from a transition, play the enter animation immediately
    if (sessionStorage.getItem('nooze_pixel_transition')) {
        sessionStorage.removeItem('nooze_pixel_transition');
        animateEnter();
    }

    // Intercept internal nav links after DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        var links = document.querySelectorAll('a[href]');
        var currentPage = window.location.pathname.split('/').pop() || 'index.html';

        links.forEach(function(link) {
            var href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;
            if (!href.endsWith('.html') && href !== '/') return;
            if (href === currentPage) return;

            link.addEventListener('click', function(e) {
                e.preventDefault();
                var rect = link.getBoundingClientRect();
                var ox = rect.left + rect.width / 2;
                var oy = rect.top + rect.height / 2;
                animateExit(ox, oy, href);
            });
        });
    });
})();

// --- Rate Limiter ---
function checkRateLimit(key, cooldownMinutes) {
    var storageKey = 'nooze_rate_limit_' + key;
    var lastSubmission = localStorage.getItem(storageKey);
    if (lastSubmission) {
        var timeDiff = (Date.now() - parseInt(lastSubmission)) / 1000 / 60;
        if (timeDiff < cooldownMinutes) {
            return { allowed: false, remainingMinutes: Math.ceil(cooldownMinutes - timeDiff) };
        }
    }
    return { allowed: true };
}

function setRateLimit(key) {
    localStorage.setItem('nooze_rate_limit_' + key, Date.now().toString());
}

// --- Particle Canvas ---
(function initParticles() {
    var canvas = document.getElementById('particles');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var mouseX = -1000;
    var mouseY = -1000;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Track mouse for interactive glow
    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: (Math.random() - 0.5) * 0.3,
            opacity: Math.random() * 0.5 + 0.1,
            pulse: Math.random() * Math.PI * 2
        };
    }

    // Create initial particles
    var count = Math.min(80, Math.floor(window.innerWidth / 20));
    for (var i = 0; i < count; i++) {
        particles.push(createParticle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(function(p) {
            p.x += p.speedX;
            p.y += p.speedY;
            p.pulse += 0.01;

            // Wrap around
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            // Mouse interaction - glow brighter near cursor
            var dx = p.x - mouseX;
            var dy = p.y - mouseY;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var mouseFactor = dist < 150 ? (1 - dist / 150) * 0.5 : 0;

            var alpha = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse)) + mouseFactor;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 188, 212, ' + Math.min(alpha, 1) + ')';
            ctx.fill();

            // Glow effect for nearby particles
            if (mouseFactor > 0) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 188, 212, ' + (mouseFactor * 0.15) + ')';
                ctx.fill();
            }
        });

        // Draw connections between close particles
        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var dx = particles[i].x - particles[j].x;
                var dy = particles[i].y - particles[j].y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = 'rgba(0, 188, 212, ' + (0.05 * (1 - dist / 120)) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    // Only animate if user hasn't opted for reduced motion
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animate();
    }
})();

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', function() {

    // --- Scroll Reveal ---
    var revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    var revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(function(el) {
        revealObserver.observe(el);
    });

    // --- Mobile Menu ---
    var mobileMenuBtn = document.getElementById('mobileMenuBtn');
    var mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            var isHidden = mobileMenu.classList.contains('hidden');
            if (isHidden) {
                mobileMenu.classList.remove('hidden');
            } else {
                mobileMenu.classList.add('hidden');
            }
        });
    }

    // --- Subscribe Modal ---
    var modal = document.getElementById('subscribeModal');
    var closeModal = document.getElementById('closeModal');
    var subscribeForm = document.getElementById('subscribeForm');
    var subscribeThankYou = document.getElementById('subscribeThankYou');

    var subscribeBtns = document.querySelectorAll('#subscribeBtn, #subscribeBtnHero, #subscribeBtnBottom, #subscribeBtnMobile, #subscribeBtnRoadmap');

    function showModal() {
        if (!modal) return;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideModal() {
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    subscribeBtns.forEach(function(btn) {
        if (btn) btn.addEventListener('click', function(e) {
            e.preventDefault();
            showModal();
        });
    });

    if (closeModal) closeModal.addEventListener('click', hideModal);
    if (modal) modal.addEventListener('click', function(e) {
        if (e.target === modal) hideModal();
    });

    // Escape key closes modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') hideModal();
    });

    // Subscribe form submission
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            var honeypot = subscribeForm.querySelector('input[name="website"]');
            if (honeypot && honeypot.value) return;

            var rateLimitCheck = checkRateLimit('subscribe', 5);
            if (!rateLimitCheck.allowed) {
                if (subscribeThankYou) {
                    var minutes = rateLimitCheck.remainingMinutes;
                    subscribeThankYou.textContent = 'Please wait ' + minutes + ' minute' + (minutes === 1 ? '' : 's') + ' before subscribing again.';
                    subscribeThankYou.classList.remove('hidden');
                    subscribeThankYou.style.color = '#ef4444';
                }
                return;
            }

            var submitBtn = subscribeForm.querySelector('button[type="submit"]');
            var emailInput = subscribeForm.querySelector('input[type="email"]');
            var originalText = submitBtn.textContent;

            submitBtn.disabled = true;
            emailInput.disabled = true;
            submitBtn.querySelector('span').textContent = 'Subscribing...';

            if (subscribeThankYou) subscribeThankYou.classList.add('hidden');

            try {
                var response = await fetch(subscribeForm.action, {
                    method: 'POST',
                    body: new FormData(subscribeForm),
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    setRateLimit('subscribe');
                    subscribeForm.reset();
                    if (subscribeThankYou) {
                        subscribeThankYou.textContent = 'Thank you for subscribing!';
                        subscribeThankYou.classList.remove('hidden');
                        subscribeThankYou.style.color = '';
                    }
                    setTimeout(hideModal, 2000);
                } else {
                    if (subscribeThankYou) {
                        subscribeThankYou.textContent = 'Something went wrong. Please try again.';
                        subscribeThankYou.classList.remove('hidden');
                        subscribeThankYou.style.color = '#ef4444';
                    }
                }
            } catch (err) {
                if (subscribeThankYou) {
                    subscribeThankYou.textContent = 'Network error. Please check your connection.';
                    subscribeThankYou.classList.remove('hidden');
                    subscribeThankYou.style.color = '#ef4444';
                }
            } finally {
                submitBtn.disabled = false;
                emailInput.disabled = false;
                submitBtn.querySelector('span').textContent = originalText;
            }
        });
    }

    // --- Footer Subscribe Form ---
    var footerForm = document.getElementById('footerSubscribeForm');
    if (footerForm) {
        footerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            var honeypot = footerForm.querySelector('input[name="website"]');
            if (honeypot && honeypot.value) return;

            var rateLimitCheck = checkRateLimit('subscribe', 5);
            var submitBtn = footerForm.querySelector('button[type="submit"]');
            var originalText = submitBtn.querySelector('span').textContent;

            if (!rateLimitCheck.allowed) {
                submitBtn.querySelector('span').textContent = 'Wait...';
                submitBtn.disabled = true;
                setTimeout(function() {
                    submitBtn.querySelector('span').textContent = originalText;
                    submitBtn.disabled = false;
                }, 2000);
                return;
            }

            submitBtn.disabled = true;
            submitBtn.querySelector('span').textContent = '...';

            try {
                var response = await fetch(footerForm.action, {
                    method: 'POST',
                    body: new FormData(footerForm),
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    setRateLimit('subscribe');
                    footerForm.reset();
                    submitBtn.querySelector('span').textContent = 'Done!';
                    setTimeout(function() {
                        submitBtn.querySelector('span').textContent = originalText;
                        submitBtn.disabled = false;
                    }, 2000);
                } else {
                    submitBtn.querySelector('span').textContent = 'Error';
                    setTimeout(function() {
                        submitBtn.querySelector('span').textContent = originalText;
                        submitBtn.disabled = false;
                    }, 2000);
                }
            } catch (err) {
                submitBtn.querySelector('span').textContent = 'Error';
                setTimeout(function() {
                    submitBtn.querySelector('span').textContent = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            }
        });
    }

    // --- Contact Form ---
    var contactForm = document.getElementById('contactForm');
    if (contactForm) {
        var submitBtn = document.getElementById('submitBtn');
        var submitText = document.getElementById('submitText');
        var submitLoading = document.getElementById('submitLoading');
        var formSuccess = document.getElementById('formSuccess');
        var formError = document.getElementById('formError');

        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            var honeypot = contactForm.querySelector('input[name="website"]');
            if (honeypot && honeypot.value) return;

            var rateLimitCheck = checkRateLimit('contact', 2);
            if (!rateLimitCheck.allowed) {
                if (formError) {
                    var minutes = rateLimitCheck.remainingMinutes;
                    formError.textContent = 'Please wait ' + minutes + ' minute' + (minutes === 1 ? '' : 's') + ' before submitting again.';
                    formError.classList.remove('hidden');
                }
                return;
            }

            if (formSuccess) formSuccess.classList.add('hidden');
            if (formError) formError.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = true;
            if (submitText) submitText.classList.add('hidden');
            if (submitLoading) submitLoading.classList.remove('hidden');

            try {
                var response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: new FormData(contactForm),
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    setRateLimit('contact');
                    if (formSuccess) formSuccess.classList.remove('hidden');
                    contactForm.reset();
                } else {
                    if (formError) formError.classList.remove('hidden');
                }
            } catch (err) {
                if (formError) formError.classList.remove('hidden');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (submitText) submitText.classList.remove('hidden');
                if (submitLoading) submitLoading.classList.add('hidden');
            }
        });

        // Real-time validation
        contactForm.querySelectorAll('input, textarea, select').forEach(function(input) {
            input.addEventListener('blur', function() {
                validateField(input);
            });
        });
    }

    function validateField(field) {
        var errorSpan = field.parentElement.querySelector('.error-message');
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (field.hasAttribute('required') && !field.value.trim()) {
            if (errorSpan) {
                errorSpan.textContent = 'This field is required';
                errorSpan.classList.remove('hidden');
            }
            field.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            return false;
        } else if (field.type === 'email' && field.value && !emailRegex.test(field.value)) {
            if (errorSpan) {
                errorSpan.textContent = 'Please enter a valid email address';
                errorSpan.classList.remove('hidden');
            }
            field.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            return false;
        } else {
            if (errorSpan) errorSpan.classList.add('hidden');
            field.style.borderColor = '';
            return true;
        }
    }

    // --- FAQ Accordion ---
    document.querySelectorAll('.faq-question').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var item = btn.closest('.faq-item');
            var wasOpen = item.classList.contains('open');

            // Close all
            document.querySelectorAll('.faq-item').forEach(function(i) {
                i.classList.remove('open');
                i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });

            // Toggle current
            if (!wasOpen) {
                item.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // --- Back to Top ---
    var backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 400) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });

        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- Smooth Scroll for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var href = anchor.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                var target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    // --- Navbar scroll effect ---
    var nav = document.querySelector('nav');
    if (nav) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 20) {
                nav.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.3)';
            } else {
                nav.style.boxShadow = '';
            }
        });
    }
});
