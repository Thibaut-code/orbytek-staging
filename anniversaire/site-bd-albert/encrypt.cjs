const fs=require('fs'), path=require('path'), crypto=require('crypto');
const base=__dirname, out=path.join(base,'publication'), tmp=path.join(base,'temporary');
let password=''; process.stdin.setEncoding('utf8'); process.stdin.on('data',x=>password+=x);
process.stdin.on('end',()=>{
 password=password.trim(); if(!password)throw Error('Mot de passe requis sur stdin');
 const salt=crypto.randomBytes(16), iterations=600000;
 const key=crypto.pbkdf2Sync(password,salt,iterations,32,'sha256');
 function encrypt(data){const iv=crypto.randomBytes(12), c=crypto.createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([iv,c.update(data),c.final(),c.getAuthTag()]);}
 const pages=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));
 for(const page of pages){fs.writeFileSync(path.join(out,'assets',page.file+'.bin'),encrypt(fs.readFileSync(path.join(tmp,page.file))));}
 fs.writeFileSync(path.join(out,'assets','catalog.bin'),encrypt(Buffer.from(JSON.stringify(pages))));
 const pdf=path.join(tmp,'album-web.pdf');
 fs.writeFileSync(path.join(out,'assets','album.bin'),encrypt(fs.readFileSync(pdf)));
 fs.writeFileSync(path.join(out,'config.js'),`window.ALBUM_CONFIG=${JSON.stringify({salt:salt.toString('base64'),iterations})};\n`);
 // Verify every encrypted asset, and reject an incorrect password.
 for(const file of fs.readdirSync(path.join(out,'assets'))){const b=fs.readFileSync(path.join(out,'assets',file));const d=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(-16));Buffer.concat([d.update(b.subarray(12,-16)),d.final()]);}
 const b=fs.readFileSync(path.join(out,'assets','catalog.bin'));let rejected=false;
 try{const d=crypto.createDecipheriv('aes-256-gcm',crypto.pbkdf2Sync('incorrect',salt,iterations,32,'sha256'),b.subarray(0,12));d.setAuthTag(b.subarray(-16));d.update(b.subarray(12,-16));d.final();}catch{rejected=true;}
 if(!rejected)throw Error('Échec de protection');
 console.log(`${pages.length} pages et PDF chiffrés ; déchiffrement vérifié ; mauvais mot de passe refusé.`);
});
