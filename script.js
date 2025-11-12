// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    // Subscribe Modal
    const modal = document.getElementById('subscribeModal');
    const subscribeBtns = document.querySelectorAll('#subscribeBtn, #subscribeBtnBottom, #subscribeBtnRoadmap');
    const closeModal = document.getElementById('closeModal');
    const subscribeForm = document.getElementById('subscribeForm');
    const subscribeThankYou = document.getElementById('subscribeThankYou');

    if (modal) {
        const showModal = function() {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(function() {
                modal.classList.add('opacity-100');
            }, 10);
        };

        const hideModal = function() {
            modal.classList.remove('opacity-100');
            setTimeout(function() {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 300);
            localStorage.setItem('noozeSubscribed', 'true');
        };

        // Show modal once on first visit
        if (!localStorage.getItem('noozeSubscribed')) {
            setTimeout(showModal, 1000);
        }

        // Subscribe button handlers
        subscribeBtns.forEach(function(btn) {
            if (btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    showModal();
                });
            }
        });

        if (closeModal) {
            closeModal.addEventListener('click', hideModal);
        }

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideModal();
            }
        });

        if (subscribeForm) {
            subscribeForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const formData = new FormData(subscribeForm);
                const submitBtn = subscribeForm.querySelector('button[type="submit"]');
                const emailInput = subscribeForm.querySelector('input[type="email"]');
                const originalBtnText = submitBtn.textContent;

                // Disable form and show loading state
                submitBtn.disabled = true;
                emailInput.disabled = true;
                submitBtn.textContent = 'Subscribing...';
                submitBtn.classList.add('opacity-75', 'cursor-not-allowed');

                // Hide any previous messages
                if (subscribeThankYou) {
                    subscribeThankYou.classList.add('hidden');
                    subscribeThankYou.classList.remove('text-red-500');
                }

                try {
                    const response = await fetch(subscribeForm.action, {
                        method: 'POST',
                        body: formData,
                        headers: { 'Accept': 'application/json' }
                    });

                    if (response.ok) {
                        // Success
                        submitBtn.textContent = 'Subscribed!';
                        submitBtn.classList.remove('bg-primary', 'hover:bg-primary-dark');
                        submitBtn.classList.add('bg-green-500');
                        subscribeForm.reset();
                        
                        if (subscribeThankYou) {
                            subscribeThankYou.textContent = 'Thank you for subscribing!';
                            subscribeThankYou.classList.remove('hidden', 'text-red-500');
                            subscribeThankYou.classList.add('text-primary');
                        }
                        
                        localStorage.setItem('noozeSubscribed', 'true');
                        setTimeout(function() {
                            hideModal();
                            // Reset button state
                            submitBtn.disabled = false;
                            emailInput.disabled = false;
                            submitBtn.textContent = originalBtnText;
                            submitBtn.classList.remove('opacity-75', 'cursor-not-allowed', 'bg-green-500');
                            submitBtn.classList.add('bg-primary', 'hover:bg-primary-dark');
                        }, 2000);
                    } else {
                        // Error response
                        submitBtn.disabled = false;
                        emailInput.disabled = false;
                        submitBtn.textContent = originalBtnText;
                        submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                        
                        if (subscribeThankYou) {
                            subscribeThankYou.textContent = 'There was an error. Please try again.';
                            subscribeThankYou.classList.remove('hidden');
                            subscribeThankYou.classList.add('text-red-500');
                        }
                    }
                } catch (error) {
                    // Network or other error
                    submitBtn.disabled = false;
                    emailInput.disabled = false;
                    submitBtn.textContent = originalBtnText;
                    submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                    
                    if (subscribeThankYou) {
                        subscribeThankYou.textContent = 'There was an error. Please check your connection and try again.';
                        subscribeThankYou.classList.remove('hidden');
                        subscribeThankYou.classList.add('text-red-500');
                    }
                }
            });
        }
    }

    // FAQ Accordion
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(function(question) {
        question.addEventListener('click', function() {
            const answer = question.nextElementSibling;
            const icon = question.querySelector('.faq-icon');
            const isOpen = !answer.classList.contains('hidden');

            // Close all other FAQs
            document.querySelectorAll('.faq-answer').forEach(function(ans) {
                ans.classList.add('hidden');
            });
            document.querySelectorAll('.faq-icon').forEach(function(ic) {
                ic.classList.remove('rotate-180');
            });

            // Toggle current FAQ
            if (isOpen) {
                answer.classList.add('hidden');
                if (icon) icon.classList.remove('rotate-180');
            } else {
                answer.classList.remove('hidden');
                if (icon) icon.classList.add('rotate-180');
            }
        });
    });

    // Contact Form Validation
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitLoading = document.getElementById('submitLoading');
        const formSuccess = document.getElementById('formSuccess');
        const formError = document.getElementById('formError');

        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (formSuccess) formSuccess.classList.add('hidden');
            if (formError) formError.classList.add('hidden');

            if (submitBtn) submitBtn.disabled = true;
            if (submitText) submitText.classList.add('hidden');
            if (submitLoading) submitLoading.classList.remove('hidden');

            const formData = new FormData(contactForm);

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    if (formSuccess) {
                        formSuccess.classList.remove('hidden');
                        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    contactForm.reset();
                } else {
                    if (formError) {
                        formError.classList.remove('hidden');
                        formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            } catch (error) {
                if (formError) {
                    formError.classList.remove('hidden');
                    formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (submitText) submitText.classList.remove('hidden');
                if (submitLoading) submitLoading.classList.add('hidden');
            }
        });

        // Real-time validation
        const inputs = contactForm.querySelectorAll('input, textarea, select');
        inputs.forEach(function(input) {
            input.addEventListener('blur', function() {
                validateField(input);
            });
        });
    }

    function validateField(field) {
        const errorSpan = field.parentElement.querySelector('.error-message');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (field.hasAttribute('required') && !field.value.trim()) {
            if (errorSpan) {
                errorSpan.textContent = 'This field is required';
                errorSpan.classList.remove('hidden');
            }
            field.classList.add('border-red-500');
            return false;
        } else if (field.type === 'email' && field.value && !emailRegex.test(field.value)) {
            if (errorSpan) {
                errorSpan.textContent = 'Please enter a valid email address';
                errorSpan.classList.remove('hidden');
            }
            field.classList.add('border-red-500');
            return false;
        } else {
            if (errorSpan) errorSpan.classList.add('hidden');
            field.classList.remove('border-red-500');
            return true;
        }
    }

    // Scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(function(el) {
        observer.observe(el);
    });

    // Back to Top Button
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.remove('hidden', 'opacity-0', 'translate-y-4');
                backToTopBtn.classList.add('opacity-100', 'translate-y-0');
            } else {
                backToTopBtn.classList.add('opacity-0', 'translate-y-4');
                setTimeout(function() {
                    if (window.pageYOffset <= 300) {
                        backToTopBtn.classList.add('hidden');
                    }
                }, 300);
            }
        });

        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Footer Subscribe Form
    const footerSubscribeForm = document.getElementById('footerSubscribeForm');
    if (footerSubscribeForm) {
        footerSubscribeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(footerSubscribeForm);
            const submitBtn = footerSubscribeForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Subscribing...';

            try {
                const response = await fetch(footerSubscribeForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    submitBtn.textContent = 'Subscribed!';
                    submitBtn.classList.add('bg-green-500', 'hover:bg-green-600');
                    footerSubscribeForm.reset();
                    setTimeout(function() {
                        submitBtn.textContent = originalText;
                        submitBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                        submitBtn.disabled = false;
                    }, 2000);
                } else {
                    submitBtn.textContent = 'Error - Try Again';
                    setTimeout(function() {
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    }, 2000);
                }
            } catch (error) {
                submitBtn.textContent = 'Error - Try Again';
                setTimeout(function() {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const href = anchor.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Enhanced mobile menu animation
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            const isHidden = mobileMenu.classList.contains('hidden');
            if (isHidden) {
                mobileMenu.classList.remove('hidden');
                setTimeout(function() {
                    mobileMenu.classList.add('opacity-100', 'max-h-screen');
                    mobileMenu.classList.remove('opacity-0', 'max-h-0');
                }, 10);
            } else {
                mobileMenu.classList.add('opacity-0', 'max-h-0');
                mobileMenu.classList.remove('opacity-100', 'max-h-screen');
                setTimeout(function() {
                    mobileMenu.classList.add('hidden');
                }, 300);
            }
        });
    }
});

// Add fade-in-visible class styles dynamically
const style = document.createElement('style');
style.textContent = `
    .fade-in {
        opacity: 0;
        transform: translateY(40px);
        transition: opacity 0.8s ease-out, transform 0.8s ease-out;
    }
    .fade-in-visible {
        opacity: 1;
        transform: translateY(0);
    }
    @media (prefers-reduced-motion: reduce) {
        .fade-in,
        .fade-in-visible {
            transition: none;
        }
    }
    /* Better focus states for accessibility */
    a:focus-visible,
    button:focus-visible {
        outline: 2px solid #00bcd4;
        outline-offset: 2px;
    }
`;
document.head.appendChild(style);

