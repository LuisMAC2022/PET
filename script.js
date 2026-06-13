(function(){
  const slides = Array.from(document.querySelectorAll('.slide'));
  const fill = document.getElementById('fill');
  const marker = document.getElementById('marker');
  const counter = document.getElementById('counter');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  const revealSelector = ':scope > h1, :scope > h2, :scope > .sentence, :scope > .lede, :scope > .quote, :scope > .loop, :scope > .ledger, :scope > .roadmap-list, :scope > .pipeline-real, :scope > .hair';
  const interactiveSelector = 'button, a, input, textarea, select';
  let i = 0;
  let revealIndex = 0;
  let x0 = null;
  let didSwipe = false;

  function pad(n){ return String(n).padStart(2,'0'); }

  function getRevealables(slide){
    return Array.from(slide.querySelectorAll(revealSelector));
  }

  function setRevealState(element, visible){
    element.classList.toggle('reveal-visible', visible);
    element.classList.toggle('reveal-pending', !visible);
    element.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function revealAll(slide){
    const revealables = getRevealables(slide);
    revealables.forEach(element => setRevealState(element, true));
    if(slide === slides[i]) revealIndex = Math.max(0, revealables.length - 1);
  }

  function revealPartial(slide){
    const revealables = getRevealables(slide);
    revealIndex = 0;

    if(revealables.length === 0) return;

    revealables.forEach((element, index) => {
      setRevealState(element, index === 0);
    });
  }

  function updateControls(){
    const activeRevealables = getRevealables(slides[i]);
    const allRevealed = activeRevealables.length === 0 || revealIndex >= activeRevealables.length - 1;

    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1 && allRevealed;
  }

  function go(n, options){
    const settings = Object.assign({ reveal: 'partial' }, options);

    n = Math.max(0, Math.min(slides.length - 1, n));
    slides[i].classList.remove('active');
    i = n;
    slides.forEach((slide, index) => {
      slide.setAttribute('aria-hidden', index === i ? 'false' : 'true');
    });
    slides[i].classList.add('active');

    if(settings.reveal === 'all') revealAll(slides[i]);
    else revealPartial(slides[i]);

    const pct = slides.length > 1 ? (i / (slides.length - 1)) * 100 : 0;
    fill.style.width = pct + '%';
    marker.style.left = pct + '%';
    counter.textContent = pad(i + 1) + ' / ' + pad(slides.length);
    document.body.classList.toggle('dark-mode', slides[i].classList.contains('dark'));
    updateControls();
  }

  function revealNext(){
    const activeRevealables = getRevealables(slides[i]);

    if(activeRevealables.length === 0){
      go(i + 1, { reveal: 'partial' });
      return;
    }

    if(revealIndex < activeRevealables.length - 1){
      revealIndex += 1;
      setRevealState(activeRevealables[revealIndex], true);
      updateControls();
      return;
    }

    go(i + 1, { reveal: 'partial' });
  }

  function isInteractiveTarget(target){
    return target && typeof target.closest === 'function' && target.closest(interactiveSelector) !== null;
  }

  next.addEventListener('click', revealNext);
  prev.addEventListener('click', () => go(i - 1, { reveal: 'all' }));

  document.addEventListener('click', (e) => {
    if(didSwipe){
      didSwipe = false;
      return;
    }

    if(isInteractiveTarget(e.target)) return;
    if(e.target && typeof e.target.closest === 'function' && e.target.closest('.slide.active')) revealNext();
  });

  document.addEventListener('keydown', (e) => {
    if(isInteractiveTarget(e.target)) return;

    if(e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      go(i + 1, { reveal: 'all' });
    }
    else if(e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      go(i - 1, { reveal: 'all' });
    }
    else if(e.key === 'Home') {
      e.preventDefault();
      go(0, { reveal: 'all' });
    }
    else if(e.key === 'End') {
      e.preventDefault();
      go(slides.length - 1, { reveal: 'all' });
    }
  });

  document.addEventListener('touchstart', e => {
    x0 = e.touches[0].clientX;
    didSwipe = false;
  }, {passive:true});

  document.addEventListener('touchend', e => {
    if(x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;

    if(Math.abs(dx) > 50){
      didSwipe = true;
      go(dx < 0 ? i + 1 : i - 1, { reveal: 'all' });
      window.setTimeout(() => { didSwipe = false; }, 400);
    }

    x0 = null;
  }, {passive:true});

  slides.forEach(slide => revealAll(slide));
  go(0, { reveal: 'partial' });
})();
