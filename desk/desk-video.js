(() => {
  const video = document.querySelector('[data-desk-video]');
  const start = document.querySelector('[data-desk-video-start]');
  const status = document.querySelector('[data-desk-video-status]');
  if (!video || !start || !status) return;

  const showPlaybackHelp = () => {
    start.hidden = false;
    status.textContent = 'Playback is unavailable in this browser. Download the MP4 or read the walkthrough below.';
    status.hidden = false;
  };

  // Native controls remain usable when JavaScript is unavailable.
  start.hidden = false;
  start.addEventListener('click', async () => {
    start.hidden = true;
    try {
      await video.play();
      video.focus({ preventScroll: true });
    } catch {
      showPlaybackHelp();
    }
  });
  video.addEventListener('playing', () => {
    start.hidden = true;
    status.hidden = true;
  });
  video.addEventListener('ended', () => {
    start.querySelector('strong').textContent = 'Replay the walkthrough';
    start.setAttribute('aria-label', 'Replay the 42-second TGI Operating Desk walkthrough');
    start.hidden = false;
  });
  video.addEventListener('error', showPlaybackHelp);
})();
