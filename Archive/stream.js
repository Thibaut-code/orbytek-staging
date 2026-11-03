/* Continuous browser playback of the web-optimized family archive. */
(() => {
  const video = document.querySelector('#film');
  const playlist = video.getAttribute('src');
  if(!window.Hls || !Hls.isSupported()) {
    if(video.canPlayType('application/vnd.apple.mpegurl')) return;
    document.querySelector('#current').textContent='Ce navigateur ne permet pas la lecture du film. Essayez une version récente de Safari, Chrome, Edge ou Firefox.';
    return;
  }
  video.removeAttribute('src');
  const player = new Hls({maxBufferLength:30,maxMaxBufferLength:60,backBufferLength:30,maxBufferSize:40*1024*1024});
  player.attachMedia(video);
  player.on(Hls.Events.MEDIA_ATTACHED,() => player.loadSource(playlist));
  let networkRetries=0,mediaRetries=0;
  player.on(Hls.Events.ERROR,(_event,data) => {
    if(!data.fatal) return;
    if(data.type===Hls.ErrorTypes.NETWORK_ERROR && networkRetries++<3) player.startLoad();
    else if(data.type===Hls.ErrorTypes.MEDIA_ERROR && mediaRetries++<1) player.recoverMediaError();
    else document.querySelector('#current').textContent='La vidéo est momentanément indisponible. Rechargez la page pour réessayer.';
  });
})();
