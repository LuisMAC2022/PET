(function(){
  const slides = Array.from(document.querySelectorAll('.slide'));
  const fill = document.getElementById('fill');
  const marker = document.getElementById('marker');
  const counter = document.getElementById('counter');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  let i = 0;

  function pad(n){ return String(n).padStart(2,'0'); }

  function go(n){
    n = Math.max(0, Math.min(slides.length - 1, n));
    slides[i].classList.remove('active');
    i = n;
    slides[i].classList.add('active');
    const pct = slides.length > 1 ? (i / (slides.length - 1)) * 100 : 0;
    fill.style.width = pct + '%';
    marker.style.left = pct + '%';
    counter.textContent = pad(i + 1) + ' / ' + pad(slides.length);
    document.body.classList.toggle('dark-mode', slides[i].classList.contains('dark'));
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
  }

  next.addEventListener('click', () => go(i + 1));
  prev.addEventListener('click', () => go(i - 1));

  document.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(i + 1); }
    else if(e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(i - 1); }
    else if(e.key === 'Home') { e.preventDefault(); go(0); }
    else if(e.key === 'End') { e.preventDefault(); go(slides.length - 1); }
  });

  let x0 = null;
  document.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, {passive:true});
  document.addEventListener('touchend', e => {
    if(x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if(Math.abs(dx) > 50) go(dx < 0 ? i + 1 : i - 1);
    x0 = null;
  }, {passive:true});

  go(0);
})();
