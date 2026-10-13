/* Native canvas globe: no external scripts or network requests. */
(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.getElementById('planet-canvas');
  const toggle = document.querySelector('.motion-toggle');
  const hotspots = [...document.querySelectorAll('.planet-hotspot')].map(element => ({
    element,
    label: element.querySelector('.planet-hotspot-label'),
    latitude: Number(element.dataset.latitude),
    longitude: Number(element.dataset.longitude),
    hovered: false,
    focused: false,
    labelSide: 1
  }));
  hotspots.forEach(hotspot => {
    hotspot.element.addEventListener('pointerenter',()=>{hotspot.hovered=true;});
    hotspot.element.addEventListener('pointerleave',()=>{hotspot.hovered=false;});
    hotspot.element.addEventListener('focus',()=>{hotspot.focused=true;});
    hotspot.element.addEventListener('blur',()=>{hotspot.focused=false;});
  });
  let paused = motion.matches;
  let inView = true;
  let frame = 0;
  let previous = 0;
  let rotation = -.4;
  let width = 0, height = 0;
  let paints = null;
  const ctx = canvas?.getContext('2d');
  const stars = Array.from({length:65},(_,i)=>({x:((i*137.508)%100)/100,y:((i*73.29)%100)/100,r:i%5===0?1.15:.55}));
  // Stylised continent outlines used only to place decorative surface lights.
  const continents = [
    [[-168,68],[-136,71],[-120,58],[-96,52],[-61,52],[-78,27],[-96,16],[-115,30],[-132,52]],
    [[-80,12],[-57,6],[-35,-7],[-46,-27],[-68,-55],[-78,-28]],
    [[-17,35],[10,37],[34,30],[51,12],[40,-16],[18,-35],[6,-4],[-15,10]],
    [[-10,36],[-9,60],[25,71],[43,54],[29,37]],
    [[30,55],[60,73],[140,65],[170,51],[130,32],[106,1],[77,8],[57,30]],
    [[112,-12],[136,-10],[153,-25],[144,-39],[115,-34]],
    [[-52,60],[-22,73],[-38,82],[-65,76]]
  ];
  function inside(x,y,poly) {
    let hit=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
      const [a,b]=poly[i], [c,d]=poly[j];
      if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
    }
    return hit;
  }
  const dots=[];
  for(let lat=-72;lat<=78;lat+=3.5)for(let lon=-180;lon<180;lon+=3.5/Math.max(.25,Math.cos(lat*Math.PI/180))) {
    if(continents.some(p=>inside(lon,lat,p)))dots.push([lat*Math.PI/180,lon*Math.PI/180]);
  }
  // Geometry is fixed; only the longitude rotation changes between frames.
  const vertex = (lat,lon) => ({x:Math.cos(lat)*Math.sin(lon),y:-Math.sin(lat),z:Math.cos(lat)*Math.cos(lon)});
  const surfaceDots = dots.map(([lat,lon])=>vertex(lat,lon));
  const grid = [];
  for(let lat=-60;lat<=60;lat+=20)grid.push(Array.from({length:181},(_,i)=>vertex(lat*Math.PI/180,i*Math.PI/90)));
  for(let lon=0;lon<360;lon+=20)grid.push(Array.from({length:91},(_,i)=>vertex((i-45)*Math.PI/90,lon*Math.PI/180)));
  const connectionNodes = [[.88,.04],[.6,-1.2],[.44,1.35],[-.42,.48],[.22,-.3]].map(([lat,lon])=>vertex(lat,lon));
  hotspots.forEach(hotspot=>{hotspot.vertex=vertex(hotspot.latitude,hotspot.longitude);});
  const tilt = -.19, cosTilt = Math.cos(tilt), sinTilt = Math.sin(tilt);
  function draw() {
    if(!ctx||!width)return;
    // A light globe palette follows the site switch; dark colours stay unchanged.
    const light=document.documentElement.dataset.appearance==='light';
    const shade=(dark,day)=>light?day:dark;
    ctx.clearRect(0,0,width,height);
    const cx=width*.5,cy=height*.47,r=Math.min(width*.32,height*.37);
    for(const s of stars) { ctx.fillStyle=shade('rgba(232,201,165,.42)','rgba(25,102,169,.35)'); ctx.beginPath();ctx.arc(s.x*width,s.y*height,s.r,0,Math.PI*2);ctx.fill(); }
    if(!paints||paints.light!==light) {
      const halo=ctx.createRadialGradient(cx,cy,r*.65,cx,cy,r*1.55);
      halo.addColorStop(0,shade('#d69b5c12','#009ae212'));halo.addColorStop(.6,shade('#d69b5c14','#009ae222'));halo.addColorStop(1,shade('#d69b5c00','#009ae200'));
      const sphere=ctx.createRadialGradient(cx-r*.42,cy-r*.45,0,cx,cy,r);
      sphere.addColorStop(0,shade('#534437','#6ccfe0'));sphere.addColorStop(.42,shade('#252725','#2375b8'));sphere.addColorStop(.83,shade('#101919','#163d72'));sphere.addColorStop(1,shade('#050a0b','#10274c'));
      paints={light,halo,sphere};
    }
    ctx.fillStyle=paints.halo;ctx.fillRect(0,0,width,height);
    const cosRotation=Math.cos(rotation),sinRotation=Math.sin(rotation);
    const project=point=>{const x=point.x*cosRotation+point.z*sinRotation,z=point.z*cosRotation-point.x*sinRotation;return {x:cx+r*(x*cosTilt-point.y*sinTilt),y:cy+r*(x*sinTilt+point.y*cosTilt),z};};
    function orbit(front) {
      ctx.save();ctx.translate(cx,cy);ctx.rotate(-.35);
      ctx.beginPath();ctx.ellipse(0,0,r*1.42,r*.36,0,front?0:Math.PI,front?Math.PI:Math.PI*2);
      ctx.strokeStyle=front?shade('#e8b77b99','#006da9aa'):shade('#c3956255','#7052c666');ctx.lineWidth=front?1.15:.7;ctx.stroke();ctx.restore();
    }
    orbit(false);
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=paints.sphere;ctx.fill();ctx.strokeStyle='#d5aa7877';ctx.lineWidth=1;ctx.stroke();
    function line(points) {ctx.beginPath();let started=false;for(const point of points){const p=project(point);if(p.z<=0){started=false;continue;}if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);}ctx.stroke();}
    ctx.strokeStyle=shade('#d3b07c28','#a4e7ff55');ctx.lineWidth=.65;
    grid.forEach(line);
    for(const point of surfaceDots){const p=project(point);if(p.z<0)continue;ctx.fillStyle=`rgba(${light?'193,239,255':'229,184,125'},${.2+p.z*.65})`;ctx.beginPath();ctx.arc(p.x,p.y,.7+p.z*.65,0,Math.PI*2);ctx.fill();}
    const visible=connectionNodes.map(project).filter(p=>p.z>0);
    ctx.strokeStyle='#f2c48788';ctx.lineWidth=.8;
    for(let i=1;i<visible.length;i++){const p=visible[0],q=visible[i];ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+q.x)/2,(p.y+q.y)/2-r*.2,q.x,q.y);ctx.stroke();}
    for(const p of visible){ctx.shadowBlur=14;ctx.shadowColor='#ffd7a1';ctx.fillStyle='#ffe3b9';ctx.beginPath();ctx.arc(p.x,p.y,2.3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    orbit(true);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.35);
    const a=-.72+(rotation+.4)*.9;ctx.shadowBlur=18;ctx.shadowColor='#efc69a';ctx.fillStyle='#ffe7c7';ctx.beginPath();ctx.arc(Math.cos(a)*r*1.42,Math.sin(a)*r*.36,3,0,Math.PI*2);ctx.fill();ctx.restore();
    hotspots.forEach(hotspot => {
      const {element,label} = hotspot;
      const point = project(hotspot.vertex);
      const hidden = point.z <= 0;
      if(element.hidden!==hidden)element.hidden=hidden;
      if (element.hidden) return;
      element.style.transform = `translate3d(${point.x-22}px,${point.y-22}px,0)`;
      const labelWidth = 180;
      // Keep the label inside the scene, even when a point reaches the limb.
      if(!hotspot.hovered&&!hotspot.focused)hotspot.labelSide=point.x<cx?-1:1;
      let labelX = hotspot.labelSide<0 ? point.x - labelWidth - 30 : point.x + 30;
      labelX = Math.max(8,Math.min(width-labelWidth-8,labelX));
      const labelY = Math.max(8,Math.min(height-88,point.y-34));
      if(label)label.style.transform = `translate3d(${labelX-point.x+22}px,${labelY-point.y+22}px,0)`;
    });
  }
  function animate(now) { frame=0;if(paused||!inView||document.hidden)return; if(!previous)previous=now;rotation+=Math.min(now-previous,50)*.000169;previous=now;draw();frame=requestAnimationFrame(animate); }
  function sync() {
    cancelAnimationFrame(frame);frame=0;previous=0;
    document.documentElement.classList.toggle('motion-paused',paused);
    if(toggle){toggle.hidden=false;toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=paused?'Activer les animations':'Mettre les animations en pause';}
    if(paused)document.querySelectorAll('.is-pending').forEach(el=>el.classList.remove('is-pending'));
    if(ctx&&!paused&&inView&&!document.hidden)frame=requestAnimationFrame(animate);
  }
  if(ctx) {
    function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);paints=null;draw();canvas.parentElement.classList.add('canvas-ready');}
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:.05}).observe(canvas);
    resize();
  }
  document.addEventListener('visibilitychange',sync);
  toggle?.addEventListener('click',()=>{paused=!paused;sync();});
  document.addEventListener('appearancechange',draw);
  motion.addEventListener('change',()=>{paused=motion.matches;sync();});
  if(!motion.matches&&'IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('is-pending');observer.unobserve(entry.target);}}),{threshold:.08});
    document.querySelectorAll('.card,.price-card,.support-banner,.about-copy,.step,.page-cta,.portfolio-empty').forEach(el=>{el.classList.add('reveal','is-pending');observer.observe(el);});
  }
  sync();
})();
