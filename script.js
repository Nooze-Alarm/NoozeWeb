// Add fade-in effect when elements are in view
window.addEventListener('scroll', function () {
    const fadeElements = document.querySelectorAll('.fade-in');
  
    fadeElements.forEach((el) => {
      const position = el.getBoundingClientRect();
      if (position.top < window.innerHeight - 40 && position.bottom >= 0) {
        el.classList.add('fade-in-visible');
      } else {
        el.classList.remove('fade-in-visible');
      }
    });
  });
  
// Initial fade-in on load
window.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.fade-in').forEach(el => {
        const position = el.getBoundingClientRect();
        if (position.top < window.innerHeight - 40 && position.bottom >= 0) {
            el.classList.add('fade-in-visible');
        }
    });

    // Modal animation
    const modal = document.getElementById('subscribeModal');
    if (modal) {
        const showModal = () => { modal.classList.add('show'); modal.style.display = 'flex'; };
        const hideModal = () => { modal.classList.remove('show'); setTimeout(() => { modal.style.display = 'none'; }, 300); };
        const btn = document.getElementById('subscribeBtn');
        const close = document.getElementById('closeModal');
        const form = document.getElementById('subscribeForm');
        const thankYou = document.getElementById('subscribeThankYou');
        if (!localStorage.getItem('noozeSubscribed')) {
            setTimeout(() => { showModal(); }, 1000);
        }
        if (btn) btn.onclick = function(e) { e.preventDefault(); showModal(); };
        if (close) close.onclick = function() { hideModal(); localStorage.setItem('noozeSubscribed', 'true'); };
        window.onclick = function(event) {
            if (event.target == modal) { hideModal(); localStorage.setItem('noozeSubscribed', 'true'); }
        };
        if (form) form.onsubmit = function(e) {
            e.preventDefault();
            fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if (response.ok) {
                    form.style.display = 'none';
                    thankYou.style.display = 'block';
                    localStorage.setItem('noozeSubscribed', 'true');
                    setTimeout(() => { hideModal(); }, 2000);
                } else {
                    thankYou.textContent = 'There was an error. Please try again.';
                    thankYou.style.color = '#ff5252';
                    thankYou.style.display = 'block';
                }
            });
        };
    }

    // Ripple effect for buttons
    document.querySelectorAll('.btn-primary, .contact-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = e.offsetX + 'px';
            ripple.style.top = e.offsetY + 'px';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
});
  