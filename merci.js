/* Replay only the illustration; the form is never submitted again. */
(() => {
  if(window.parent!==window){
    document.querySelectorAll('a').forEach(link=>{link.target='_top';});
  }
  const replay = document.getElementById('replay-flight');
  const illustration = document.querySelector('.delivery-art');
  replay.addEventListener('click', () => {
    document.getElementById('rocket-motion').beginElement();
    illustration.querySelectorAll('.rocket-flight, .flight-trace, .arrival-ring, .arrival-check').forEach(element => {
      element.getAnimations().forEach(animation => {
        animation.cancel();
        animation.play();
      });
    });
  });
})();
