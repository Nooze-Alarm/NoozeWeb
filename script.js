// Add fade-in effect when elements are in view
window.addEventListener('scroll', function () {
    const fadeElements = document.querySelectorAll('.fade-in');
  
    fadeElements.forEach((el) => {
      const position = el.getBoundingClientRect();
      if (position.top < window.innerHeight && position.bottom >= 0) {
        el.classList.add('fade-in-visible');
      } else {
        el.classList.remove('fade-in-visible');
      }
    });
  });
  