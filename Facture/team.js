// Shared company scope is resolved and enforced by Supabase, never by a form field.
let teamContext = null;
function companyOwner(fallback = account?.id) { return teamContext?.owner_id || fallback; }
function employeeName() { return teamContext?.display_name || account?.user_metadata?.full_name || account?.email?.split('@')[0] || 'Mon compte'; }
function updateAccountIdentity() {
  const name=employeeName();
  $('#accountname').textContent=name;
  const avatar=$('#accountavatar');
  if(avatar) avatar.textContent=account ? Array.from(name.trim())[0]?.toLocaleUpperCase('fr-BE') || '?' : '?';
}
async function resolveTeam(userId, generation) {
  if (!db?.rpc) return; // Legacy installations and isolated previews.
  const {data,error} = await db.rpc('company_context');
  if(account?.id !== userId || (generation !== undefined && generation !== sessionGeneration)) return;
  if(error) {
    if(['PGRST202','42883'].includes(error.code)) { teamContext=null; return; }
    throw error;
  }
  teamContext=data;
}
function teamSettings() {
  if (!teamContext) return '<section class="panel team-settings"><h2>Équipe de l’entreprise</h2><p>Pour activer les comptes employés, exécutez la migration Supabase <strong>20261002_team.sql</strong>.</p></section>';
  return `<section class="panel team-settings"><h2>Équipe de ${esc(company.name || 'mon entreprise')}</h2><p>Chaque employé se connecte avec son propre compte. Les clients, documents et prestations sont partagés.</p><label class="field">Mon nom dans l’équipe<input id="employee-name" value="${esc(employeeName())}" maxlength="100"></label><button type="button" onclick="saveEmployeeName()">Enregistrer mon nom</button>${teamContext.role==='owner'?'<button type="button" onclick="openTeam()">Gérer les employés et les invitations</button>':''}<details><summary>Rejoindre une autre société</summary><p>Utilisez le lien ou le code reçu du responsable. Votre espace personnel reste conservé.</p><label class="field">Code d’invitation<input id="company-invite-code" autocomplete="off"></label><button type="button" onclick="joinCompany()">Rejoindre la société</button></details></section>`;
}
async function saveEmployeeName() {
  const name=$('#employee-name').value.trim(); if(!name) return toast('Indiquez votre nom.');
  try {const {error}=await db.rpc('set_employee_name',{employee_name:name});if(error)throw error;teamContext.display_name=name;updateAccountIdentity();toast('Votre nom est enregistré.');}catch(error){showError(error);}
}
async function openTeam() {
  try {
    const {data,error}=await db.rpc('list_company_team'); if(error)throw error;
    featureDialog('Employés et invitations',`<p>Invitez uniquement les personnes autorisées à consulter et gérer les données de cette société.</p><ul class="team-list">${(data||[]).map(m=>`<li><strong>${esc(m.display_name || 'Employé')}</strong><span>${m.role==='owner'?'Responsable':'Employé'}</span>${m.role!=='owner'?`<button onclick="removeEmployee('${m.member_id}')">Retirer l’accès</button>`:''}</li>`).join('')}</ul><form id="invite-employee"><label class="field">Adresse e-mail de l’employé<input name="email" type="email" required></label><button class="primary">Créer une invitation</button></form><div id="invite-result" aria-live="polite"></div><p class="muted">L’invitation expire après sept jours. Transmettez le lien à l’employé : aucun e-mail n’est envoyé automatiquement.</p>`);
    $('#invite-employee').onsubmit=async event=>{
      event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
      try {const {data,error}=await db.rpc('invite_company_employee',{employee_email:event.target.elements.email.value.trim()});if(error)throw error;const link=new URL(location.href);link.hash='join/'+data;$('#invite-result').innerHTML=`<label class="field">Lien d’invitation<input readonly value="${esc(link.href)}"></label><p>Copiez ce lien et transmettez-le à l’employé.</p>`;}catch(error){showError(error);}finally{button.disabled=false;}
    };
  } catch(error){showError(error);}
}
async function removeEmployee(memberId) {
  if(!confirm('Retirer l’accès de cet employé aux données de la société ?'))return;
  const {error}=await db.rpc('remove_company_employee',{employee_id:memberId});if(error)return showError(error);$('#feature-dialog').close();openTeam();
}
async function joinCompany(token) {
  const code=token || $('#company-invite-code')?.value.trim(); if(!code)return toast('Indiquez le code d’invitation.');
  if(!confirm('Rejoindre cette société et travailler dans son espace partagé ?'))return;
  try {const {error}=await db.rpc('join_company',{invitation_token:code});if(error)throw error;teamContext=null;dataState='loading';sessionGeneration++;await loadData();go('home');toast('Vous avez rejoint la société.');}catch(error){showError(error);}
}
function invitationView(code) {
  return `${intro('Rejoindre une société','Connectez-vous avec l’adresse e-mail destinataire de l’invitation.')}<section class="panel"><p>Votre compte personnel sera associé à l’équipe après votre confirmation.</p><button class="primary" onclick="joinCompany('${esc(code)}')">Accepter l’invitation</button><a class="link" href="#home">Retour à l’accueil</a></section>`;
}
function searchField(label='Rechercher par client ou référence') {return `<label class="list-search">${uiIcon('search')}<input type="search" placeholder="${label}" aria-label="${label}" oninput="filterVisibleList(this)"></label><p class="search-empty" hidden>Aucun résultat pour cette recherche.</p>`;}
function searchText(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();}
function filterVisibleList(input){
  const root=input.closest('[data-search-scope]') || $('#main'),q=searchText(input.value);let shown=0;
  root.querySelectorAll('[data-search-key]').forEach(row=>{const match=searchText(row.dataset.searchKey).includes(q);row.hidden=!match;if(match)shown++;});
  const empty=root.querySelector('.search-empty');if(empty)empty.hidden=shown>0||!q;
}
function invoiceAddress(biz) {
  const address=String(biz.address||''); const lines=address.split(/\r?\n/);
  if(lines.length && /^[A-Za-z]{2}$/.test(lines.at(-1).trim())) lines.pop();
  return esc(lines.join('\n'));
}
