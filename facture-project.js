(() => {
 const dialog=document.querySelector('.ff-lightbox'); if(!dialog)return;
 let opener;
 document.querySelectorAll('[data-zoom]').forEach(link=>link.addEventListener('click',e=>{
  if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||!dialog.showModal)return;
  e.preventDefault();opener=link;
  const img=dialog.querySelector('img');img.src=link.href;img.alt=link.querySelector('img').alt;
  document.getElementById('ff-lightbox-caption').textContent=link.dataset.caption;dialog.showModal();
 }));
 dialog.querySelector('button').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
 dialog.addEventListener('close',()=>opener?.focus());
})();
