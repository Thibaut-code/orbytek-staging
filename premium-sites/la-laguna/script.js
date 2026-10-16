/* A presentation prototype: selections stay in this browser; no orders or bookings are sent. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let language = 'fr';
  let category = 'pasta';
  let galleryIndex = 0;
  let bookingSelection = null;
  let toastTimer;
  const cart = new Map();
  const tr = (fr, nl) => language === 'fr' ? fr : nl;
  const euro = amount => new Intl.NumberFormat(language === 'fr' ? 'fr-BE' : 'nl-BE', {style:'currency',currency:'EUR',maximumFractionDigits:2}).format(amount);
  const icon = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

  // Names, ingredients and restaurant prices transcribed from the official menu.
  const menu = {
    pasta: {title:'La pasta', image:'pasta', caption:'La pasta, una passione.', alt:'Ravioli italiens — visuel d’ambiance', items:[
      ['p1','Ravioli Crema di Formaggio & Tartufo',26,'Ravioli à la crème de fromage et truffe','Ravioli met kaascrème en truffel'],
      ['p2','Ravioli Spinaci & Ricotta',23,'Épinards et ricotta','Spinazie en ricotta'],
      ['p3','Ravioli aux Deux Saumons',25,'Saumon fumé et saumon frais','Gerookte en verse zalm'],
      ['p4','Ravioli di carne Burro & Salvia',25,'Ravioli à la viande, beurre et sauge','Vleesravioli, boter en salie'],
      ['p5','Spaghetti alle Vongole',27,'Spaghetti aux palourdes','Spaghetti met venusschelpen'],
      ['p6','Lasagne al Forno',20,'Bolognaise, gratinées au four','Bolognese, gegratineerd in de oven']
    ]},
    pizza: {title:'Le pizze',image:'pizza',caption:'Una pizza, mille sorrisi.',alt:'Pizza italienne — visuel d’ambiance',items:[
      ['z1','Margherita',15,'Tomate et mozzarella fior di latte','Tomaat en mozzarella fior di latte'],
      ['z2','Diavola',16,'Tomate, mozzarella et salami piquant','Tomaat, mozzarella en pikante salami'],
      ['z3','Tartufata',23.5,'Jambon de Parme, parmesan, roquette et truffe','Parmaham, parmezaan, rucola en truffel'],
      ['z4','Golosa',22,'Burrata, tomates cerises, roquette et jambon San Daniele','Burrata, kerstomaten, rucola en San Daniele-ham'],
      ['z5','Regina',16.5,'Jambon et champignons','Ham en champignons'],
      ['z6','Stella',23,'Bords garnis de ricotta, jambon de Parme, burrata et roquette','Ricottarand, Parmaham, burrata en rucola']
    ]},
    antipasti: {title:'Gli antipasti',image:'antipasti',caption:'Il gusto di cominciare.',alt:'Burrata et tomates — visuel d’ambiance',items:[
      ['a1','Burratina Pugliese',18,'La douceur des Pouilles, pour commencer','De zachtheid van Puglia, om te beginnen'],
      ['a2','Carpaccio di Manzo alla Piemontese',18,'Carpaccio de bœuf à la piémontaise','Rundercarpaccio op Piemontese wijze'],
      ['a3','Vitello Tonnato',19,'Un grand classique italien','Een Italiaanse klassieker'],
      ['a4','Scampi Maison',20,'Crème, tomate, ail et champignons','Room, tomaat, knoflook en champignons'],
      ['a5','Aubergines alla Parmigiana',19,'Les saveurs réconfortantes de l’Italie','De hartverwarmende smaken van Italië'],
      ['a6','Bruschette Classiche Mediterranea',8,'Al pomodoro, à partager à l’apéritif','Al pomodoro, om te delen bij het aperitief']
    ]},
    terre: {title:'Terre & mer',image:'fish',caption:'Tra terra e mare.',alt:'Poissons servis à La Laguna — photo du site officiel',items:[
      ['t1','Osso buco alla Romana',31,'Tomate et petits légumes','Tomaat en fijne groenten'],
      ['t2','Saltimbocca alla Romana',27,'Un classique de la cuisine romaine','Een klassieker uit de Romeinse keuken'],
      ['t3','Tagliata di Filetto Balsamico',36,'Filet pur de bœuf, roquette, parmesan et balsamique','Ossenhaas, rucola, parmezaan en balsamico'],
      ['t4','Côtes d’Agneau alle Erbette',33,'Grillades aux herbes','Gegrild lamsvlees met kruiden'],
      ['t5','Saumon alla Fiorentina',28,'Épinards et crème','Spinazie en room'],
      ['t6','Médaillons de Lotte',30,'Aux poireaux','Met prei']
    ]}
  };
  const allItems = Object.values(menu).flatMap(group=>group.items);
  const findItem = id => allItems.find(item=>item[0] === id);
  const gallery = [
    {src:'lake',fr:'La Laguna, au bord du lac de Genval',nl:'La Laguna, aan het meer van Genval'},
    {src:'terrace',fr:'La terrasse, les pieds au bord de l’eau',nl:'Het terras, direct aan het water'},
    {src:'interior',fr:'Une maison chaleureuse, à l’italienne',nl:'Een warm huis, op zijn Italiaans'},
    {src:'restaurant',fr:'Une escale italienne à Genval',nl:'Een Italiaanse tussenstop in Genval'},
    {src:'autumn',fr:'Le lac, au rythme des saisons',nl:'Het meer, door de seizoenen heen'}
  ];

  function showToast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(()=>$('#toast').classList.remove('visible'),2600);
  }
  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
  }
  function closeDialog(id) { document.getElementById(id).close(); }
  $$('dialog').forEach(dialog=>{
    dialog.addEventListener('close',()=>{
      if (!$$('dialog[open]').length) document.body.classList.remove('modal-open');
    });
    dialog.addEventListener('click',event=>{
      const bounds=dialog.getBoundingClientRect();
      if(event.target===dialog && (event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom))dialog.close();
    });
  });
  $$('[data-close]').forEach(button=>button.addEventListener('click',()=>closeDialog(button.dataset.close)));

  function renderMenu() {
    const group=menu[category];
    $('#menuCategoryTitle').textContent = category==='terre' ? tr('Terre & mer','Land & zee') : group.title;
    $('#menuPhotoCaption').textContent=group.caption;
    const photo=$('#menuImage');
    photo.src=`assets/${group.image}.webp`;
    photo.alt=group.alt;
    $('#menuList').replaceChildren();
    group.items.forEach((item,index)=>{
      const row=document.createElement('article');
      row.className='menu-row';row.style.setProperty('--i',index);
      const description=document.createElement('div');
      const title=document.createElement('h4');title.textContent=item[1];
      const detail=document.createElement('p');detail.textContent=item[language==='fr'?3:4];
      description.append(title,detail);
      const actions=document.createElement('div');actions.className='menu-row-actions';
      const price=document.createElement('span');price.className='menu-price';price.textContent=euro(item[2]);
      const add=document.createElement('button');add.className='add-item';add.textContent='+';
      add.setAttribute('aria-label',tr(`Ajouter ${item[1]} à ma sélection`,`Voeg ${item[1]} toe aan mijn selectie`));
      add.addEventListener('click',()=>{
        cart.set(item[0],(cart.get(item[0])||0)+1);
        updateCartCount();
        showToast(tr(`${item[1]} ajouté à votre sélection`,`${item[1]} toegevoegd aan uw selectie`));
      });
      actions.append(price,add);row.append(description,actions);$('#menuList').append(row);
    });
    $$('.menu-tabs [role=tab]').forEach(tab=>{
      const selected=tab.dataset.category===category;
      tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
    });
    $('#menuPanel').setAttribute('aria-labelledby',`tab-${category}`);
  }
  $$('.menu-tabs [role=tab]').forEach((tab,index,tabs)=>{
    tab.addEventListener('click',()=>{category=tab.dataset.category;renderMenu();});
    tab.addEventListener('keydown',event=>{
      let next=index;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      else return;
      event.preventDefault();category=tabs[next].dataset.category;renderMenu();tabs[next].focus();
    });
  });

  function updateCartCount() {
    const count=[...cart.values()].reduce((sum,quantity)=>sum+quantity,0);
    $$('.cart-count').forEach(badge=>{badge.textContent=count;badge.hidden=count===0;});
    $('.cart-toggle').setAttribute('aria-label',tr(`Voir ma sélection à emporter, ${count} plat${count>1?'s':''}`,`Bekijk mijn afhaalselectie, ${count} gerechten`));
  }
  function renderCart() {
    const list=$('#cartItems');list.replaceChildren();
    if(!cart.size){
      const empty=document.createElement('p');empty.className='cart-empty';empty.textContent=tr('Votre prochaine soirée italienne commence par un petit tour de la carte.','Uw volgende Italiaanse avond begint met een kijkje op de kaart.');list.append(empty);
    }
    let subtotal=0;
    for(const [id,quantity] of cart){
      const item=findItem(id);subtotal+=item[2]*quantity;
      const row=document.createElement('article');row.className='cart-row';
      const top=document.createElement('div');top.className='cart-item-top';
      const name=document.createElement('h3');name.textContent=item[1];
      const price=document.createElement('span');price.textContent=euro(item[2]*quantity);top.append(name,price);
      const bottom=document.createElement('div');bottom.className='cart-item-bottom';
      const control=document.createElement('div');control.className='quantity-control';
      const minus=document.createElement('button');minus.textContent='−';minus.setAttribute('aria-label',tr(`Retirer un ${item[1]}`,`Eén ${item[1]} minder`));
      const value=document.createElement('span');value.textContent=quantity;
      const plus=document.createElement('button');plus.textContent='+';plus.setAttribute('aria-label',tr(`Ajouter un ${item[1]}`,`Eén ${item[1]} meer`));
      function adjust(change){const next=quantity+change;if(next>0)cart.set(id,next);else cart.delete(id);updateCartCount();renderCart();}
      minus.addEventListener('click',()=>adjust(-1));plus.addEventListener('click',()=>adjust(1));control.append(minus,value,plus);
      const remove=document.createElement('button');remove.className='remove-item';remove.textContent=tr('Retirer','Verwijderen');remove.addEventListener('click',()=>{cart.delete(id);updateCartCount();renderCart();});
      bottom.append(control,remove);row.append(top,bottom);list.append(row);
    }
    const discount=Math.round(subtotal*10)/100;
    const total=Math.round((subtotal-discount)*100)/100;
    $('#cartTotals').innerHTML=cart.size?`<div class="cart-totals"><div class="cart-total-line"><span>${tr('Prix à la carte','Kaartprijs')}</span><span>${euro(subtotal)}</span></div><div class="cart-total-line discount"><span>${tr('Avantage à emporter −10 %','Afhaalkorting −10%')}</span><span>−${euro(discount)}</span></div><div class="cart-total-line final"><span>${tr('Votre total indicatif','Uw indicatieve totaal')}</span><span>${euro(total)}</span></div></div>`:'';
  }
  $('.cart-toggle').addEventListener('click',()=>{renderCart();openDialog('cartDialog');});
  function goToMenu(){document.getElementById('carte').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});}
  $('[data-takeaway]').addEventListener('click',()=>{goToMenu();showToast(tr('Ajoutez vos envies avec les boutons + de la carte.','Voeg uw favorieten toe met de + knoppen op de kaart.'));});
  $('#cartAdd').addEventListener('click',()=>{closeDialog('cartDialog');goToMenu();});

  const dateInput=$('#bookingDate');
  const today=new Date();
  const localDate=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  dateInput.min=localDate;dateInput.value=localDate;
  $$('[data-book]').forEach(button=>button.addEventListener('click',()=>{
    $('#bookingForm').hidden=false;$('#bookingSummary').hidden=true;openDialog('bookingDialog');
  }));
  function renderBookingSummary(){
    if(!bookingSelection)return;
    const {date,guests,time}=bookingSelection;
    const formatted=new Intl.DateTimeFormat(language==='fr'?'fr-BE':'nl-BE',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${date}T12:00:00`));
    const summary=$('#bookingSummary');summary.replaceChildren();
    const title=document.createElement('strong');title.textContent=tr('Votre envie d’évasion est prête.','Uw volgende fijne moment is voorbereid.');
    const detail=document.createElement('p');detail.textContent=`${formatted} · ${guests}${guests==='7'?'+':''} ${tr('personne'+(guests==='1'?'':'s'),'perso'+(guests==='1'?'on':'nen'))} · ${time}`;
    const note=document.createElement('p');note.textContent=tr('Finalisez votre choix sur Zenchef pour consulter les disponibilités et recevoir une confirmation.','Rond uw keuze af op Zenchef om de beschikbaarheid te bekijken en een bevestiging te ontvangen.');
    const link=document.createElement('a');link.className='button button-green';link.href='https://bookings.zenchef.com/results?rid=375213&pid=1001&fullscreen=1';link.target='_blank';link.rel='noopener';link.innerHTML=`${tr('Continuer sur Zenchef','Verder op Zenchef')}${icon('diagonal')}`;
    const edit=document.createElement('button');edit.className='text-link';edit.textContent=tr('Modifier ma sélection','Mijn keuze aanpassen');edit.addEventListener('click',()=>{$('#bookingSummary').hidden=true;$('#bookingForm').hidden=false;dateInput.focus();});
    summary.append(title,detail,note,link,edit);summary.hidden=false;
  }
  $('#bookingForm').addEventListener('submit',event=>{
    event.preventDefault();
    if(dateInput.value<dateInput.min){dateInput.setCustomValidity(tr('Choisissez une date à venir.','Kies een toekomstige datum.'));dateInput.reportValidity();return;}
    dateInput.setCustomValidity('');
    bookingSelection={date:dateInput.value,guests:$('#bookingGuests').value,time:$('#bookingTime').value};
    $('#bookingForm').hidden=true;renderBookingSummary();
    $('#bookingSummary a').focus();
  });
  dateInput.addEventListener('input',()=>dateInput.setCustomValidity(''));

  function showGallery(index){
    galleryIndex=(index+gallery.length)%gallery.length;
    const item=gallery[galleryIndex];
    $('#lightboxImage').src=`assets/${item.src}.webp`;$('#lightboxImage').alt=item[language];$('#lightboxCaption').textContent=item[language];$('#lightboxCount').textContent=`0${galleryIndex+1} / 0${gallery.length}`;
  }
  $$('[data-gallery]').forEach(button=>button.addEventListener('click',()=>{showGallery(Number(button.dataset.gallery));openDialog('lightbox');}));
  $('.lightbox-prev').addEventListener('click',()=>showGallery(galleryIndex-1));
  $('.lightbox-next').addEventListener('click',()=>showGallery(galleryIndex+1));
  $('#lightbox').addEventListener('keydown',event=>{
    if(event.key==='ArrowRight'){event.preventDefault();showGallery(galleryIndex+1);}
    if(event.key==='ArrowLeft'){event.preventDefault();showGallery(galleryIndex-1);}
  });
  const galleryTrack=$('#galleryTrack');
  $('#galleryNext').addEventListener('click',()=>galleryTrack.scrollBy({left:galleryTrack.clientWidth*.65,behavior:reduced.matches?'instant':'smooth'}));
  $('#galleryPrev').addEventListener('click',()=>galleryTrack.scrollBy({left:-galleryTrack.clientWidth*.65,behavior:reduced.matches?'instant':'smooth'}));

  // All translations are authored locally; changing language keeps interactions intact.
  $('#heroTitle').dataset.nl='Italië.<br>Het meer.<br><em>La dolce vita.</em>';
  const translated=$$('[data-nl]');translated.forEach(element=>element.dataset.fr=element.innerHTML);
  $('#language').addEventListener('click',()=>{
    language=language==='fr'?'nl':'fr';document.documentElement.lang=language;
    translated.forEach(element=>element.innerHTML=element.dataset[language]);
    $('#language').innerHTML=`${language.toUpperCase()} <span>⌄</span>`;
    $('#language').setAttribute('aria-label',tr('Passer en néerlandais','Naar het Frans schakelen'));
    $$('#bookingGuests option').forEach(option=>{
      const count=Number(option.value);option.textContent=language==='fr'?`${count} personne${count===1?'':'s'}${count===7?' et plus':''}`:`${count} perso${count===1?'on':'nen'}${count===7?' of meer':''}`;
    });
    renderMenu();updateCartCount();renderCart();if(bookingSelection)renderBookingSummary();if($('#lightbox').open)showGallery(galleryIndex);
  });

  const menuToggle=$('#menuToggle');
  function closeNav(){menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label',tr('Ouvrir le menu','Menu openen'));$('#navigation').classList.remove('open');}
  menuToggle.addEventListener('click',()=>{
    const open=$('#navigation').classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',tr(open?'Fermer le menu':'Ouvrir le menu',open?'Menu sluiten':'Menu openen'));
  });
  $$('#navigation a').forEach(link=>link.addEventListener('click',closeNav));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menuToggle.getAttribute('aria-expanded')==='true'){closeNav();menuToggle.focus();}});
  matchMedia('(min-width:801px)').addEventListener('change',event=>{if(event.matches)closeNav();});

  const revealTargets=$$('.reveal,.reveal-image');
  if('IntersectionObserver' in window&&!reduced.matches){
    const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('visible');reveal.unobserve(entry.target);}
    }),{threshold:.08});
    revealTargets.forEach((element,index)=>{element.style.setProperty('--reveal-delay',`${index%3*60}ms`);reveal.observe(element);});
    document.documentElement.classList.add('motion-ready');
    reduced.addEventListener('change',event=>{if(event.matches){reveal.disconnect();revealTargets.forEach(element=>element.classList.add('visible'));}});
  }
  if('IntersectionObserver' in window){
    const sectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting)$$('#navigation a').forEach(link=>link.classList.toggle('active',link.hash===`#${entry.target.id}`));
    }),{rootMargin:'-20% 0px -60% 0px'});
    $$('main section[id]').forEach(section=>sectionObserver.observe(section));
  }
  let scheduled=false;
  function updateScroll(){
    const y=scrollY;const range=document.documentElement.scrollHeight-innerHeight;
    $('#header').style.setProperty('--progress',range>0?y/range:0);
    $('#header').classList.toggle('scrolled',y>10);
    $('.mobile-reserve').classList.toggle('visible',y>600);
    if(!reduced.matches&&y<1200)$('.hero-image').style.setProperty('--parallax',`${Math.min(y*.045,35)}px`);
    scheduled=false;
  }
  addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateScroll);}},{passive:true});
  addEventListener('resize',updateScroll);
  renderMenu();updateCartCount();updateScroll();
})();
