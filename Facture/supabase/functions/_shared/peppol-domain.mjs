// Pure domain functions, shared by Edge Functions and Node contract tests.
export function deliveryState(document) {
  const attempts = (document.deliveries || []).filter(d => d.channel === 'peppol');
  if (attempts.some(d => d.status === 'delivered')) return 'delivered';
  if (attempts.some(d => d.status === 'pending')) return 'sent';
  if (attempts.length && attempts.every(d => d.status === 'failed')) return 'failed';
  // An email delivery is never proof of a Peppol delivery.
  if (document.sentOverPeppol === true && document.sentOverEmail !== true) {
    return ({delivered:'delivered',pending:'sent',failed:'failed'})[document.deliveryStatus] || 'sent';
  }
  return 'unknown';
}
export function companyPayload(company, receive = false) {
  const vat = String(company.vat || '').replace(/[.\s-]/g,'').toUpperCase();
  const bce = vat.replace(/^BE/,'');
  if (company.country !== 'BE' || !/^[01]\d{9}$/.test(bce) || 97 - Number(bce.slice(0,8)) % 97 !== Number(bce.slice(8)))
    throw Error('Complétez un numéro BCE/TVA belge valide dans Mon entreprise.');
  for (const field of ['name','street','postal_code','city']) if (!String(company[field] || '').trim())
    throw Error('Complétez le nom et l’adresse structurée dans Mon entreprise.');
  return {name:company.name, address:[company.street,company.house_number,company.box].filter(Boolean).join(' '),
    postalCode:company.postal_code,city:company.city,country:'BE',enterpriseNumber:bce,enterpriseNumberScheme:'0208',vatNumber:vat,
    ...(company.email ? {email:company.email} : {}),isSmpRecipient:receive};
}
export function invoicePayload(document, lines, credit = null, taxTreatment = null) {
  const buyer = document.customer_snapshot || {};
  for (const field of ['name','street','city','postal_code','country','vat','peppol_id'])
    if (!String(buyer[field] || '').trim()) throw Error('Complétez les coordonnées Peppol du client puis actualisez la facture : ' + field);
  if (!/^\d{4}:[^\s]{1,150}$/.test(buyer.peppol_id)) throw Error('Identifiant Peppol du client invalide.');
  if (!lines.length || lines.some(l => !l.name || !Number.isFinite(Number(l.quantity)) || Number(l.quantity)<=0 || !Number.isFinite(Number(l.unit_price)) || Number(l.unit_price)<0))
    throw Error('Les lignes doivent avoir un nom, une quantité positive et un prix valide.');
  if (lines.some(l => ![0,6,12,21].includes(Number(l.vat_rate)))) throw Error('Taux de TVA non pris en charge.');
  const zeroVAT=lines.some(l=>Number(l.vat_rate)===0);
  // The tax treatment must be explicitly chosen, never inferred from a zero rate.
  if(zeroVAT && (!['Z','E','AE','K','G','O'].includes(taxTreatment?.category) ||
    (taxTreatment.category!=='Z'&&!String(taxTreatment.reason||'').trim())))
    throw Error('Choisissez la catégorie fiscale et indiquez le motif applicable aux lignes à 0 % avant transmission.');
  const iban = String(document.issuer_snapshot?.iban || '').replace(/\s/g,'');
  if (!iban) throw Error('Ajoutez l’IBAN dans les coordonnées de la facture.');
  const payload = {recipient:buyer.peppol_id,documentType:credit?'creditNote':'invoice',document:{
    ...(credit ? {creditNoteNumber:credit.number,issueDate:credit.date,note:credit.reason,invoiceReferences:[{id:document.number,issueDate:document.issue_date}]} :
      {invoiceNumber:document.number,issueDate:document.issue_date,dueDate:document.due_date}),
    currency:'EUR',buyer:{name:buyer.name,street:buyer.street,city:buyer.city,postalZone:buyer.postal_code,country:buyer.country.toUpperCase(),vatNumber:buyer.vat.replace(/[.\s-]/g,'')},
    paymentMeans:[{iban}],...(zeroVAT&&taxTreatment.category!=='Z'?{vat:{exemptionReason:String(taxTreatment.reason).trim().slice(0,1000)}}:{}),
    lines:lines.map(l=>({name:l.name,quantity:String(l.quantity),unitCode:'C62',netPriceAmount:Number(l.unit_price).toFixed(2),vat:{category:Number(l.vat_rate)===0?taxTreatment.category:'S',percentage:Number(l.vat_rate).toFixed(2)}}))}};
  return payload;
}
export function summary(document) {
  const p = document.parsed || {}, incoming = document.direction === 'incoming';
  const party = (incoming ? p.seller : p.buyer) || {};
  const amount = Number(p.totals?.taxInclusiveAmount);
  return {direction:document.direction,kind:document.type || 'unknown',number:p.invoiceNumber || p.creditNoteNumber || document.id,
    party_name:party.name || (incoming?document.senderId:document.receiverId) || 'Non renseigné',party_vat:party.vatNumber || '',
    amount:Number.isFinite(amount)&&p.totals?.taxInclusiveAmount!=null?amount:null,currency:p.currency || 'EUR',due_date:p.dueDate || null,
    status:incoming?'received':deliveryState(document),provider_status:document.deliveryStatus || null,
    envelope_id:document.envelopeId || null,provider_created_at:document.createdAt || null,
    failure:(document.deliveries || []).filter(d=>d.channel==='peppol'&&d.failure).map(d=>d.failure),
    parsed:p,validation:document.validation || null};
}
export async function validSignature(raw, signature, secret) {
  if (!secret || !/^sha256=[0-9a-f]{64}$/.test(signature || '')) return false;
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes = Uint8Array.from(signature.slice(7).match(/../g),h=>parseInt(h,16));
  return crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(raw));
}
