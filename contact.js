(() => {
 'use strict';
 const dialog=document.getElementById('contact-dialog'),form=dialog?.querySelector('form');
 if(!form)return;
 const submit=form.querySelector('[type="submit"]'),status=document.getElementById('contact-status');
 const config=window.ORBYTEK_CONTACT||{};
 let posting=false,lastFields='',receipt=null;
 const message=(text,error=false)=>{status.textContent=text;status.setAttribute('role',error?'alert':'status');};
 const available=()=>config.enabled===true&&typeof config.accessKey==='string'&&config.accessKey.trim().length>10;
 document.getElementById('open-contact-form').addEventListener('click',()=>{
  dialog.showModal();submit.disabled=posting||!available();
  if(!available())message('Le formulaire est indisponible. Utilisez le lien e-mail ci-dessous.',true);
 });
 document.getElementById('close-contact-form').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(posting||!available()||!form.reportValidity())return;
  const values=new FormData(form);
  if(String(values.get('website')||'').trim())return;
  const fields=Object.fromEntries(['name','email','phone','company','project','message'].map(key=>[key,String(values.get(key)||'').trim()]));
  if(!fields.name||!fields.email||!fields.message){message('Veuillez remplir les champs obligatoires.',true);return;}
  const fingerprint=JSON.stringify(fields);
  if(fingerprint!==lastFields||!receipt){receipt=crypto.randomUUID();lastFields=fingerprint;}
  posting=true;submit.disabled=true;submit.textContent='Envoi en cours…';message('');
  try{
   const response=await fetch('https://api.web3forms.com/submit',{
    method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({...fields,access_key:config.accessKey.trim(),subject:'Orbytek — Nouvelle demande de contact',from_name:'Orbytek',replyto:fields.email,reference:receipt,source:'Formulaire de contact Orbytek',botcheck:''}),
    signal:AbortSignal.timeout(12000)
   });
   const result=await response.json();
   // An HTTP success alone does not confirm acceptance by the provider.
   if(!response.ok||result?.success!==true)throw Error('submission_unconfirmed');
   window.location.assign(new URL('merci.html',window.location.href).href);
  }catch{
   posting=false;submit.disabled=false;submit.textContent='Réessayer l’envoi →';
   submit.setAttribute('aria-label','Envoi non confirmé. Réessayer l’envoi');message('');
  }
 });
})();
