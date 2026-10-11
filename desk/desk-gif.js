(() => {
  'use strict';
  const image = document.querySelector('[data-desk-gif]');
  const control = document.querySelector('[data-desk-gif-control]');
  const status = document.querySelector('[data-desk-gif-status]');
  if (!image || !control || !status) return;

  const poster = image.getAttribute('src');
  const gif = image.dataset.deskGifSrc;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let playing = false;
  let inView = false;
  let userStopped = false;

  const stop = () => {
    if (playing) image.src = poster;
    playing = false;
    control.setAttribute('aria-label', 'Play animation');
    control.title = 'Play animation';
  };
  const play = () => {
    if (playing || document.hidden) return;
    image.src = gif;
    playing = true;
    control.setAttribute('aria-label', 'Stop animation');
    control.title = 'Stop animation';
  };

  control.hidden = false;
  control.addEventListener('click', () => {
    userStopped = playing;
    if (playing) {
      stop();
      status.textContent = 'Animation stopped. Play starts the complete walkthrough again.';
    } else {
      play();
      status.textContent = 'The full 42-second walkthrough animation is playing.';
    }
  });
  image.addEventListener('error', () => {
    if (!playing) return;
    stop();
    userStopped = true;
    control.hidden = true;
    status.textContent = 'Animation unavailable. The Daily Zones illustration is shown instead.';
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView && !preference.matches && !userStopped) play();
      else if (!inView) stop();
    }, { threshold: 0.05 });
    observer.observe(image);
  } else {
    inView = true;
    if (!preference.matches) play();
  }
  preference.addEventListener?.('change', () => {
    if (preference.matches) stop();
    else if (inView && !userStopped) play();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (inView && !preference.matches && !userStopped) play();
  });
})();
