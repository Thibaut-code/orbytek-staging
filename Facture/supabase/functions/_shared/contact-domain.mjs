export const PROJECTS=['Site web','Application web','API / intégration','Support IT','Autre'];
export class ContactError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export function validateContact(input,origin){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ContactError('Demande invalide.');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id||''))throw new ContactError('Référence invalide.');
 const text=(key,max,required=false)=>{const v=input[key];if(typeof v!=='string'||v.length>max||(required&&!v.trim())||v.includes('\0'))throw new ContactError('Vérifiez les champs du formulaire.');return v.trim();};
 const data={name:text('name',120,true),email:text('email',254,true).toLowerCase(),phone:text('phone',80),company:text('company',160),project:text('project',40,true),message:text('message',5000,true),origin};
 if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)||/[\r\n]/.test(data.email)||!PROJECTS.includes(data.project))throw new ContactError('Vérifiez votre adresse e-mail et le type de projet.');
 return {id:input.id,data};
}
export function emailPayload(row,from,to){
 return {from,to:[to],reply_to:row.email,subject:'Nouvelle demande depuis Orbytek',text:[
  'Nouvelle demande Orbytek',`Référence : ${row.id}`,`Nom : ${row.name}`,`E-mail : ${row.email}`,
  `Téléphone : ${row.phone||'Non renseigné'}`,`Société : ${row.company||'Non renseignée'}`,
  `Projet : ${row.project}`,'',row.message,'',`Origine : ${row.origin}`
 ].join('\n')};
}
export function retryable(status){return status===408||status===409||status===429||status>=500;}
export async function readBody(req,max=20000){
 if(Number(req.headers.get('content-length'))>max)throw new ContactError('Message trop long.',413);
 const reader=req.body?.getReader();if(!reader)throw new ContactError('Demande vide.');
 let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new ContactError('Message trop long.',413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 return new TextDecoder().decode(bytes);
}
export async function hmac(secret,text){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function verifyWebhook(secret,headers,body,now=Date.now()){
 const id=headers.get('svix-id'),stamp=headers.get('svix-timestamp'),signatures=headers.get('svix-signature');
 if(!id||!stamp||!signatures||!/^\d+$/.test(stamp)||Math.abs(now/1000-Number(stamp))>300)return false;
 try{
  const raw=Uint8Array.from(atob(secret.replace(/^whsec_/,'')),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const data=new TextEncoder().encode(`${id}.${stamp}.${body}`);
  for(const signature of signatures.split(' ')){
   const [version,value]=signature.split(',');if(version!=='v1'||!value)continue;
   if(await crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(value),c=>c.charCodeAt(0)),data))return true;
  }
 }catch{}return false;
}
