const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const app=readFileSync('app.js','utf8');
const context=vm.createContext({TextEncoder,Blob,Uint8Array,crypto:webcrypto,btoa:s=>Buffer.from(s,'binary').toString('base64')});
vm.runInContext(app.slice(app.indexOf('function base64UTF8('),app.indexOf('function sendDocument(')),context);
async function main(){
 const uri=context.documentMailto(' client+facture@example.com ','Facture été & acompte','Bonjour,\n\nTotal : 100 €\nMerci');
 assert.equal(decodeURIComponent(uri.split('?')[0].slice(7)),'client+facture@example.com');
 const params=new URLSearchParams(uri.split('?')[1]);
 assert.equal(params.get('subject'),'Facture été & acompte');
 assert.equal(params.get('body'),'Bonjour,\r\n\r\nTotal : 100 €\r\nMerci');
 assert.throws(()=>context.documentMailto('client@example.com\r\nBcc: autre@example.com','Objet','Texte'));
 const blob=await vm.runInContext(`emailDraftBlob(new Blob(['pdf-test']),'facture.pdf','client@example.com','Facture été','Bonjour')`,context);
 const text=await blob.text();
 assert.match(text,/To: client@example.com\r\n/);
 assert.match(text,/Content-Disposition: attachment; filename="facture.pdf"/);
 assert.match(text,/cGRmLXRlc3Q=/);
 assert.ok(!/^X-Unsent:/m.test(text));
 const senderDraft=await vm.runInContext(`emailDraftBlob(new Blob(['pdf-test']),'facture.pdf','client@example.com','Facture été','Bonjour','thibaut@example.com')`,context);
 assert.match(await senderDraft.text(),/^From: thibaut@example.com\r\n/);
 await assert.rejects(vm.runInContext(`emailDraftBlob(new Blob(['pdf-test']),'facture.pdf','client@example.com','Facture été','Bonjour','sender\\r\\nBcc: autre@example.com')`,context));
 assert.ok(!app.includes('id="download-document-pdf"'));
 assert.ok(!app.includes('id="download-email"'));
 assert.ok(!app.includes('navigator.share({files:[file],title:subject,text:body})'));
 console.log('E-mail : destinataire, accents, caractères spéciaux, retours de ligne et pièce jointe EML vérifiés.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
