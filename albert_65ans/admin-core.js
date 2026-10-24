(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AlbertAdmin=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const normal=value=>String(value||'').normalize('NFC').replace(/\r\n?/g,'\n').trim();
  const comparable=value=>normal(value).replace(/\s+/g,' ');
  const safePhoto=data=>typeof data==='string'&&/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(data);
  function groupTexts(rows,field,names){
    const groups=new Map();
    for(const row of rows){const text=normal(row.data[field]);if(!text)continue;const key=comparable(text);if(!groups.has(key))groups.set(key,{text,authors:[]});const group=groups.get(key);if(!group.authors.some(a=>a.id===row.person))group.authors.push({id:row.person,name:names[row.person]||'Un proche'});}
    return [...groups.values()];
  }
  function compile(snapshot,sections){
    const people=snapshot.people||[],names=Object.fromEntries(people.map(p=>[p.id,p.name])),active=new Set(people.map(p=>p.id));
    const records=(snapshot.records||[]).filter(r=>active.has(r.person)&&r.data&&!r.data.deleted),byQuestion=new Map();
    for(const row of records)if(row.kind==='question'){if(!byQuestion.has(row.id))byQuestion.set(row.id,[]);byQuestion.get(row.id).push(row);}
    const questions=sections.flatMap((section,si)=>section.questions.map((title,qi)=>{
      const id=`s${si}q${qi}`,rows=byQuestion.get(id)||[];
      return {id,title,number:`${si+1}.${qi+1}`,section:si,sectionTitle:section.title,rows,
        answers:groupTexts(rows,'answer',names),notes:groupTexts(rows,'memory',names),
        photoCount:rows.reduce((n,r)=>n+(r.data.photos||[]).filter(p=>safePhoto(p.data)).length,0)};
    }));
    const questionMap=Object.fromEntries(questions.map(q=>[q.id,q])),gallery=[];
    const scenes=records.filter(r=>r.kind!=='question').map(row=>({...row,author:names[row.person]||'Un proche'}));
    for(const row of records){const question=questionMap[row.id];for(const [position,photo]of (row.data.photos||[]).entries()){
      if(!photo||!safePhoto(photo.data))continue;
      gallery.push({id:`${row.person}/${row.id}/${position}`,photo,person:row.person,author:names[row.person]||'Un proche',
        questionId:question?.id||null,title:question?`${question.number} · ${question.title}`:row.kind==='conversation'?'Conversation : '+(row.data.topic||row.data.who||'avec Albert'):'Anecdote',
        section:question?String(question.section):'extras',context:question?normal(row.data.memory):[row.data.when,row.data.who,row.data.topic,row.data.words].filter(Boolean).join(' · ')});
    }}
    const filled=questions.filter(q=>q.answers.length||q.notes.length||q.photoCount);
    return {people,names,records,questions:filled,allQuestions:questions,scenes,gallery,
      stats:{people:people.length,questions:filled.length,photos:gallery.length,variants:filled.filter(q=>q.answers.length>1).length}};
  }
  function textExport(compilation){
    const lines=['# Les souvenirs d’Albert — réponses regroupées','', 'Les réponses identiques sont réunies. Les versions différentes et leurs auteurs sont conservés.',''];
    let section=null;
    for(const q of compilation.questions){if(section!==q.section){section=q.section;lines.push(`## ${q.sectionTitle}`,'');}lines.push(`### ${q.number} · ${q.title}`,'');if(q.answers.length>1)lines.push('Versions à relire :','');for(const g of q.answers)lines.push(`**${g.authors.map(a=>a.name).join(', ')}**`,g.text,'');for(const g of q.notes)lines.push(`Souvenir / note — ${g.authors.map(a=>a.name).join(', ')}`,g.text,'');if(q.photoCount)lines.push(`Photos jointes : ${q.photoCount}.`,'');}
    if(compilation.scenes.length){lines.push('## Conversations et anecdotes','');for(const s of compilation.scenes){lines.push(`### ${s.kind==='conversation'?'Conversation':'Anecdote'} — ${s.author}`,'');const context=[s.data.when,s.data.who,s.data.topic,s.data.tone].filter(Boolean);if(context.length)lines.push(context.join(' · '),'');lines.push(normal(s.data.words),'');}}
    if(compilation.gallery.length){lines.push('## Index des photos','');for(const p of compilation.gallery)lines.push(`- ${p.photo.name||'Photo'} — ${p.author} — ${p.title}`);}
    return lines.join('\n');
  }
  return {compile,textExport,normal,safePhoto};
});
