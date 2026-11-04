/* Replay only the illustration; the form is never submitted again. */
(() => {
  if(window.parent!==window){
    // FormSubmit.io redirects its successful native POST here. The parent
    // checks this frame and origin, then navigates the whole window here.
    window.parent.postMessage({type:'orbytek-contact-received'},'*');
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
