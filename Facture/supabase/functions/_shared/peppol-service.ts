import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { summary } from './peppol-domain.mjs';
export const env = (name: string) => Deno.env.get(name) || '';
export const adminClient = () => createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'));
export function checked(result: any) { if (result.error) throw Error(result.error.message); return result.data; }
export function configuration(owner: string) {
  const legacy = JSON.parse(env('INTEGRATION_ACCOUNTS') || '{}')[owner];
  const c = legacy || {recommandKey:env('RECOMMAND_KEY'),recommandSecret:env('RECOMMAND_SECRET'),peppolEnvironment:env('RECOMMAND_ENVIRONMENT') || 'test'};
  if (!c.recommandKey || !c.recommandSecret) throw Error('L’accès Peppol de cette entreprise n’est pas configuré. Contactez le responsable.');
  if (!['test','playground','production'].includes(c.peppolEnvironment)) throw Error('Environnement Peppol non configuré.');
  return {...c,mode:c.peppolEnvironment==='production'?'production':'playground',companyId:c.peppolEnvironment==='production'?c.companyId:c.testCompanyId};
}
export class ProviderError extends Error {
  status: number;
  constructor(status: number, detail: string) { super(`Recommand (${status}) : ${detail}`); this.status=status; }
}
export async function provider(config: any, path: string, method = 'GET', body?: unknown, binary = false): Promise<any> {
  const response = await fetch('https://app.recommand.eu/api/v1'+path,{
    method,headers:{Authorization:'Basic '+btoa(config.recommandKey+':'+config.recommandSecret),'Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(25000),redirect:'error'});
  if (binary && response.ok) return new Uint8Array(await response.arrayBuffer());
  const raw = await response.text();
  let result; try { result=JSON.parse(raw); } catch { throw new ProviderError(response.status,'Réponse illisible ; vérifiez le statut avant de réessayer.'); }
  if (!response.ok || result.success===false) throw new ProviderError(response.status,JSON.stringify(result.errors || result.error || result.message || 'Demande refusée').slice(0,4000));
  return result;
}
export async function digest(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
}
export const webhookSecret = (config: any, companyId: string) => digest(config.recommandSecret+':facture-facile-webhook-v1:'+companyId);
export async function actorScope(admin: any, request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if (!token) throw Error('Connexion requise.');
  const auth = await admin.auth.getUser(token);
  if (auth.error || !auth.data.user) throw Error('Session invalide.');
  const actor = auth.data.user.id;
  const member = checked(await admin.from('company_members').select('owner_id,role').eq('member_id',actor).maybeSingle());
  return {actor,owner:member?.owner_id || actor,isOwner:!member || member.role==='owner'};
}
export async function companyRecord(admin: any, owner: string, config: any) {
  let row = checked(await admin.from('peppol_companies').select('*').eq('user_id',owner).eq('environment',config.mode).maybeSingle());
  if (!row) {
    const inserted = await admin.from('peppol_companies').upsert({user_id:owner,environment:config.mode,provider_id:config.companyId || null},{onConflict:'user_id,environment',ignoreDuplicates:true});
    checked(inserted);
    row = checked(await admin.from('peppol_companies').select('*').eq('user_id',owner).eq('environment',config.mode).single());
  }
  return row;
}
export async function refreshCompany(admin: any, row: any, config: any) {
  if (!row.provider_id) return row;
  const response = await provider(config,'/companies/'+encodeURIComponent(row.provider_id));
  const c = response.company;
  if (!c || c.id!==row.provider_id) throw Error('Réponse entreprise incohérente.');
  const patch = {team_id:c.teamId,verified:c.isVerified===true,reception_enabled:c.isVerified===true&&c.isSmpRecipient===true,
    state:c.isVerified?'active':'verification',peppol_id:c.enterpriseNumber?'0208:'+c.enterpriseNumber:null,updated_at:new Date().toISOString(),error:null};
  return checked(await admin.from('peppol_companies').update(patch).eq('user_id',row.user_id).eq('environment',row.environment).select().single());
}
export async function archiveFile(admin: any, row: any, extension: string, bytes: any) {
  const path = `${row.user_id}/${row.environment}/${row.id}.${extension}`;
  checked(await admin.storage.from('peppol-archive').upload(path,bytes,{contentType:extension==='xml'?'application/xml':'application/pdf',upsert:true}));
  checked(await admin.from('peppol_documents').update({[extension+'_path']:path}).eq('id',row.id));
  return path;
}
export async function storeDocument(admin: any, config: any, company: any, document: any) {
  if (document.companyId!==company.provider_id || (company.team_id && document.teamId!==company.team_id)) throw Error('Document extérieur à cette entreprise.');
  if (!['incoming','outgoing'].includes(document.direction) || !document.id) throw Error('Document fournisseur invalide.');
  const fields = summary(document);
  let row = checked(await admin.from('peppol_documents').select('*').eq('environment',config.mode).eq('provider_id',document.id).maybeSingle());
  if (row && row.user_id!==company.user_id) throw Error('Document extérieur à cette entreprise.');
  if (!row && document.direction==='outgoing') {
    // Reconcile a timed-out send by its immutable business number, never by an arbitrary browser ID.
    row = checked(await admin.from('peppol_documents').select('*').eq('user_id',company.user_id).eq('environment',config.mode).eq('direction','outgoing').eq('kind',fields.kind).eq('number',fields.number).maybeSingle());
    if (row?.provider_id && row.provider_id!==document.id) throw Error('Numéro dupliqué chez le fournisseur : vérification nécessaire.');
  }
  const patch:any = {...fields,user_id:company.user_id,environment:config.mode,provider_id:document.id,updated_at:new Date().toISOString()};
  if (row?.status==='delivered') patch.status='delivered';
  row = checked(await (row ? admin.from('peppol_documents').update(patch).eq('id',row.id) : admin.from('peppol_documents').insert(patch)).select().single());
  if (row.source_id && row.kind==='invoice') checked(await admin.from('documents').update({peppol:{mode:config.mode,moduleId:row.id,status:row.status}}).eq('id',row.source_id).eq('user_id',company.user_id));
  try {
    if (!row.xml_path && document.xml) row.xml_path = await archiveFile(admin,row,'xml',new TextEncoder().encode(document.xml));
    if (!row.pdf_path && ['invoice','creditNote'].includes(row.kind)) row.pdf_path = await archiveFile(admin,row,'pdf',await provider(config,'/documents/'+encodeURIComponent(document.id)+'/render/pdf','GET',undefined,true));
    checked(await admin.from('peppol_documents').update({archive_error:null}).eq('id',row.id));
  } catch(error) {
    checked(await admin.from('peppol_documents').update({archive_error:error instanceof Error?error.message:'Archivage à réessayer'}).eq('id',row.id));
  }
  // A message-level response is displayed separately; it never marks an invoice as paid.
  if (row.kind==='messageLevelResponse' && document.parsed?.envelopeId && ['AB','IP','UQ','CA','RE','AP','PD'].includes(document.parsed.responseCode)) {
    checked(await admin.from('peppol_documents').update({business_response:document.parsed.responseCode}).eq('user_id',company.user_id).eq('environment',config.mode).eq('direction','outgoing').eq('envelope_id',document.parsed.envelopeId));
  }
  // Acknowledge consumption only after a durable XML archive; local unread state remains separate.
  if (row.direction==='incoming' && row.xml_path && !document.readAt) await provider(config,'/documents/'+encodeURIComponent(document.id)+'/mark-as-read','POST',{read:true});
  return row;
}
export async function syncOne(admin: any, config: any, company: any, id: string) {
  const response = await provider(config,'/documents/'+encodeURIComponent(id));
  return storeDocument(admin,config,company,response.document);
}
export async function ensureWebhook(config: any, company: any) {
  const url = env('SUPABASE_URL')+'/functions/v1/peppol-webhook';
  const list = await provider(config,'/webhooks');
  const existing = (list.webhooks || []).find((w:any)=>w.companyId===company.provider_id&&w.url===url);
  const body = {url,companyId:company.provider_id,secret:await webhookSecret(config,company.provider_id)};
  return provider(config,'/webhooks'+(existing?'/'+encodeURIComponent(existing.id):''),existing?'PUT':'POST',body);
}
