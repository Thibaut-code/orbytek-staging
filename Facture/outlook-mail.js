// Microsoft tokens stay in MSAL's memory cache, separate from the Facture session.
const OUTLOOK_SCOPES=['https://graph.microsoft.com/Mail.Send'];
let outlookClientPromise=null,outlookConnection=null;
const outlookMailScope=()=>account?`${account.id}:${companyOwner()}:${sessionGeneration}`:'';
function outlookConfigured(){return /^[0-9a-f-]{36}$/i.test(window.APP_CONFIG?.outlookClientId||'');}
function outlookClient(){
  if(!outlookConfigured())throw Error('La connexion Outlook n’est pas encore activée pour Facture Facile.');
  if(!window.FactureMSAL)throw Error('Le service de connexion Outlook n’a pas pu être chargé. Rechargez la page.');
  if(!outlookClientPromise){
    const client=new FactureMSAL.PublicClientApplication({
      auth:{clientId:window.APP_CONFIG.outlookClientId,authority:'https://login.microsoftonline.com/common',redirectUri:new URL('outlook-callback.html',location.href).href},
      cache:{cacheLocation:'memoryStorage'}
    });
    outlookClientPromise=client.initialize().then(()=>client).catch(error=>{outlookClientPromise=null;throw error;});
  }
  return outlookClientPromise;
}
function outlookReset(){outlookConnection=null;}
function outlookSender(){return outlookConnection?.scope===outlookMailScope()?outlookConnection.account.username:'';}
function outlookSessionCheck(scope){if(!scope||scope!==outlookMailScope())throw Error('La session a changé. Rouvrez le document avant de continuer.');}
async function outlookConnect(){
  const scope=outlookMailScope();outlookSessionCheck(scope);
  const client=await outlookClient();
  try{
    const result=await client.acquireTokenPopup({scopes:OUTLOOK_SCOPES,prompt:'select_account'});
    outlookSessionCheck(scope);
    if(!result.account?.username)throw Error('Le compte Microsoft n’a pas pu être identifié.');
    outlookConnection={scope,account:result.account};
    return result.account.username;
  }catch(error){
    if(error.errorCode)throw Error(['user_cancelled','access_denied'].includes(error.errorCode)?'Connexion Outlook annulée. Aucun e-mail envoyé.':'Connexion Outlook impossible. Autorisez la fenêtre Microsoft et réessayez.');
    throw error;
  }
}
function outlookConnectionHTML(){
  if(!outlookConfigured())return '<p class="notice">L’envoi direct par Outlook doit encore être activé par le gestionnaire de Facture Facile.</p>';
  const sender=outlookSender();
  // Prepare the SDK before the user clicks the popup button.
  outlookClient().catch(()=>{});
  return `<div data-outlook-connection><p data-outlook-sender>${sender?'Expéditeur : <strong>'+esc(sender)+'</strong>':'Connectez votre compte Outlook/Hotmail pour envoyer ce document avec son PDF joint.'}</p><button type="button" data-outlook-connect>${sender?'Changer de compte Outlook':'Connecter mon compte Outlook'}</button></div>`;
}
function outlookBindConnection(form){
  const connect=form.querySelector('[data-outlook-connect]');
  if(connect)connect.onclick=async()=>{
    connect.disabled=true;
    try{const sender=await outlookConnect();form.querySelector('[data-outlook-sender]').innerHTML='Expéditeur : <strong>'+esc(sender)+'</strong>';connect.textContent='Changer de compte Outlook';}
    catch(error){featureError(error);}finally{connect.disabled=false;}
  };
}
async function outlookSendDocument(d,values){
  const scope=outlookMailScope();outlookSessionCheck(scope);
  const recipient=String(values.recipient||'').trim(),subject=String(values.subject||'').trim(),body=String(values.body||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)||/[\r\n]/.test(recipient))throw Error('Adresse e-mail invalide.');
  if(!subject||/[\r\n]/.test(subject))throw Error('Objet de l’e-mail invalide.');
  if(!outlookSender())throw Error('Connectez votre compte Outlook avant de cliquer sur Envoyer.');
  const connection=outlookConnection,client=await outlookClient();
  let token;
  try{token=await client.acquireTokenSilent({scopes:OUTLOOK_SCOPES,account:connection.account});}
  catch{throw Error('Reconnectez votre compte Outlook puis cliquez à nouveau sur Envoyer. Aucun e-mail envoyé.');}
  const pdf=await documentPDF(d);outlookSessionCheck(scope);
  if(outlookConnection!==connection)throw Error('Le compte Outlook a changé. Vérifiez l’expéditeur avant de réessayer.');
  if(pdf.size>=3*1024*1024)throw Error('Le PDF dépasse la limite de 3 Mo pour cet envoi. Réduisez le logo ou le contenu du document.');
  const bytes=new Uint8Array(await pdf.arrayBuffer());let binary='';
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  outlookSessionCheck(scope);
  if(outlookConnection!==connection)throw Error('Le compte Outlook a changé. Vérifiez l’expéditeur avant de réessayer.');
  let response;
  try{
    response=await fetch('https://graph.microsoft.com/v1.0/me/sendMail',{
      method:'POST',headers:{Authorization:'Bearer '+token.accessToken,'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),
      body:JSON.stringify({message:{subject,body:{contentType:'Text',content:body},toRecipients:[{emailAddress:{address:recipient}}],attachments:[{'@odata.type':'#microsoft.graph.fileAttachment',name:documentFilename(d)+'.pdf',contentType:'application/pdf',contentBytes:btoa(binary)}]},saveToSentItems:true})
    });
  }catch{throw outlookUncertainError();}
  if(response.status===202)return {recipient,sender:connection.account.username,scope};
  if(response.status>=500||response.ok)throw outlookUncertainError();
  if(response.status===401||response.status===403)throw Error('Microsoft refuse l’envoi. Reconnectez votre compte Outlook et vérifiez l’autorisation d’envoyer des e-mails.');
  if(response.status===429)throw Error('Microsoft limite momentanément les envois. Patientez avant de réessayer.');
  throw Error('Microsoft a refusé cet e-mail. Vérifiez le destinataire et la taille du PDF avant de réessayer.');
}
function outlookUncertainError(){const error=Error('Le résultat de l’envoi est incertain. Vérifiez les éléments envoyés de votre compte Outlook avant toute nouvelle tentative.');error.mailSendUncertain=true;return error;}
