/* A small kinetic sculpture of a convex feasible region. No external dependencies. */
(() => {
  'use strict';
  const canvas = document.getElementById('hero-sculpture-canvas');
  if (!canvas) return;
  const hero = canvas.closest('.hero-playful');
  const context = canvas.getContext('2d');
  if (!hero || !context) return;
  const host = canvas.parentElement;
  const toggle = hero.querySelector('.hero-motion-toggle');
  const label = toggle.querySelector('.motion-label');
  const glyph = toggle.querySelector('.motion-glyph');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const normalize = a => { const n = Math.hypot(...a); return a.map(v => v / n); };
  const sub = (a, b) => a.map((v, i) => v - b[i]);

  // Intersection of a cube with two additional linear constraints.
  const planes = [
    { n: [1,0,0], b: 1 }, { n: [-1,0,0], b: 1 },
    { n: [0,1,0], b: 1 }, { n: [0,-1,0], b: 1 },
    { n: [0,0,1], b: 1 }, { n: [0,0,-1], b: 1 },
    { n: [1,1,1], b: 1.35 }, { n: [-1,.4,1], b: 1.35 },
    { n: [-1,-1,-1], b: 1.6 }, { n: [1,-1,.2], b: 1.35 }
  ];
  const vertices = [];
  for (let a = 0; a < planes.length; a++) {
    for (let b = a + 1; b < planes.length; b++) {
      for (let c = b + 1; c < planes.length; c++) {
        const pa = planes[a], pb = planes[b], pc = planes[c];
        const determinant = dot(pa.n, cross(pb.n, pc.n));
        if (Math.abs(determinant) < 1e-8) continue;
        const bc = cross(pb.n, pc.n), ca = cross(pc.n, pa.n), ab = cross(pa.n, pb.n);
        const vertex = [0,1,2].map(i => (pa.b*bc[i] + pb.b*ca[i] + pc.b*ab[i]) / determinant);
        if (!planes.every(p => dot(p.n, vertex) <= p.b + 1e-6)) continue;
        if (!vertices.some(v => Math.hypot(...sub(v, vertex)) < 1e-6)) vertices.push(vertex);
      }
    }
  }
  const faces = planes.map((plane, index) => {
    const points = vertices.filter(v => Math.abs(dot(plane.n, v) - plane.b) < 1e-6);
    if (points.length < 3) return null;
    const center = [0,1,2].map(i => points.reduce((sum, p) => sum + p[i], 0) / points.length);
    const normal = normalize(plane.n);
    const u = normalize(cross(normal, Math.abs(normal[1]) < .9 ? [0,1,0] : [1,0,0]));
    const v = cross(normal, u);
    points.sort((a,b) => Math.atan2(dot(sub(a,center),v),dot(sub(a,center),u)) - Math.atan2(dot(sub(b,center),v),dot(sub(b,center),u)));
    return { points, normal, accent: index === 6 };
  }).filter(Boolean);

  let width = 440, height = 350, frame = 0, time = 0, lastTime = 0;
  let userPaused = false, inView = true;
  let pointer = [0,0], targetPointer = [0,0];
  const light = normalize([-.4,-.5,1]);

  function rotate(p, t) {
    const yaw = .68 + t*.12 + pointer[0]*.13;
    const pitch = -.47 + Math.sin(t*.23)*.09 + pointer[1]*.09;
    const roll = -.18 + Math.sin(t*.19)*.06;
    const x = p[0]*Math.cos(yaw) + p[2]*Math.sin(yaw);
    const z = -p[0]*Math.sin(yaw) + p[2]*Math.cos(yaw);
    const y = p[1]*Math.cos(pitch) - z*Math.sin(pitch);
    const depth = p[1]*Math.sin(pitch) + z*Math.cos(pitch);
    return [x*Math.cos(roll)-y*Math.sin(roll), x*Math.sin(roll)+y*Math.cos(roll), depth];
  }
  function project(p, t) {
    const r = rotate(p,t);
    const perspective = 5 / (5 - r[2]);
    const size = Math.min(width*.225,height*.29);
    return [width*.54+r[0]*size*perspective, height*.46+r[1]*size*perspective+Math.sin(t*.65)*7, r[2]];
  }
  function path(points) {
    context.beginPath(); points.forEach((p,i) => i ? context.lineTo(p[0],p[1]) : context.moveTo(p[0],p[1])); context.closePath();
  }
  function color(amount, accent) {
    const dark = accent ? [133,45,50] : [50,76,95];
    const pale = accent ? [206,130,126] : [220,228,228];
    return `rgb(${dark.map((v,i) => Math.round(v+(pale[i]-v)*amount)).join(',')})`;
  }
  function draw() {
    context.clearRect(0,0,width,height);
    // A light, irregular line gives the sculpture breathing room.
    context.beginPath();
    context.moveTo(width*.04,height*.48);
    context.bezierCurveTo(width*.04,height*.05,width*.78,-height*.025,width*.94,height*.25);
    context.strokeStyle = 'rgba(23,43,66,.22)'; context.lineWidth = .8; context.stroke();
    context.save(); context.translate(width*.54,height*.88); context.scale(1,.14);
    const shadow = context.createRadialGradient(0,0,2,0,0,width*.29);
    shadow.addColorStop(0,'rgba(23,43,66,.1)'); shadow.addColorStop(1,'rgba(23,43,66,0)');
    context.fillStyle=shadow; context.fillRect(-width*.3,-width*.3,width*.6,width*.6); context.restore();
    const sorted = faces.map(face => ({ ...face, rendered:face.points.map(p => project(p,time)), shade:dot(rotate(face.normal,time),light) }));
    sorted.sort((a,b) => a.rendered.reduce((s,p) => s+p[2],0)/a.rendered.length-b.rendered.reduce((s,p) => s+p[2],0)/b.rendered.length);
    sorted.forEach(face => {
      path(face.rendered);
      context.fillStyle = color(.39 + Math.max(-.5,face.shade)*.47,face.accent);
      context.fill(); context.strokeStyle='rgba(250,250,247,.46)'; context.lineWidth=.75; context.stroke();
    });
    // A single red point follows an exploratory curve, distinct from the solid.
    const phase = time*.24;
    const x=width*(.76+.19*Math.sin(phase)), y=height*(.66+.13*Math.cos(phase*.82));
    context.beginPath(); context.moveTo(width*.65,height*.78);
    context.bezierCurveTo(width*.97,height*.9,width*.98,height*.54,x,y);
    context.strokeStyle='rgba(166,61,64,.38)'; context.lineWidth=1; context.stroke();
    context.beginPath(); context.arc(x,y,3.6,0,Math.PI*2); context.fillStyle='#a63d40'; context.fill();
  }
  function tick(timestamp) {
    frame = 0;
    if (lastTime) time += Math.min(timestamp-lastTime,50)/1000;
    lastTime = timestamp;
    pointer=pointer.map((v,i) => v+(targetPointer[i]-v)*.035);
    draw();
    if (isRunning()) frame = requestAnimationFrame(tick);
  }
  function isRunning() { return !userPaused && !reducedMotion.matches && inView && !document.hidden; }
  function update() {
    const running = isRunning();
    hero.classList.toggle('motion-paused',!running);
    canvas.dataset.animationState=running?'running':'paused';
    toggle.hidden=reducedMotion.matches;
    toggle.setAttribute('aria-pressed',String(userPaused));
    label.dataset.en=userPaused?'Resume motion':'Pause motion';
    label.dataset.zh=userPaused?'继续动画':'暂停动画';
    label.textContent=document.documentElement.lang==='zh-CN'?label.dataset.zh:label.dataset.en;
    glyph.textContent=userPaused?'▷':'Ⅱ';
    if (!running && frame) { cancelAnimationFrame(frame);frame=0;lastTime=0; }
    if (running && !frame) { lastTime=0;frame=requestAnimationFrame(tick); }
    if (!running) draw();
  }
  function resize() {
    const rect=host.getBoundingClientRect();
    width=rect.width; height=rect.height;
    if (!width || !height) return;
    const ratio=Math.min(window.devicePixelRatio || 1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0); draw();
  }
  toggle.addEventListener('click',() => { userPaused=!userPaused;update(); });
  hero.addEventListener('pointermove',event => {
    if (event.pointerType==='touch' || reducedMotion.matches || userPaused) return;
    const rect=hero.getBoundingClientRect();
    targetPointer=[(event.clientX-rect.left)/rect.width-.5,(event.clientY-rect.top)/rect.height-.5];
  },{passive:true});
  hero.addEventListener('pointerleave',() => {targetPointer=[0,0];},{passive:true});
  document.addEventListener('visibilitychange',update);
  reducedMotion.addEventListener('change',update);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);
  else window.addEventListener('resize',resize,{passive:true});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {inView=entries[0].isIntersecting;update();},{rootMargin:'40px'}).observe(hero);
  resize();host.classList.add('has-canvas');update();
})();
