(() => {
 'use strict';
 const dialog=document.getElementById('contact-dialog'),form=dialog?.querySelector('form');
 if(!form)return;
 const submit=form.querySelector('[type="submit"]'),status=document.getElementById('contact-status');
 const config=window.ORBYTEK_CONTACT||{};
 let posting=false,lastFields='',receipt=null;
 const message=(text,error=false)=>{status.textContent=text;status.setAttribute('role',error?'alert':'status');};
 function available(){
  try{
   const co=new URL(config.formsubmitCo),io=new URL(config.formsubmitIo),receiptPage=new URL(config.ioReceipt);
   return config.enabled===true&&co.origin==='https://formsubmit.co'&&co.pathname.startsWith('/ajax/')&&io.origin==='https://formsubmit.io'&&io.pathname.startsWith('/f/')&&receiptPage.protocol==='https:'&&receiptPage.pathname==='/contact-receipt.html';
  }catch{return false;}
 }
 document.getElementById('open-contact-form').addEventListener('click',()=>{
  dialog.showModal();submit.disabled=posting||!available();
  if(!available())message('Le formulaire est indisponible. Utilisez le lien e-mail ci-dessous.',true);
 });
 document.getElementById('close-contact-form').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 function showConfirmation(){
  window.location.assign(new URL('merci.html',window.location.href).href);
 }
 function sendIo(fields){
  // .io accepts native forms but refuses cross-origin AJAX responses.
  // Only its successful redirect to our receipt page can confirm this request.
  return new Promise((resolve,reject)=>{
   const frame=document.createElement('iframe'),relay=document.createElement('form');
   frame.name=`orbytek-contact-${crypto.randomUUID()}`;frame.hidden=true;frame.title='Transmission de votre demande';
   relay.hidden=true;relay.method='POST';relay.action=config.formsubmitIo;relay.target=frame.name;
   for(const [key,value] of Object.entries({...fields,_formsubmit_id:''})){
    const input=document.createElement('input');input.type='hidden';input.name=key;input.value=value;relay.append(input);
   }
   const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',accepted);relay.remove();frame.remove();};
   const accepted=event=>{
    if(event.origin!==new URL(config.ioReceipt).origin||event.source!==frame.contentWindow||event.data?.type!=='orbytek-contact-received')return;
    cleanup();resolve();
   };
   const timer=setTimeout(()=>{cleanup();reject(Error('submission_unconfirmed'));},30000);
   window.addEventListener('message',accepted);
   document.body.append(frame,relay);
   try{relay.submit();}catch(error){cleanup();reject(error);}
  });
 }
 async function sendCo(fields){
  const body=new FormData();
  for(const [key,value] of Object.entries(fields))body.append(key,value);
  body.append('_subject','Orbytek — Nouvelle demande de contact');
  body.append('_template','table');
  body.append('_honey','');
  const response=await fetch(config.formsubmitCo,{
   method:'POST',headers:{Accept:'application/json'},body,keepalive:true,
   signal:AbortSignal.timeout(30000)
  });
  const result=await response.json();
  const accepted=result?.success===true||result?.success==='true';
  if(!response.ok||!accepted)throw Error('submission_unconfirmed');
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(posting||!available()||!form.reportValidity())return;
  const values=new FormData(form);
  if(String(values.get('website')||'').trim()){
   message('La demande n’a pas pu être envoyée. Contactez-nous par e-mail.',true);return;
  }
  const fields=Object.fromEntries(['name','email','phone','company','project','message'].map(key=>[key,String(values.get(key)||'').trim()]));
  if(!fields.name||!fields.email||!fields.message){message('Veuillez remplir les champs obligatoires.',true);return;}
  const fingerprint=JSON.stringify(fields);
  if(fingerprint!==lastFields||!receipt){receipt=crypto.randomUUID();lastFields=fingerprint;}
  posting=true;submit.disabled=true;submit.textContent='Envoi en cours…';message('Envoi de votre demande…');
  try{
   const payload={...fields,reference:receipt,source:'Formulaire de contact Orbytek'};
   // Both calls start immediately. A rejected/slow provider cannot mask the other.
   await Promise.any([
    sendCo(payload),
    sendIo(payload)
   ]);
   showConfirmation();
  }catch{
   message('');
   posting=false;submit.disabled=false;submit.textContent='Réessayer l’envoi →';
  }
 });
})();
