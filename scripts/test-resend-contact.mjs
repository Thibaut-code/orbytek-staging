// Server-side diagnostic only. Uses the same notification payload as the worker.
// node --env-file=.env.resend.local scripts/test-resend-contact.mjs [--send]
import {emailPayload} from '../Facture/supabase/functions/_shared/contact-domain.mjs';

const from=process.env.CONTACT_FROM||'Orbytek <onboarding@resend.dev>';
const to=process.env.CONTACT_TO||'courtois.thibaut@hotmail.be';
const reference=crypto.randomUUID();
const payload=emailPayload({
 id:reference,
 name:'Test du formulaire Orbytek',
 email:process.env.CONTACT_TEST_REPLY_TO||to,
 phone:'',company:'Orbytek',project:'Site web',
 message:'Ceci est un test technique de notification Orbytek. Aucune demande client n’a été créée en base.',
 origin:'Test serveur local',
},from,to);

if(!process.argv.includes('--send')){
 console.log('Configuration :',JSON.stringify({from,to,subject:payload.subject,keyConfigured:Boolean(process.env.RESEND_API_KEY)}));
 console.log('Aucun envoi. Ajouter --send pour envoyer un seul message de test.');
}else if(!process.env.RESEND_API_KEY){
 console.error('RESEND_API_KEY manque : renseigner la nouvelle clé dans .env.resend.local (ignoré par Git).');
 process.exitCode=1;
}else{
 try{
  const response=await fetch('https://api.resend.com/emails',{
   method:'POST',
   headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`orbytek-contact/${reference}`},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(15000),
  });
  const data=await response.json();
  if(!response.ok||typeof data.id!=='string'){
   console.error(`Resend a refusé l’envoi (HTTP ${response.status}). Consulter les logs Resend.`);
   if(response.status===403)console.error('Avec onboarding@resend.dev, le destinataire doit être l’adresse du compte Resend. Pour la boîte OVH, utiliser un domaine d’envoi vérifié.');
   process.exitCode=1;
  }else console.log(`Notification acceptée par Resend. ID : ${data.id}. Vérifier ensuite sa livraison dans Resend et dans la boîte destinataire.`);
 }catch{
  console.error('Confirmation indisponible. Vérifier les logs Resend avant de relancer : le message peut avoir été accepté.');
  process.exitCode=1;
 }
}
