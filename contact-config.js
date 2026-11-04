// Public form endpoints only; no API key or SMTP password belongs here.
window.ORBYTEK_CONTACT = Object.freeze({
  enabled: true,
  formsubmitCo: 'https://formsubmit.co/ajax/thibaut@orbytek.be',
  formsubmitIo: 'https://formsubmit.io/f/4382ad7d-2454-4cc2-bf13-3991d13cc309',
  // A provider cannot redirect to file:// or an HTTP local preview.
  // Use the public staging receipt there; deployed sites keep their own origin.
  ioReceipt: new URL('contact-receipt.html', window.location.href.startsWith('https:')
    ? window.location.href : 'https://test.orbytek.be/').href,
});
