/* ══════════════════════════════════════════════════════
   Water Balloon Fight — game.js
══════════════════════════════════════════════════════ */

// ─── Constants ────────────────────────────────────────
const MAX_HP        = 10;
const GRAVITY       = 0.55;
const JUMP_VY       = -13;
const GROUND_Y      = 0;          // set after canvas resize
const PLAYER_W      = 58;
const PLAYER_H      = 82;
const PLAYER_SPEED  = 4;          // horizontal walk speed
const BALLOON_R     = 12;
const THROW_SPEED   = 9;          // total launch speed (magnitude)
const BALLOON_GRAV  = 0.13;       // gentle gravity so it travels the full width
const THROW_COOL    = 90;          // frames between throws
const TRAJ_STEPS    = 400;        // max simulation steps for full trajectory preview
const AIM_SPEED     = 0.03;       // radians per frame when aiming key is held
const ANGLE_MIN     = -1.3;       // steepest upward angle  (~75°)
const ANGLE_MAX     = -0.05;      // shallowest angle       (~3°)
const SPLASH_FRAMES = 28;

// ─── Cannons ──────────────────────────────────────────
// speedMult: launch speed multiplier
// coolMult : cooldown multiplier (< 1 = faster reload)
// sizeMult : projectile radius multiplier
// style    : cannon barrel visual + projectile style id
const CANNONS = [
  {
    id: 'classic', name: 'Classic', icon: '💣',
    desc: 'Reliable & balanced',
    speedMult: 1.0, coolMult: 1.0, sizeMult: 1.0,
    barrelColor: '#374151', barrelAccent: '#6b7280',
    wheelColor: '#5a3e1b', wheelRim: '#3b2810',
    style: 'classic',
  },
  {
    id: 'lights', name: 'Disco Cannon', icon: '🪩',
    desc: 'Flashy blinking lights',
    speedMult: 1.0, coolMult: 1.0, sizeMult: 1.0,
    barrelColor: '#7c3aed', barrelAccent: '#a78bfa',
    wheelColor: '#4c1d95', wheelRim: '#6d28d9',
    style: 'lights',
  },
  {
    id: 'fast', name: 'Speed Cannon', icon: '⚡',
    desc: 'Shoots twice as fast',
    speedMult: 1.45, coolMult: 0.45, sizeMult: 0.85,
    barrelColor: '#b45309', barrelAccent: '#fcd34d',
    wheelColor: '#78350f', wheelRim: '#d97706',
    style: 'fast',
  },
  {
    id: 'big', name: 'Mega Cannon', icon: '🎳',
    desc: 'Huge balloons, slow reload',
    speedMult: 0.8, coolMult: 1.7, sizeMult: 2.1,
    barrelColor: '#1e3a5f', barrelAccent: '#3b82f6',
    wheelColor: '#1e40af', wheelRim: '#2563eb',
    style: 'big',
  },
  {
    id: 'penguin', name: 'Penguin Launcher', icon: '🐧',
    desc: 'Fires adorable penguins',
    speedMult: 0.9, coolMult: 1.2, sizeMult: 1.0,
    barrelColor: '#1e293b', barrelAccent: '#94a3b8',
    wheelColor: '#0f172a', wheelRim: '#334155',
    style: 'penguin',
  },
  {
    id: 'rainbow', name: 'Rainbow Cannon', icon: '🌈',
    desc: 'Magic rainbow projectiles',
    speedMult: 1.1, coolMult: 0.85, sizeMult: 1.1,
    barrelColor: '#ec4899', barrelAccent: '#f9a8d4',
    wheelColor: '#db2777', wheelRim: '#be185d',
    style: 'rainbow',
  },
  {
    id: 'ice', name: 'Ice Cannon', icon: '❄️',
    desc: 'Freezing ice shards',
    speedMult: 1.2, coolMult: 0.9, sizeMult: 0.9,
    barrelColor: '#0ea5e9', barrelAccent: '#bae6fd',
    wheelColor: '#0369a1', wheelRim: '#0284c7',
    style: 'ice',
  },
  {
    id: 'fire', name: 'Fire Cannon', icon: '🔥',
    desc: 'Blazing hot shot',
    speedMult: 1.35, coolMult: 1.1, sizeMult: 1.15,
    barrelColor: '#dc2626', barrelAccent: '#fca5a5',
    wheelColor: '#991b1b', wheelRim: '#b91c1c',
    style: 'fire',
  },
];

// AI difficulty profiles
// The AI always fires every 4 s (240 frames @ 60 fps) regardless of cannon type.
const AI_PROFILES = {
  easy:   { react: 0.18, aimNoise: 0.45, throwDelay: 0, moveSpeed: 0.5, aimSpeed: 0.10 },
  medium: { react: 0.45, aimNoise: 0.20, throwDelay: 0, moveSpeed: 0.9, aimSpeed: 0.18 },
  hard:   { react: 0.85, aimNoise: 0.06, throwDelay: 0, moveSpeed: 1.4, aimSpeed: 0.30 },
};

// ─── Worlds ───────────────────────────────────────────
const WORLDS = [
  {
    id: 'meadow', name: 'Sunny Meadow', icon: '🌻', desc: 'A bright summer day',
    sky:   ['#7ec8e3','#c9e8f5'],
    ground: '#5a9e3a', groundTop: '#6dbf4a',
    obstacle: { emoji: '🌵', label: 'Cactus', color: '#15803d', drawFn: 'cactus' },
    decor(c, w, h, gy) {
      // sun
      c.save(); c.fillStyle='#fde047';
      c.beginPath(); c.arc(w-60, 55, 32, 0, Math.PI*2); c.fill();
      c.fillStyle='#fef08a';
      for(let a=0;a<8;a++){
        c.save(); c.translate(w-60,55); c.rotate(a*Math.PI/4);
        c.fillRect(-3,-48,6,14); c.restore();
      }
      // clouds
      [[120,60],[300,40],[550,70]].forEach(([x,y])=>drawCloud(c,x,y,'#ffffffcc'));
      // flowers
      for(let x=30;x<w;x+=80){
        c.fillStyle='#fde047'; c.beginPath(); c.arc(x,gy+4,5,0,Math.PI*2); c.fill();
        c.fillStyle='#22c55e'; c.fillRect(x-1,gy-6,2,10);
      }
      c.restore();
    },
  },
  {
    id: 'night', name: 'Night Sky', icon: '🌙', desc: 'Moonlit battlefield',
    sky:   ['#0f172a','#1e3a5f'],
    ground: '#1e293b', groundTop: '#334155',
    obstacle: { emoji: '🦇', label: 'Bat', color: '#1e1b4b', drawFn: 'bat' },
    decor(c, w, h, gy) {
      c.save();
      // stars
      const stars = seededRandom(42, 80);
      stars.forEach(([sx,sy]) => {
        c.fillStyle=`rgba(255,255,255,${0.4+sy*0.6})`;
        c.beginPath(); c.arc(sx*w, sy*(gy*0.9), 1.5+sy, 0, Math.PI*2); c.fill();
      });
      // moon
      c.fillStyle='#fef9c3';
      c.beginPath(); c.arc(w-80,60,38,0,Math.PI*2); c.fill();
      c.fillStyle='#1e3a5f';
      c.beginPath(); c.arc(w-62,52,30,0,Math.PI*2); c.fill();
      // distant city silhouette
      c.fillStyle='#0f172a';
      [[60,30],[110,50],[155,20],[200,45],[250,35],[300,55],[350,18],[400,40]].forEach(([x,bh],i)=>{
        c.fillRect(x, gy-bh, 30+i*2, bh);
        // windows
        c.fillStyle='#fef08a44';
        for(let wy=gy-bh+5;wy<gy-5;wy+=10)
          for(let wx=x+4;wx<x+28;wx+=8){ c.fillRect(wx,wy,5,6); }
        c.fillStyle='#0f172a';
      });
      c.restore();
    },
  },
  {
    id: 'castle', name: 'Dark Castle', icon: '🏰', desc: 'Stone walls and torches',
    sky:   ['#374151','#6b7280'],
    ground: '#44403c', groundTop: '#57534e',
    obstacle: { emoji: '👻', label: 'Phantom', color: '#e2e8f0', drawFn: 'phantom' },
    decor(c, w, h, gy) {
      c.save();
      // stormy clouds
      [[80,50],[280,30],[500,60]].forEach(([x,y])=>drawCloud(c,x,y,'#374151'));
      // castle walls left & right
      drawCastleWall(c, 0,    gy, 80, 120);
      drawCastleWall(c, w-80, gy, 80, 120);
      // torches
      [[85,gy-100],[w-90,gy-100]].forEach(([tx,ty])=>{
        c.fillStyle='#57534e'; c.fillRect(tx-3,ty,6,20);
        const flicker = 0.7+Math.sin(Date.now()/120)*0.3;
        c.globalAlpha=flicker;
        c.fillStyle='#f97316'; c.beginPath(); c.arc(tx,ty-4,8,0,Math.PI*2); c.fill();
        c.fillStyle='#fde047'; c.beginPath(); c.arc(tx,ty-6,4,0,Math.PI*2); c.fill();
        c.globalAlpha=1;
      });
      // stone floor lines
      c.strokeStyle='#292524'; c.lineWidth=1;
      for(let lx=0;lx<w;lx+=40){ c.beginPath(); c.moveTo(lx,gy); c.lineTo(lx,gy+20); c.stroke(); }
      c.restore();
    },
  },
  {
    id: 'house', name: 'Living Room', icon: '🏠', desc: 'A cozy indoor battle',
    sky:   ['#fef3c7','#fde68a'],
    ground: '#92400e', groundTop: '#a16207',
    obstacle: { emoji: '🪑', label: 'Chair', color: '#7c3aed', drawFn: 'chair' },
    decor(c, w, h, gy) {
      c.save();
      // wallpaper
      c.fillStyle='#fef3c7';
      c.fillRect(0,0,w,gy);
      // wallpaper pattern
      c.fillStyle='#fde68a44';
      for(let wx=0;wx<w;wx+=50) for(let wy=0;wy<gy;wy+=50){
        c.beginPath(); c.arc(wx+25,wy+25,8,0,Math.PI*2); c.fill();
      }
      // wooden floor planks
      c.fillStyle='#92400e';
      c.fillRect(0,gy,w,h-gy);
      c.strokeStyle='#78350f'; c.lineWidth=1.5;
      for(let lx=0;lx<w;lx+=60){ c.beginPath(); c.moveTo(lx,gy); c.lineTo(lx,h); c.stroke(); }
      // window left
      drawWindow(c, 60, 60, 90, 110);
      // window right
      drawWindow(c, w-150, 60, 90, 110);
      // picture frame
      c.strokeStyle='#92400e'; c.lineWidth=4;
      c.strokeRect(w/2-40,30,80,60);
      c.fillStyle='#bfdbfe'; c.fillRect(w/2-36,34,72,52);
      c.font='26px serif'; c.textAlign='center'; c.fillText('🎨',w/2,66);
      // sofa
      drawSofa(c, w/2, gy-10, 160);
      c.restore();
    },
  },
  {
    id: 'circus', name: 'Big Top Circus', icon: '🎪', desc: 'Under the big tent!',
    sky:   ['#dc2626','#f97316'],
    ground: '#854d0e', groundTop: '#d97706',
    obstacle: { emoji: '🤡', label: 'Clown', color: '#ef4444', drawFn: 'clown' },
    decor(c, w, h, gy) {
      c.save();
      // striped tent ceiling
      const stripes = 12;
      for(let i=0;i<stripes;i++){
        c.fillStyle= i%2===0 ? '#dc2626' : '#fff';
        c.beginPath();
        c.moveTo(w/2, 0);
        c.lineTo(i*(w/stripes), gy*0.55);
        c.lineTo((i+1)*(w/stripes), gy*0.55);
        c.closePath(); c.fill();
      }
      // tent border
      c.fillStyle='#fbbf24'; c.fillRect(0, gy*0.55-6, w, 12);
      // hanging lights
      for(let lx=40;lx<w;lx+=70){
        c.strokeStyle='#1c1c1c'; c.lineWidth=1;
        c.beginPath(); c.moveTo(lx,0); c.lineTo(lx,gy*0.45); c.stroke();
        c.fillStyle=['#ef4444','#3b82f6','#fde047','#22c55e'][Math.floor(lx/70)%4];
        c.beginPath(); c.arc(lx,gy*0.45,7,0,Math.PI*2); c.fill();
      }
      // sawdust floor
      c.fillStyle='#d97706'; c.fillRect(0,gy,w,h-gy);
      c.fillStyle='#92400e44';
      for(let i=0;i<60;i++){
        const sx=seededRandom(i*7,1)[0][0]*w, sy=gy+seededRandom(i*3,1)[0][1]*30;
        c.beginPath(); c.ellipse(sx,sy,6,2,seededRandom(i,1)[0][0]*Math.PI,0,Math.PI*2); c.fill();
      }
      // bunting
      for(let bx=0;bx<w-30;bx+=50){
        c.fillStyle=['#ef4444','#3b82f6','#fde047','#22c55e','#a855f7'][Math.floor(bx/50)%5];
        c.beginPath(); c.moveTo(bx,gy*0.6); c.lineTo(bx+25,gy*0.6+22); c.lineTo(bx+50,gy*0.6); c.fill();
      }
      c.restore();
    },
  },
  {
    id: 'cemetery', name: 'Spooky Cemetery', icon: '⚰️', desc: 'Graveyards and ghosts',
    sky:   ['#1a1a2e','#2d1b69'],
    ground: '#1c2b1e', groundTop: '#14532d',
    obstacle: { emoji: '💀', label: 'Skeleton', color: '#e2e8f0', drawFn: 'skeleton' },
    decor(c, w, h, gy) {
      c.save();
      // moon & fog
      c.fillStyle='#fef9c3'; c.beginPath(); c.arc(w/2,55,35,0,Math.PI*2); c.fill();
      c.fillStyle='#e0f2fe44';
      c.fillRect(0,gy-30,w,40); // fog strip
      // gravestones
      const stones = [[80,gy],[180,gy-10],[w/2-60,gy],[w/2+60,gy-5],[w-180,gy-8],[w-80,gy]];
      stones.forEach(([sx,sy])=> drawGravestone(c,sx,sy));
      // dead trees
      drawDeadTree(c, 30, gy);
      drawDeadTree(c, w-40, gy);
      // floating ghosts in background
      [[180,gy-80],[w-200,gy-100],[w/2,gy-130]].forEach(([gx,gy2],i)=>{
        const bob = Math.sin(Date.now()/700 + i*2)*8;
        c.globalAlpha=0.25;
        c.font='28px serif'; c.textAlign='center';
        c.fillStyle='#e2e8f0'; c.fillText('👻',gx,gy2+bob);
        c.globalAlpha=1;
      });
      // bats
      [[w*0.3,gy*0.3],[w*0.65,gy*0.2],[w*0.8,gy*0.4]].forEach(([bx,by],i)=>{
        const flap = Math.sin(Date.now()/200+i)*0.4;
        c.font='18px serif'; c.textAlign='center';
        c.save(); c.translate(bx,by); c.rotate(flap); c.fillText('🦇',0,0); c.restore();
      });
      c.restore();
    },
  },
  {
    id: 'space', name: 'Outer Space', icon: '🚀', desc: 'Zero-gravity arena',
    sky:   ['#000011','#0c0a2e'],
    ground: '#374151', groundTop: '#4b5563',
    obstacle: { emoji: '👾', label: 'Alien', color: '#22d3ee', drawFn: 'alien' },
    decor(c, w, h, gy) {
      c.save();
      // stars
      const stars = seededRandom(99, 120);
      stars.forEach(([sx,sy],i) => {
        const twinkle = 0.5+Math.sin(Date.now()/500+i)*0.5;
        c.globalAlpha=twinkle;
        c.fillStyle='#fff';
        c.beginPath(); c.arc(sx*w, sy*(gy*0.95), 1+sy*1.5, 0, Math.PI*2); c.fill();
      });
      c.globalAlpha=1;
      // planet
      const pg = c.createRadialGradient(140,80,5,140,80,55);
      pg.addColorStop(0,'#a78bfa'); pg.addColorStop(1,'#4c1d95');
      c.fillStyle=pg; c.beginPath(); c.arc(140,80,55,0,Math.PI*2); c.fill();
      // planet rings
      c.strokeStyle='#c4b5fd88'; c.lineWidth=8;
      c.beginPath(); c.ellipse(140,90,90,18,-0.3,0,Math.PI*2); c.stroke();
      // asteroid belt
      seededRandom(77, 15).forEach(([ax,ay],i)=>{
        c.fillStyle='#6b7280';
        c.beginPath(); c.ellipse(ax*w, gy-20-ay*60, 8+ay*10, 5+ay*6, ay*Math.PI, 0, Math.PI*2); c.fill();
      });
      // moon surface crater details
      c.fillStyle='#4b5563';
      c.fillRect(0,gy,w,h-gy);
      c.fillStyle='#37415188';
      [[100,gy+8,20],[250,gy+12,14],[450,gy+6,25],[650,gy+10,18],[800,gy+8,22]]
        .forEach(([cx,cy,r])=>{ c.beginPath(); c.ellipse(cx,cy,r,r*0.4,0,0,Math.PI*2); c.fill(); });
      c.restore();
    },
  },
  {
    id: 'beach', name: 'Sunny Beach', icon: '🏖️', desc: 'Sand, sea and sunburn',
    sky:   ['#38bdf8','#7dd3fc'],
    ground: '#f5d06b', groundTop: '#fbbf24',
    obstacle: { emoji: '🦀', label: 'Giant Crab', color: '#dc2626', drawFn: 'crab' },
    decor(c, w, h, gy) {
      c.save();
      // sea in background
      c.fillStyle='#0ea5e9';
      c.fillRect(0, gy*0.55, w, gy*0.45);
      // waves
      c.strokeStyle='#fff8'; c.lineWidth=3;
      for(let wx=0;wx<w;wx+=80){
        const woff = Math.sin(Date.now()/600+wx)*6;
        c.beginPath(); c.arc(wx+40, gy*0.82+woff, 38, Math.PI, 0); c.stroke();
      }
      // sun
      c.fillStyle='#fde047';
      c.beginPath(); c.arc(w-70,50,34,0,Math.PI*2); c.fill();
      // clouds
      [[140,40],[380,30]].forEach(([cx,cy])=>drawCloud(c,cx,cy,'#ffffffdd'));
      // sand
      c.fillStyle='#f5d06b'; c.fillRect(0,gy,w,h-gy);
      // beach umbrella
      [[w*0.2,gy],[w*0.75,gy]].forEach(([ux,uy])=>{
        c.strokeStyle='#78350f'; c.lineWidth=3;
        c.beginPath(); c.moveTo(ux,uy); c.lineTo(ux-5,uy-70); c.stroke();
        const uc = c.createRadialGradient(ux-5,uy-70,0,ux-5,uy-70,45);
        uc.addColorStop(0,'#ef4444'); uc.addColorStop(0.5,'#fff'); uc.addColorStop(1,'#3b82f6');
        c.fillStyle=uc;
        c.beginPath(); c.arc(ux-5,uy-70,45,Math.PI,0); c.fill();
      });
      // shells & footprints
      ['🐚','⭐','🦀'].forEach((em,i)=>{
        c.font='16px serif'; c.textAlign='center';
        c.fillText(em, 100+i*130, gy+18);
      });
      c.restore();
    },
  },
  {
    id: 'volcano', name: 'Volcano Island', icon: '🌋', desc: 'Hot lava, hotter fights',
    sky:   ['#7c2d12','#dc2626'],
    ground: '#1c1917', groundTop: '#44403c',
    obstacle: { emoji: '🔥', label: 'Fire Imp', color: '#f97316', drawFn: 'imp' },
    decor(c, w, h, gy) {
      c.save();
      // lava glow on horizon
      const glow = c.createLinearGradient(0, gy-60, 0, gy);
      glow.addColorStop(0,'transparent'); glow.addColorStop(1,'#f97316aa');
      c.fillStyle=glow; c.fillRect(0,gy-60,w,60);
      // volcano shape
      c.fillStyle='#292524';
      c.beginPath(); c.moveTo(w/2-160,gy); c.lineTo(w/2,gy-180); c.lineTo(w/2+160,gy); c.closePath(); c.fill();
      // lava pool at top
      const lavag = c.createRadialGradient(w/2,gy-170,4,w/2,gy-170,30);
      lavag.addColorStop(0,'#fde047'); lavag.addColorStop(0.5,'#f97316'); lavag.addColorStop(1,'#dc2626');
      c.fillStyle=lavag; c.beginPath(); c.ellipse(w/2,gy-168,28,12,0,0,Math.PI*2); c.fill();
      // lava streams
      c.strokeStyle='#f97316'; c.lineWidth=4;
      [[w/2-20,gy-160],[w/2+10,gy-155]].forEach(([lsx,lsy])=>{
        c.beginPath(); c.moveTo(lsx,lsy);
        c.bezierCurveTo(lsx-30,lsy+40,lsx-50,lsy+80,lsx-40,gy); c.stroke();
      });
      // embers
      seededRandom(Date.now()>>9, 12).forEach(([ex,ey])=>{
        c.fillStyle='#fde047'; c.globalAlpha=ey;
        c.beginPath(); c.arc(w/2-40+ex*80, gy-160-ey*120, 3, 0, Math.PI*2); c.fill();
      });
      c.globalAlpha=1;
      // rocks
      c.fillStyle='#292524';
      [[50,gy],[w-60,gy],[140,gy+5],[w-160,gy+3]].forEach(([rx,ry])=>{
        c.beginPath(); c.ellipse(rx,ry,22,12,0,0,Math.PI); c.fill();
      });
      c.restore();
    },
  },
  {
    id: 'underwater', name: 'Deep Ocean', icon: '🌊', desc: 'Soak the seabed',
    sky:   ['#0c4a6e','#0369a1'],
    ground: '#713f12', groundTop: '#854d0e',
    obstacle: { emoji: '🦑', label: 'Squid', color: '#7e22ce', drawFn: 'squid' },
    decor(c, w, h, gy) {
      c.save();
      // water fill
      c.fillStyle='#0369a188'; c.fillRect(0,0,w,gy);
      // caustic light shafts
      c.globalAlpha=0.07;
      for(let sx=50;sx<w;sx+=90){
        c.fillStyle='#fff';
        c.beginPath();
        c.moveTo(sx-20,0); c.lineTo(sx+20,0); c.lineTo(sx+60,gy); c.lineTo(sx-60,gy);
        c.closePath(); c.fill();
      }
      c.globalAlpha=1;
      // bubbles
      seededRandom(55, 20).forEach(([bx,by],i)=>{
        const bob = (Date.now()/1000*0.5+i*0.7)%1;
        c.strokeStyle='#bae6fd'; c.lineWidth=1.5; c.globalAlpha=0.6;
        c.beginPath(); c.arc(bx*w, gy*(1-bob)-10, 4+bx*6, 0, Math.PI*2); c.stroke();
      });
      c.globalAlpha=1;
      // seaweed
      for(let sx=30;sx<w;sx+=65){
        const h2 = 30+Math.sin(sx)*15;
        c.strokeStyle='#15803d'; c.lineWidth=5; c.lineCap='round';
        c.beginPath(); c.moveTo(sx,gy);
        c.bezierCurveTo(sx+15,gy-h2*0.4, sx-15,gy-h2*0.7, sx+8,gy-h2); c.stroke();
      }
      // sea creatures
      ['🐠','🐡','🦑','🐙','🦀'].forEach((em,i)=>{
        c.font='20px serif'; c.textAlign='center';
        const bob2 = Math.sin(Date.now()/800+i)*12;
        c.fillText(em, 60+i*160, gy*0.4+bob2);
      });
      // sand
      c.fillStyle='#854d0e'; c.fillRect(0,gy,w,h-gy);
      // sand ripples
      c.strokeStyle='#92400e'; c.lineWidth=1.5;
      for(let rx=0;rx<w;rx+=30){ c.beginPath(); c.arc(rx+15,gy+8,14,0,Math.PI); c.stroke(); }
      c.restore();
    },
  },
];

// ─── World draw helpers ───────────────────────────────
function drawCloud(c, x, y, col) {
  c.fillStyle = col;
  [[0,0,28],[24,-8,22],[48,0,24],[72,0,20]].forEach(([dx,dy,r])=>{
    c.beginPath(); c.arc(x+dx,y+dy,r,0,Math.PI*2); c.fill();
  });
}
function drawCastleWall(c, x, gy, w2, h2) {
  c.fillStyle='#57534e';
  c.fillRect(x, gy-h2, w2, h2);
  c.fillStyle='#44403c';
  // merlons
  for(let mx=x+6;mx<x+w2-6;mx+=20){
    c.fillRect(mx, gy-h2-18, 12, 18);
  }
  // arrow slits
  c.fillStyle='#1c1917';
  [[x+15,gy-h2+30],[x+45,gy-h2+60]].forEach(([sx,sy])=>c.fillRect(sx,sy,8,20));
}
function drawWindow(c, x, y, w2, h2) {
  c.fillStyle='#1e3a8a'; c.fillRect(x,y,w2,h2);
  c.fillStyle='#bfdbfe88';
  c.fillRect(x+4,y+4, w2/2-6, h2-8);
  c.fillRect(x+w2/2+2,y+4, w2/2-6, h2-8);
  c.strokeStyle='#92400e'; c.lineWidth=4;
  c.strokeRect(x-2,y-2,w2+4,h2+4);
  // curtains
  c.fillStyle='#ef444488'; c.beginPath();
  c.moveTo(x+4,y+4); c.quadraticCurveTo(x+w2*0.3,y+h2*0.4,x+4,y+h2-4); c.fill();
  c.beginPath();
  c.moveTo(x+w2-4,y+4); c.quadraticCurveTo(x+w2*0.7,y+h2*0.4,x+w2-4,y+h2-4); c.fill();
}
function drawSofa(c, cx, y, w2) {
  c.fillStyle='#7c3aed';
  c.beginPath(); c.roundRect(cx-w2/2, y-30, w2, 30, [8,8,0,0]); c.fill();
  c.fillStyle='#6d28d9';
  c.beginPath(); c.roundRect(cx-w2/2, y-10, w2, 10, [0,0,6,6]); c.fill();
  // armrests
  [cx-w2/2-10, cx+w2/2].forEach(ax=>{
    c.fillStyle='#7c3aed';
    c.beginPath(); c.roundRect(ax, y-34, 16, 34, 6); c.fill();
  });
  // cushions
  c.fillStyle='#a78bfa';
  c.beginPath(); c.roundRect(cx-w2/2+6, y-28, w2/2-10, 20, 6); c.fill();
  c.beginPath(); c.roundRect(cx+4, y-28, w2/2-10, 20, 6); c.fill();
}
function drawGravestone(c, x, y) {
  c.fillStyle='#6b7280';
  c.beginPath(); c.roundRect(x-14,y-45,28,45,[12,12,0,0]); c.fill();
  c.fillStyle='#4b5563';
  c.font='bold 11px serif'; c.textAlign='center'; c.fillText('R.I.P',x,y-20);
  // cracks
  c.strokeStyle='#374151'; c.lineWidth=1;
  c.beginPath(); c.moveTo(x-4,y-38); c.lineTo(x+2,y-22); c.stroke();
}
function drawDeadTree(c, x, y) {
  c.strokeStyle='#292524'; c.lineWidth=6; c.lineCap='round';
  c.beginPath(); c.moveTo(x,y); c.lineTo(x,y-90); c.stroke();
  c.lineWidth=3;
  c.beginPath(); c.moveTo(x,y-50); c.lineTo(x-30,y-80); c.stroke();
  c.beginPath(); c.moveTo(x,y-65); c.lineTo(x+25,y-90); c.stroke();
  c.beginPath(); c.moveTo(x,y-75); c.lineTo(x-18,y-95); c.stroke();
}
// deterministic pseudo-random array for decorations
function seededRandom(seed, count) {
  const out = [];
  let s = seed | 0;
  for(let i=0;i<count;i++){
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const a = ((s >>> 16) & 0xffff) / 0xffff;
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const b = ((s >>> 16) & 0xffff) / 0xffff;
    out.push([a,b]);
  }
  return out;
}

function seededRandom(seed, count) {
  const out = [];
  let s = seed | 0;
  for(let i=0;i<count;i++){
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const a = ((s >>> 16) & 0xffff) / 0xffff;
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const b = ((s >>> 16) & 0xffff) / 0xffff;
    out.push([a,b]);
  }
  return out;
}

// ─── Obstacle system ──────────────────────────────────
const OBS_W = PLAYER_W;   // same width as a character
const OBS_H = PLAYER_H;   // same height as a character

function initObstacle() {
  const w = canvas.width;
  // Start in the middle, moving upward/downward
  obstacle = {
    x: w / 2 - OBS_W / 2,
    y: groundY - OBS_H,
    vy: -2.2,            // starts moving up
    hitFlash: 0,
  };
}

// Draw the obstacle based on the current world's drawFn
function drawObstacle() {
  if (!obstacle) return;
  const ob = obstacle;
  const cx = ob.x + OBS_W / 2;
  const cy = ob.y + OBS_H / 2;
  const w2 = OBS_W, h2 = OBS_H;
  const fn = selectedWorld.obstacle ? selectedWorld.obstacle.drawFn : 'cactus';

  ctx.save();
  if (ob.hitFlash > 0 && Math.floor(ob.hitFlash / 3) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }

  switch (fn) {

    case 'cactus': {
      // Green cactus body
      ctx.fillStyle = '#15803d';
      ctx.beginPath(); ctx.roundRect(cx - 10, ob.y + h2 * 0.3, 20, h2 * 0.7, 6); ctx.fill();
      // arms
      ctx.fillRect(cx - 26, ob.y + h2 * 0.35, 18, 10);
      ctx.fillRect(cx + 8,  ob.y + h2 * 0.45, 18, 10);
      // top ball
      ctx.beginPath(); ctx.arc(cx, ob.y + h2 * 0.28, 14, 0, Math.PI * 2); ctx.fill();
      // spikes
      ctx.strokeStyle = '#166534'; ctx.lineWidth = 2;
      [[-18, 0.38], [18, 0.42], [-8, 0.6], [8, 0.7]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(cx + dx, ob.y + h2 * dy);
        ctx.lineTo(cx + dx + (dx > 0 ? 8 : -8), ob.y + h2 * dy - 6); ctx.stroke();
      });
      // face
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - 4, ob.y + h2 * 0.22, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, ob.y + h2 * 0.22, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#166534'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, ob.y + h2 * 0.3, 5, 0, Math.PI); ctx.stroke();
      break;
    }

    case 'bat': {
      const wing = Math.sin(Date.now() / 120) * 0.3;
      ctx.fillStyle = '#1e1b4b';
      // body
      ctx.beginPath(); ctx.ellipse(cx, cy + 5, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
      // wings
      ctx.save(); ctx.translate(cx, cy);
      ctx.rotate(-wing);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-20, -20, -45, -15, -50, 5);
      ctx.bezierCurveTo(-35, 0, -20, 8, 0, 10);
      ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(cx, cy);
      ctx.rotate(wing);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(20, -20, 45, -15, 50, 5);
      ctx.bezierCurveTo(35, 0, 20, 8, 0, 10);
      ctx.fill();
      ctx.restore();
      // ears
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath(); ctx.moveTo(cx - 8, ob.y + 18); ctx.lineTo(cx - 14, ob.y + 2); ctx.lineTo(cx - 2, ob.y + 14); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 8, ob.y + 18); ctx.lineTo(cx + 14, ob.y + 2); ctx.lineTo(cx + 2, ob.y + 14); ctx.fill();
      // eyes
      ctx.fillStyle = '#f87171';
      ctx.beginPath(); ctx.arc(cx - 5, cy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 5, cy, 4, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'phantom': {
      const bob = Math.sin(Date.now() / 500) * 6;
      const bodyY = ob.y + bob;
      // ghostly trail at bottom
      ctx.fillStyle = '#e2e8f033';
      ctx.beginPath(); ctx.ellipse(cx, bodyY + h2 * 0.85, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
      // body
      const g = ctx.createRadialGradient(cx, bodyY + h2 * 0.4, 5, cx, bodyY + h2 * 0.4, 35);
      g.addColorStop(0, '#f1f5f9cc');
      g.addColorStop(1, '#94a3b888');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - 22, bodyY + h2 * 0.85);
      ctx.bezierCurveTo(cx - 22, bodyY, cx - 18, bodyY - 5, cx, bodyY - 5);
      ctx.bezierCurveTo(cx + 18, bodyY - 5, cx + 22, bodyY, cx + 22, bodyY + h2 * 0.85);
      // wavy bottom
      ctx.bezierCurveTo(cx + 14, bodyY + h2 * 0.78, cx + 6, bodyY + h2 * 0.9, cx, bodyY + h2 * 0.82);
      ctx.bezierCurveTo(cx - 6, bodyY + h2 * 0.9, cx - 14, bodyY + h2 * 0.78, cx - 22, bodyY + h2 * 0.85);
      ctx.fill();
      // eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.ellipse(cx - 7, bodyY + h2 * 0.28, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 7, bodyY + h2 * 0.28, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
      // mouth
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, bodyY + h2 * 0.48, 8, 0, Math.PI); ctx.stroke();
      break;
    }

    case 'chair': {
      ctx.fillStyle = '#7c3aed';
      // seat
      ctx.beginPath(); ctx.roundRect(cx - 22, cy - 5, 44, 12, 4); ctx.fill();
      // back
      ctx.beginPath(); ctx.roundRect(cx - 20, ob.y + 10, 10, h2 * 0.55, 4); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx + 10, ob.y + 10, 10, h2 * 0.55, 4); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx - 20, ob.y + 8, 40, 10, 4); ctx.fill();
      // legs
      ctx.fillStyle = '#6d28d9';
      [[-18, 1], [14, 1]].forEach(([dx, _]) => {
        ctx.fillRect(cx + dx, cy + 7, 8, h2 * 0.35);
      });
      // cushion
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath(); ctx.roundRect(cx - 18, cy - 3, 36, 8, 4); ctx.fill();
      // face on cushion (funny)
      ctx.font = '18px serif'; ctx.textAlign = 'center';
      ctx.fillText('😵', cx, cy + 16);
      break;
    }

    case 'clown': {
      // body
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.ellipse(cx, cy + 10, 22, 28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde047';
      // polka dots
      [[0, -8], [-14, 5], [14, 5], [0, 18]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.arc(cx + dx, cy + dy + 10, 5, 0, Math.PI * 2); ctx.fill();
      });
      // head
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(cx, ob.y + 20, 18, 0, Math.PI * 2); ctx.fill();
      // wig
      ctx.fillStyle = '#22c55e';
      ctx.beginPath(); ctx.arc(cx, ob.y + 8, 22, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - 14, ob.y + 12, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 14, ob.y + 12, 10, 0, Math.PI * 2); ctx.fill();
      // nose
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(cx, ob.y + 22, 5, 0, Math.PI * 2); ctx.fill();
      // eyes
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(cx - 6, ob.y + 16, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 6, ob.y + 16, 3, 0, Math.PI * 2); ctx.fill();
      // smile
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, ob.y + 24, 7, 0.1, Math.PI - 0.1); ctx.stroke();
      break;
    }

    case 'skeleton': {
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      // spine
      ctx.beginPath(); ctx.moveTo(cx, ob.y + 20); ctx.lineTo(cx, ob.y + h2 * 0.75); ctx.stroke();
      // ribs
      [0.35, 0.45, 0.55].forEach(t => {
        ctx.beginPath(); ctx.moveTo(cx, ob.y + h2 * t);
        ctx.bezierCurveTo(cx - 22, ob.y + h2 * t - 8, cx - 22, ob.y + h2 * t + 8, cx, ob.y + h2 * t + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, ob.y + h2 * t);
        ctx.bezierCurveTo(cx + 22, ob.y + h2 * t - 8, cx + 22, ob.y + h2 * t + 8, cx, ob.y + h2 * t + 4); ctx.stroke();
      });
      // arms
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, ob.y + h2 * 0.3); ctx.lineTo(cx - 30, ob.y + h2 * 0.55); ctx.lineTo(cx - 24, ob.y + h2 * 0.75); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, ob.y + h2 * 0.3); ctx.lineTo(cx + 30, ob.y + h2 * 0.55); ctx.lineTo(cx + 24, ob.y + h2 * 0.75); ctx.stroke();
      // legs
      ctx.beginPath(); ctx.moveTo(cx, ob.y + h2 * 0.75); ctx.lineTo(cx - 16, ob.y + h2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, ob.y + h2 * 0.75); ctx.lineTo(cx + 16, ob.y + h2); ctx.stroke();
      // skull
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); ctx.arc(cx, ob.y + 14, 16, 0, Math.PI * 2); ctx.fill();
      // jaw
      ctx.fillRect(cx - 10, ob.y + 24, 20, 8);
      // eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(cx - 5, ob.y + 12, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 5, ob.y + 12, 4, 0, Math.PI * 2); ctx.fill();
      // teeth
      ctx.fillStyle = '#fff';
      for (let t = 0; t < 4; t++) ctx.fillRect(cx - 9 + t * 5, ob.y + 25, 4, 6);
      break;
    }

    case 'alien': {
      const pulse = 0.9 + Math.sin(Date.now() / 300) * 0.1;
      ctx.scale(pulse, pulse);
      ctx.translate(cx * (1 - pulse), cy * (1 - pulse));
      // body
      const ag = ctx.createRadialGradient(cx, cy + 8, 5, cx, cy + 8, 26);
      ag.addColorStop(0, '#67e8f9'); ag.addColorStop(1, '#0891b2');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.ellipse(cx, cy + 8, 22, 26, 0, 0, Math.PI * 2); ctx.fill();
      // head dome
      ctx.fillStyle = '#a5f3fc';
      ctx.beginPath(); ctx.ellipse(cx, ob.y + 20, 20, 22, 0, 0, Math.PI * 2); ctx.fill();
      // antennae
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 8, ob.y + 4); ctx.lineTo(cx - 18, ob.y - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 8, ob.y + 4); ctx.lineTo(cx + 18, ob.y - 10); ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(cx - 18, ob.y - 10, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 18, ob.y - 10, 4, 0, Math.PI * 2); ctx.fill();
      // eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.ellipse(cx - 7, ob.y + 18, 7, 9, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 7, ob.y + 18, 7, 9, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath(); ctx.arc(cx - 7, ob.y + 17, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 7, ob.y + 17, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'crab': {
      ctx.fillStyle = '#dc2626';
      // body
      ctx.beginPath(); ctx.ellipse(cx, cy + 5, 28, 18, 0, 0, Math.PI * 2); ctx.fill();
      // shell pattern
      ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy + 5, 20, 12, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy + 5, 10, 6, 0, 0, Math.PI * 2); ctx.stroke();
      // claws
      const clawWave = Math.sin(Date.now() / 250) * 0.25;
      ctx.fillStyle = '#ef4444';
      ctx.save(); ctx.translate(cx - 30, cy);
      ctx.rotate(-0.5 + clawWave);
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.ellipse(-12, -6, 8, 5, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-12, 6, 8, 5, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(cx + 30, cy);
      ctx.rotate(0.5 - clawWave);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.ellipse(12, -6, 8, 5, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(12, 6, 8, 5, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // legs
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 4;
      [[-20, 10], [-10, 14], [10, 14], [20, 10]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(cx + dx, cy + 12); ctx.lineTo(cx + dx * 1.8, cy + 28); ctx.stroke();
      });
      // eyes on stalks
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx - 10, ob.y + 4, 5, 12);
      ctx.fillRect(cx + 5, ob.y + 4, 5, 12);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(cx - 8, ob.y + 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 8, ob.y + 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - 6, ob.y + 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 10, ob.y + 3, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'imp': {
      const flicker = 0.85 + Math.sin(Date.now() / 90) * 0.15;
      // flames at feet
      ctx.globalAlpha *= flicker;
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.ellipse(cx, ob.y + h2 + 4, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.ellipse(cx, ob.y + h2 + 2, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = ob.hitFlash > 0 ? 0.35 : 1;
      // body
      const ig = ctx.createRadialGradient(cx, cy, 5, cx, cy, 25);
      ig.addColorStop(0, '#f97316'); ig.addColorStop(1, '#c2410c');
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.ellipse(cx, cy + 5, 20, 25, 0, 0, Math.PI * 2); ctx.fill();
      // wings
      ctx.fillStyle = '#7c2d12cc';
      ctx.beginPath(); ctx.moveTo(cx, cy - 5);
      ctx.bezierCurveTo(cx - 15, cy - 30, cx - 40, cy - 20, cx - 38, cy);
      ctx.bezierCurveTo(cx - 20, cy - 10, cx - 8, cy + 5, cx, cy - 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, cy - 5);
      ctx.bezierCurveTo(cx + 15, cy - 30, cx + 40, cy - 20, cx + 38, cy);
      ctx.bezierCurveTo(cx + 20, cy - 10, cx + 8, cy + 5, cx, cy - 5); ctx.fill();
      // head
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(cx, ob.y + 18, 17, 0, Math.PI * 2); ctx.fill();
      // horns
      ctx.fillStyle = '#c2410c';
      ctx.beginPath(); ctx.moveTo(cx - 10, ob.y + 7); ctx.lineTo(cx - 16, ob.y - 6); ctx.lineTo(cx - 4, ob.y + 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 10, ob.y + 7); ctx.lineTo(cx + 16, ob.y - 6); ctx.lineTo(cx + 4, ob.y + 5); ctx.fill();
      // eyes
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.ellipse(cx - 6, ob.y + 16, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 6, ob.y + 16, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(cx - 6, ob.y + 17, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 6, ob.y + 17, 3, 0, Math.PI * 2); ctx.fill();
      // grin
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, ob.y + 24, 6, 0, Math.PI); ctx.stroke();
      break;
    }

    case 'squid': {
      const wave = Math.sin(Date.now() / 350);
      // tentacles
      ctx.strokeStyle = '#7e22ce'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let t = 0; t < 8; t++) {
        const ang = (t / 8) * Math.PI * 2;
        const tx = cx + Math.cos(ang) * 20;
        const ty = ob.y + h2 * 0.6;
        const endX = cx + Math.cos(ang) * (30 + t * 2);
        const endY = ob.y + h2 * (0.8 + (t % 3) * 0.1) + wave * 8;
        ctx.beginPath(); ctx.moveTo(tx, ty);
        ctx.bezierCurveTo(tx, ty + 20, endX, endY - 10, endX, endY); ctx.stroke();
      }
      // mantle (body)
      const sg = ctx.createRadialGradient(cx, cy - 5, 4, cx, cy - 5, 25);
      sg.addColorStop(0, '#c084fc'); sg.addColorStop(1, '#7e22ce');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.ellipse(cx, cy - 8, 22, 30, 0, 0, Math.PI * 2); ctx.fill();
      // top fin
      ctx.fillStyle = '#a855f7';
      ctx.beginPath(); ctx.moveTo(cx - 8, ob.y + 8); ctx.lineTo(cx, ob.y); ctx.lineTo(cx + 8, ob.y + 8); ctx.fill();
      // eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(cx - 8, cy - 10, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 8, cy - 10, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath(); ctx.ellipse(cx - 8, cy - 10, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 8, cy - 10, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - 6, cy - 12, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 10, cy - 12, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }

    default: {
      // Fallback: coloured rectangle with emoji
      ctx.fillStyle = selectedWorld.obstacle ? selectedWorld.obstacle.color : '#888';
      ctx.beginPath(); ctx.roundRect(ob.x, ob.y, OBS_W, OBS_H, 10); ctx.fill();
      ctx.font = `${OBS_H * 0.7}px serif`; ctx.textAlign = 'center';
      ctx.fillText(selectedWorld.obstacle ? selectedWorld.obstacle.emoji : '❓', cx, ob.y + OBS_H * 0.75);
      break;
    }
  }

  // Label
  ctx.globalAlpha = 1;
  ctx.restore();

  // Hit-splash ring when obstacle is struck
  if (ob.hitFlash > 0) {
    const p = ob.hitFlash / 14;
    ctx.save();
    ctx.globalAlpha = p * 0.7;
    ctx.strokeStyle = '#60b8f5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, OBS_W * 0.6 + (1 - p) * 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function updateObstacle() {
  if (!obstacle) return;
  const ob = obstacle;
  const topLimit    = groundY - OBS_H * 2.2;   // how high it can go
  const bottomLimit = groundY - OBS_H;          // resting on the ground

  ob.y += ob.vy;

  // Bounce at top and bottom
  if (ob.y <= topLimit)    { ob.y = topLimit;    ob.vy =  Math.abs(ob.vy); }
  if (ob.y >= bottomLimit) { ob.y = bottomLimit; ob.vy = -Math.abs(ob.vy); }

  if (ob.hitFlash > 0) ob.hitFlash--;
}

// ─── Characters ───────────────────────────────────────
const CHARACTERS = [
  { emoji: '🧑', name: 'Boy',      color: '#3b82f6' },
  { emoji: '👧', name: 'Girl',     color: '#ec4899' },
  { emoji: '👸', name: 'Princess', color: '#a855f7' },
  { emoji: '🤴', name: 'Prince',   color: '#f59e0b' },
  { emoji: '🐸', name: 'Frog',     color: '#22c55e' },
  { emoji: '🐼', name: 'Panda',    color: '#64748b' },
  { emoji: '🦊', name: 'Fox',      color: '#f97316' },
  { emoji: '🐱', name: 'Cat',      color: '#8b5cf6' },
  { emoji: '🐶', name: 'Dog',      color: '#84cc16' },
  { emoji: '🦄', name: 'Unicorn',  color: '#ec4899' },
  { emoji: '🤖', name: 'Robot',    color: '#06b6d4' },
  { emoji: '👻', name: 'Ghost',    color: '#94a3b8' },
  { emoji: '🧙', name: 'Wizard',   color: '#7c3aed' },
  { emoji: '🦸', name: 'Hero',     color: '#dc2626' },
  { emoji: '🧜', name: 'Mermaid',  color: '#0891b2' },
  { emoji: '🐲', name: 'Dragon',   color: '#16a34a' },
];

// ─── DOM ──────────────────────────────────────────────
const screenMenu     = document.getElementById('screen-menu');
const screenChars    = document.getElementById('screen-chars');
const screenControls = document.getElementById('screen-controls');
const screenGame     = document.getElementById('screen-game');
const screenGameover = document.getElementById('screen-gameover');
const canvas         = document.getElementById('game-canvas');
const ctx            = canvas.getContext('2d');

const btn1P          = document.getElementById('btn-1p');
const btn2P          = document.getElementById('btn-2p');

const screenDiff     = document.getElementById('screen-diff');
const btnDiffEasy    = document.getElementById('btn-diff-easy');
const btnDiffMedium  = document.getElementById('btn-diff-medium');
const btnDiffHard    = document.getElementById('btn-diff-hard');
const btnDiffBack    = document.getElementById('btn-diff-back');
const btnDiffNext    = document.getElementById('btn-diff-next');

const charTitle      = document.getElementById('char-title');
const charStep       = document.getElementById('char-step');
const charGrid       = document.getElementById('char-grid');
const charSelectedRow= document.getElementById('char-selected-row');
const btnCharBack    = document.getElementById('btn-char-back');
const btnCharNext    = document.getElementById('btn-char-next');

const btnCtrlBack    = document.getElementById('btn-ctrl-back');
const chosenCharsEl  = document.getElementById('chosen-characters');
const controlsBody   = document.getElementById('controls-body');
const btnPlay        = document.getElementById('btn-play');

const screenWorld    = document.getElementById('screen-world');
const worldGrid      = document.getElementById('world-grid');
const btnWorldBack   = document.getElementById('btn-world-back');
const btnWorldNext   = document.getElementById('btn-world-next');

const screenCannon   = document.getElementById('screen-cannon');
const cannonGrid     = document.getElementById('cannon-grid');
const btnCannonBack  = document.getElementById('btn-cannon-back');
const btnCannonNext  = document.getElementById('btn-cannon-next');
const cannonStep     = document.getElementById('cannon-step');

const nameLeftEl     = document.getElementById('name-left');
const nameRightEl    = document.getElementById('name-right');
const heartsLeftEl   = document.getElementById('hearts-left');
const heartsRightEl  = document.getElementById('hearts-right');
const btnPause       = document.getElementById('btn-pause');
const pauseOverlay   = document.getElementById('pause-overlay');
const btnResume      = document.getElementById('btn-resume');
const btnMenuPause   = document.getElementById('btn-menu-back-pause');

const winnerText     = document.getElementById('winner-text');
const finalScore     = document.getElementById('final-score');
const btnRematch     = document.getElementById('btn-rematch');
const btnMenuGO      = document.getElementById('btn-menu-back-go');

// Side panels
const sidePanelLeft   = document.getElementById('side-panel-left');
const sidePanelRight  = document.getElementById('side-panel-right');
const spEmojiLeft     = document.getElementById('sp-emoji-left');
const spEmojiRight    = document.getElementById('sp-emoji-right');
const spCharnameLeft  = document.getElementById('sp-charname-left');
const spCharnameRight = document.getElementById('sp-charname-right');
const spCannonLeft    = document.getElementById('sp-cannon-left');
const spCannonRight   = document.getElementById('sp-cannon-right');
const spHpLeft        = document.getElementById('sp-hp-left');
const spHpRight       = document.getElementById('sp-hp-right');
const spShotsLeft     = document.getElementById('sp-shots-left');
const spShotsRight    = document.getElementById('sp-shots-right');
const spHitsLeft      = document.getElementById('sp-hits-left');
const spHitsRight     = document.getElementById('sp-hits-right');
const spMegaLeft      = document.getElementById('sp-mega-left');
const spMegaRight     = document.getElementById('sp-mega-right');
const spCtrlRight1    = document.getElementById('sp-ctrl-right-1');
const spCtrlRight2    = document.getElementById('sp-ctrl-right-2');
const spCtrlRight3    = document.getElementById('sp-ctrl-right-3');

// ─── State ────────────────────────────────────────────
let mode        = null;
let paused      = false;
let gameRunning = false;
let animId      = null;
let groundY     = 400;

const keys = {};
let players, balloons, splashes;

// character selection
let charChoices    = { left: CHARACTERS[0], right: CHARACTERS[0] };
let charSelectStep = 0;   // 0 = picking for left/P1, 1 = picking for right/P2-or-AI
let aiDifficulty   = 'medium'; // 'easy' | 'medium' | 'hard'

// cannon selection
let cannonChoices    = { left: CANNONS[0], right: CANNONS[0] };
let cannonSelectStep = 0; // 0 = left/P1, 1 = right/P2-or-AI

// Charge (hold-to-shoot) state — kept as stub so side-panel trajectory code compiles
const chargeState = { left: null, right: null };

// AI wander state
let aiWanderTarget = null;
let aiWanderTimer  = 0;
let aiDesiredAngle = -0.38; // continuously tracked target cannon angle
let aiDesiredSpeed = THROW_SPEED; // speed chosen at each aim recalc
let aiAimTimer     = 0;     // frames until next aim recalculation

// world selection
let selectedWorld  = WORLDS[0]; // default: first world (Sunny Meadow)

// obstacle
let obstacle = null;

// game stats (shots fired, hits landed)
let stats = { left: { shots: 0, hits: 0 }, right: { shots: 0, hits: 0 } };

// ─── Rainbow Bubble (one-time power-up) ───────────────
// rainbowBubble: null | { x, y, vx, vy, r, frame, alive }
// megaBalls: array of { x, y, vx, vy, owner, alive, frame, r }
let rainbowBubble        = null;
let rainbowBubbleSpawned = false;   // true while a bubble is alive or in cooldown between spawns
let rainbowBubbleTimer   = 0;       // countdown to next spawn
let megaBalls            = [];      // active mega-balls
const MEGA_R             = 32;      // radius of the mega-ball
const MEGA_DAMAGE        = 5;       // lives removed on hit

// ─── Sound engine (Web Audio API — no files needed) ───
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const t = audioCtx.currentTime;

  switch (type) {

    case 'throw': {
      // short "fwoosh" — descending noise burst
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.18, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.8);
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const filt = audioCtx.createBiquadFilter();
      filt.type = 'bandpass'; filt.frequency.value = 900; filt.Q.value = 0.8;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      src.connect(filt); filt.connect(gain); gain.connect(audioCtx.destination);
      src.start(t); break;
    }

    case 'splash': {
      // "splat" — noise + low thud
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.2);
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const filt = audioCtx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 600;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      src.connect(filt); filt.connect(gain); gain.connect(audioCtx.destination);
      src.start(t); break;
    }

    case 'hit': {
      // "OOF" — low thud + pitch-dropped tone
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + 0.22);
      // noise layer
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.12, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
      const ns = audioCtx.createBufferSource(); ns.buffer = buf;
      const ng = audioCtx.createGain(); ng.gain.setValueAtTime(0.3, t);
      ns.connect(ng); ng.connect(audioCtx.destination); ns.start(t);
      break;
    }

    case 'jump': {
      // soft "boing"
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + 0.18); break;
    }

    case 'win': {
      // cheerful ascending fanfare
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        const gain = audioCtx.createGain();
        const st = t + i * 0.13;
        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.18, st + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.22);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(st); osc.stop(st + 0.22);
      }); break;
    }

    case 'lose': {
      // sad descending tones
      const notes = [392, 330, 262, 196];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const gain = audioCtx.createGain();
        const st = t + i * 0.16;
        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.2, st + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.28);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(st); osc.stop(st + 0.28);
      }); break;
    }

    case 'bubblePop': {
      // magical sparkle pop — ascending shimmer
      const popNotes = [523, 659, 784, 1047, 1319];
      popNotes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = audioCtx.createGain();
        const st = t + i * 0.055;
        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.28, st + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.22);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(st); osc.stop(st + 0.25);
      }); break;
    }

    case 'megaHit': {
      // big booming crash
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.55, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 0.7) * 0.9;
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      src.connect(gain); gain.connect(audioCtx.destination);
      src.start(t); break;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────
function rnd(a, b) { return Math.random() * (b - a) + a; }

function hearts(hp) {
  return `❤️×${Math.max(hp, 0)}`;
}

// ─── K-Pop Menu Music (Web Audio API synthesizer) ─────
const menuMusic = (() => {
  let ctx2 = null;
  let masterGain = null;
  let schedulerTimer = null;
  let startTime = 0;
  let beatIndex = 0;
  let playing = false;

  const BPM = 128;
  const BEAT = 60 / BPM;
  const BAR  = BEAT * 4;

  // K-pop synth lead melody (notes as semitones from A4=69, null=rest)
  // Catchy 8-bar loop — bright "idol group" style
  const MELODY = [
    // bar 1
    69, null, 72, null, 74, 74, 76, null,
    // bar 2
    74, null, 72, null, 69, null, null, null,
    // bar 3
    71, null, 74, null, 76, 76, 79, null,
    // bar 4
    77, null, 76, null, 74, null, null, null,
    // bar 5  (repeat with variation)
    69, null, 72, null, 74, 72, 74, null,
    // bar 6
    76, null, 74, null, 72, null, 71, null,
    // bar 7
    72, null, 76, null, 79, 79, 81, null,
    // bar 8
    79, null, 77, null, 76, null, null, null,
  ];

  // Bass line (root + fifth bounce)
  const BASS = [
    57, null, 57, null, 52, null, 52, null,
    57, null, 57, null, 52, null, 52, null,
    60, null, 60, null, 55, null, 55, null,
    60, null, 60, null, 55, null, 55, null,
    57, null, 57, null, 52, null, 52, null,
    57, null, 57, null, 52, null, 52, null,
    60, null, 60, null, 55, null, 55, null,
    60, null, 60, null, 55, null, 55, null,
  ];

  function midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function playNote(freq, startT, dur, type, gainVal, detune = 0) {
    const osc  = ctx2.createOscillator();
    const gain = ctx2.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0.001, startT);
    gain.gain.linearRampToValueAtTime(gainVal, startT + 0.01);
    gain.gain.setValueAtTime(gainVal, startT + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startT);
    osc.stop(startT + dur + 0.05);
  }

  function playDrum(startT, type) {
    if (type === 'kick') {
      const osc = ctx2.createOscillator();
      const g   = ctx2.createGain();
      osc.frequency.setValueAtTime(160, startT);
      osc.frequency.exponentialRampToValueAtTime(40, startT + 0.08);
      g.gain.setValueAtTime(0.8, startT);
      g.gain.exponentialRampToValueAtTime(0.001, startT + 0.22);
      osc.connect(g); g.connect(masterGain);
      osc.start(startT); osc.stop(startT + 0.25);
    } else if (type === 'snare') {
      const buf  = ctx2.createBuffer(1, ctx2.sampleRate * 0.12, ctx2.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
      const src = ctx2.createBufferSource();
      src.buffer = buf;
      const filt = ctx2.createBiquadFilter();
      filt.type = 'highpass'; filt.frequency.value = 1200;
      const g = ctx2.createGain();
      g.gain.setValueAtTime(0.55, startT);
      g.gain.exponentialRampToValueAtTime(0.001, startT + 0.12);
      src.connect(filt); filt.connect(g); g.connect(masterGain);
      src.start(startT);
    } else if (type === 'hihat') {
      const buf  = ctx2.createBuffer(1, ctx2.sampleRate * 0.045, ctx2.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      const src = ctx2.createBufferSource();
      src.buffer = buf;
      const filt = ctx2.createBiquadFilter();
      filt.type = 'highpass'; filt.frequency.value = 8000;
      const g = ctx2.createGain();
      g.gain.setValueAtTime(0.25, startT);
      g.gain.exponentialRampToValueAtTime(0.001, startT + 0.045);
      src.connect(filt); filt.connect(g); g.connect(masterGain);
      src.start(startT);
    }
  }

  // Schedule ahead by ~0.5 s
  const LOOKAHEAD = 0.5;

  function scheduleBar(barIdx) {
    const mi = barIdx % (MELODY.length / 8);
    const t0 = startTime + barIdx * BAR;

    for (let step = 0; step < 8; step++) {
      const stepT = t0 + step * BEAT * 0.5;
      const noteIdx = mi * 8 + step;

      // Melody — bright sawtooth + slight detune for "idol synth" sound
      const mel = MELODY[noteIdx];
      if (mel !== null) {
        const hz = midiToHz(mel);
        playNote(hz, stepT, BEAT * 0.45, 'sawtooth', 0.18, 0);
        playNote(hz, stepT, BEAT * 0.45, 'sawtooth', 0.10, 8);   // chorus detune
      }

      // Bass — square sub
      const bas = BASS[noteIdx];
      if (bas !== null) {
        playNote(midiToHz(bas - 12), stepT, BEAT * 0.48, 'square', 0.28);
      }

      // Drums: kick on 1&3, snare on 2&4, hihats every 8th
      if (step === 0 || step === 4) playDrum(stepT, 'kick');
      if (step === 2 || step === 6) playDrum(stepT, 'snare');
      playDrum(stepT, 'hihat');

      // Chord pad (warm strings feel) — play on beat 1 of each bar
      if (step === 0) {
        const chordRoots = [69, 64, 60]; // Am chord (A4, E4, C4) — very K-pop minor key
        if (mi >= 2 && mi < 4) chordRoots.splice(0, 3, 71, 67, 64); // Em
        if (mi >= 4 && mi < 6) chordRoots.splice(0, 3, 72, 67, 64); // C
        chordRoots.forEach(n => {
          playNote(midiToHz(n), stepT, BAR * 0.95, 'sine', 0.08);
        });
      }
    }
  }

  function scheduler() {
    if (!playing) return;
    const now = ctx2.currentTime;
    // Schedule bars until we're LOOKAHEAD seconds ahead
    while (startTime + beatIndex * BAR < now + LOOKAHEAD) {
      scheduleBar(beatIndex);
      beatIndex++;
    }
    schedulerTimer = setTimeout(scheduler, 100);
  }

  let pendingStart = false;

  function _doStart() {
    if (!ctx2) {
      ctx2 = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx2.createGain();
      masterGain.gain.value = 0.38;
      // slight reverb via convolver
      const rev = ctx2.createConvolver();
      const bufLen = ctx2.sampleRate * 1.5;
      const revBuf = ctx2.createBuffer(2, bufLen, ctx2.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = revBuf.getChannelData(ch);
        for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2);
      }
      rev.buffer = revBuf;
      const dryGain = ctx2.createGain(); dryGain.gain.value = 0.75;
      const wetGain = ctx2.createGain(); wetGain.gain.value = 0.25;
      masterGain.connect(dryGain); dryGain.connect(ctx2.destination);
      masterGain.connect(rev);     rev.connect(wetGain); wetGain.connect(ctx2.destination);
    }
    const resume = ctx2.state === 'suspended' ? ctx2.resume() : Promise.resolve();
    resume.then(() => {
      if (!playing) return;
      beatIndex = 0;
      startTime = ctx2.currentTime + 0.05;
      scheduler();
    });
  }

  // Unlock audio on first user gesture anywhere on the page
  document.addEventListener('click', function _unlock() {
    if (pendingStart && ctx2 && ctx2.state === 'suspended') {
      ctx2.resume().then(() => {
        if (playing && !schedulerTimer) {
          beatIndex = 0;
          startTime = ctx2.currentTime + 0.05;
          scheduler();
        }
      });
    } else if (pendingStart) {
      pendingStart = false;
      _doStart();
    }
  }, { capture: true });

  return {
    start() {
      if (playing) return;
      playing = true;
      if (ctx2 && ctx2.state !== 'suspended') {
        // AudioContext already unlocked (user has interacted before)
        beatIndex = 0;
        startTime = ctx2.currentTime + 0.05;
        scheduler();
      } else {
        // Mark as pending — will fire on next user click
        pendingStart = true;
        _doStart(); // attempt immediately (works if already unlocked)
      }
    },
    stop() {
      playing = false;
      pendingStart = false;
      clearTimeout(schedulerTimer);
      if (ctx2) {
        masterGain.gain.setTargetAtTime(0, ctx2.currentTime, 0.3);
        setTimeout(() => {
          masterGain.gain.value = 0.38;
        }, 1500);
      }
    },
  };
})();

// ─── Resize ───────────────────────────────────────────
function resizeCanvas() {
  const maxW = Math.min(window.innerWidth, 860);
  const maxH = Math.min(window.innerHeight - 60, 480);
  canvas.width  = maxW;
  canvas.height = maxH;
  groundY = canvas.height - 70;
}

// ─── Player factory ───────────────────────────────────
function makePlayer(side, charDef, cannonDef) {
  const isLeft = side === 'left';
  return {
    side,
    x:      isLeft ? 80 : canvas.width - 80 - PLAYER_W,
    y:      groundY - PLAYER_H,
    vy:     0,
    onGround: true,
    hp:     MAX_HP,
    cooldown: 0,
    hitFlash: 0,
    emoji:  charDef.emoji,
    color:  charDef.color,
    cannon: cannonDef,
    cannonAngle: -0.38,           // current aiming angle (radians, negative = upward)
    hasMegaBall: false,           // true when player collected the rainbow bubble prize
    // movement limits: left player stays left of centre, right player stays right
    minX:   isLeft ? 10                        : canvas.width / 2 + 10,
    maxX:   isLeft ? canvas.width / 2 - PLAYER_W - 10 : canvas.width - PLAYER_W - 10,
  };
}

// ─── Cannon geometry helper ───────────────────────────
// Returns { tipX, tipY, vx, vy } for a player given their current cannonAngle.
// speedOverride, if provided, replaces the cannon's default speed.
function cannonLaunch(owner, speedOverride) {
  const goRight   = owner.side === 'left';
  const barrelLen = 22;
  const angle     = owner.cannonAngle;          // negative = upward
  const pivotX    = goRight ? owner.x + PLAYER_W - 4 : owner.x + 4;
  const pivotY    = owner.y + 36;
  const dir       = goRight ? 1 : -1;
  const baseSpeed = THROW_SPEED * (owner.cannon ? owner.cannon.speedMult : 1);
  const speed     = speedOverride !== undefined ? speedOverride : baseSpeed;
  const tipX = pivotX + dir * barrelLen * Math.cos(angle);
  const tipY = pivotY +       barrelLen * Math.sin(angle);
  const vx = dir * speed * Math.cos(angle);
  const vy =       speed * Math.sin(angle);   // negative because angle is negative
  return { tipX, tipY, vx, vy };
}

// ─── Balloon factory ──────────────────────────────────
function makeBalloon(owner, speedOverride) {
  const { tipX, tipY, vx, vy } = cannonLaunch(owner, speedOverride);
  const c = owner.cannon || CANNONS[0];
  return {
    x: tipX, y: tipY,
    vx, vy,
    owner: owner.side,
    alive: true,
    style:  c.style,
    radius: BALLOON_R * c.sizeMult,
    hue:    Math.random() * 360, // for rainbow
    frame:  0,                   // for animation
  };
}

// ─── Splash factory ───────────────────────────────────
function makeSplash(x, y) {
  return {
    x, y,
    life: SPLASH_FRAMES,
    drops: Array.from({ length: 14 }, () => ({
      dx: rnd(-28, 28), dy: rnd(-18, 4),
      ddx: rnd(-0.2, 0.2), ddy: 0.6,
    })),
  };
}

// ─── Trajectory preview ───────────────────────────────
// Simulates the full flight path at fixed launch speed, including obstacle
// deflection and ground bounces.  Returns array of { x, y, bounce }.
function trajectoryPoints(owner) {
  const isMega   = owner.hasMegaBall;
  const grav     = BALLOON_GRAV * (isMega ? 0.4 : 1.0);
  const speed    = isMega ? THROW_SPEED * 0.6 : THROW_SPEED;

  const { tipX, tipY, vx: vx0, vy: vy0 } = cannonLaunch(owner, speed);
  const r = isMega ? MEGA_R : BALLOON_R * (owner.cannon ? owner.cannon.sizeMult : 1);

  // Obstacle snapshot
  const ob = obstacle;
  const obsLeft   = ob ? ob.x - r         : -99999;
  const obsRight  = ob ? ob.x + OBS_W + r : -99999;
  const obsTop    = ob ? ob.y - r         : -99999;
  const obsBottom = ob ? ob.y + OBS_H + r : -99999;

  let x = tipX, y = tipY, vx = vx0, vy = vy0;
  const pts = [];
  let bounces = 0;
  const MAX_BOUNCES = isMega ? 1 : 0; // mega bounces 1×, balloons don't

  for (let i = 0; i < TRAJ_STEPS; i++) {
    vy += grav;
    x  += vx;
    y  += vy;

    // Ground bounce / stop
    if (y + r >= groundY) {
      if (MAX_BOUNCES > 0 && bounces < MAX_BOUNCES) {
        y  = groundY - r;
        vy = -Math.abs(vy) * 0.58;
        vx *= 0.82;
        bounces++;
        pts.push({ x, y, bounce: true });
      } else {
        pts.push({ x, y: groundY - r, bounce: true });
        break;
      }
    }

    // Obstacle — deflect off the surface
    if (ob && x >= obsLeft && x <= obsRight && y >= obsTop && y <= obsBottom) {
      // Determine which face was hit (horizontal vs vertical)
      const prevX = x - vx, prevY = y - vy;
      const fromLeft  = prevX < ob.x;
      const fromRight = prevX > ob.x + OBS_W;
      if (fromLeft || fromRight) {
        vx = -vx * 0.6;
        x  = fromLeft ? obsLeft - 1 : obsRight + 1;
      } else {
        vy = -vy * 0.6;
        y  = prevY < ob.y ? obsTop - 1 : obsBottom + 1;
      }
      pts.push({ x, y, bounce: true });
      continue;
    }

    // Off canvas — stop drawing
    if (x < -r * 2 || x > canvas.width + r * 2) break;

    pts.push({ x, y, bounce: false });
  }
  return pts;
}

// ─── Init game ────────────────────────────────────────
function startGame() {
  resizeCanvas();
  players  = [
    makePlayer('left',  charChoices.left,  cannonChoices.left),
    makePlayer('right', charChoices.right, cannonChoices.right),
  ];
  balloons = [];
  splashes = [];
  megaBalls            = [];
  rainbowBubble        = null;
  rainbowBubbleSpawned = false;
  rainbowBubbleTimer   = 60 * 10 + Math.floor(Math.random() * 60 * 5); // first bubble: 10–15 s
  stats = { left: { shots: 0, hits: 0 }, right: { shots: 0, hits: 0 } };
  initObstacle();
  aiWanderTarget = null;
  aiWanderTimer  = 0;
  aiDesiredAngle = -0.38;
  aiDesiredSpeed = THROW_SPEED;
  aiAimTimer     = 0;

  if (mode === '1p') {
    nameLeftEl.textContent  = charChoices.left.name;
    nameRightEl.textContent = 'AI ' + charChoices.right.emoji;
  } else {
    nameLeftEl.textContent  = 'P1 ' + charChoices.left.emoji;
    nameRightEl.textContent = 'P2 ' + charChoices.right.emoji;
  }

  updateHUD();
  initSidePanels();
  paused = false;
  pauseOverlay.classList.add('hidden');
  showScreen(screenGame);
  gameRunning = true;
  if (animId) cancelAnimationFrame(animId);
  loop();
}

// ─── HUD ──────────────────────────────────────────────
function updateHUD() {
  heartsLeftEl.textContent  = hearts(players[0].hp);
  heartsRightEl.textContent = hearts(players[1].hp);
}

// ─── Side panels ──────────────────────────────────────
function initSidePanels() {
  const [left, right] = players;
  // Character info
  spEmojiLeft.textContent     = left.emoji;
  spEmojiRight.textContent    = right.emoji;
  spCharnameLeft.textContent  = charChoices.left  ? charChoices.left.name  : left.emoji;
  spCharnameRight.textContent = charChoices.right ? charChoices.right.name : right.emoji;
  // Cannon info
  const cl = left.cannon  || CANNONS[0];
  const cr = right.cannon || CANNONS[0];
  spCannonLeft.textContent  = cl.name;
  spCannonRight.textContent = cr.name;
  // 2p controls label
  if (mode === '2p') {
    spCtrlRight1.innerHTML = '<kbd>←</kbd><kbd>→</kbd> Move';
    spCtrlRight2.innerHTML = '<kbd>↑</kbd><kbd>↓</kbd> Aim';
    spCtrlRight3.innerHTML = '<kbd>M</kbd> Throw';
  } else {
    spCtrlRight1.innerHTML = '🤖 AI';
    spCtrlRight2.innerHTML = '';
    spCtrlRight3.innerHTML = '';
  }
  updateSidePanels();
  // Show panels — only if there's room beside the canvas (need ~260px total for two 130px panels)
  const spaceAvailable = window.innerWidth - Math.min(window.innerWidth, 860);
  if (spaceAvailable >= 260) {
    sidePanelLeft.classList.add('visible');
    sidePanelRight.classList.add('visible');
  } else {
    sidePanelLeft.classList.remove('visible');
    sidePanelRight.classList.remove('visible');
  }
}

function updateSidePanels() {
  if (!players || players.length < 2) return;
  const [left, right] = players;
  spHpLeft.textContent    = left.hp;
  spHpRight.textContent   = right.hp;
  spShotsLeft.textContent  = stats.left.shots;
  spShotsRight.textContent = stats.right.shots;
  spHitsLeft.textContent   = stats.left.hits;
  spHitsRight.textContent  = stats.right.hits;
  // Mega-ball status
  if (left.hasMegaBall) {
    spMegaLeft.textContent = '🌈 READY!';
    spMegaLeft.classList.add('ready');
  } else {
    spMegaLeft.textContent = '—';
    spMegaLeft.classList.remove('ready');
  }
  if (right.hasMegaBall) {
    spMegaRight.textContent = '🌈 READY!';
    spMegaRight.classList.add('ready');
  } else {
    spMegaRight.textContent = '—';
    spMegaRight.classList.remove('ready');
  }
}

// ─── Input helpers ────────────────────────────────────
function tryJump(p) {
  if (p.onGround) { p.vy = JUMP_VY; p.onGround = false; playSound('jump'); }
}

function tryThrow(p, speedOverride) {
  if (p.cooldown <= 0) {
    if (p.hasMegaBall) {
      // Fire the mega-ball from the cannon barrel along the current aim angle
      const launchSpeed = (speedOverride !== undefined && speedOverride > 0) ? speedOverride : THROW_SPEED;
      const { tipX, tipY, vx, vy } = cannonLaunch(p, launchSpeed);
      megaBalls.push({
        x: tipX, y: tipY,
        vx: vx * 0.6, vy: vy * 0.6,
        owner: p.side,
        alive: true,
        frame: 0,
        r: MEGA_R,
      });
      p.hasMegaBall = false;
      const c = p.cannon || CANNONS[0];
      p.cooldown = Math.round(THROW_COOL * c.coolMult * 1.5);
      stats[p.side].shots++;
      updateSidePanels();
      playSound('bubblePop');
    } else {
      balloons.push(makeBalloon(p, speedOverride));
      const c = p.cannon || CANNONS[0];
      p.cooldown = Math.round(THROW_COOL * c.coolMult);
      stats[p.side].shots++;
      updateSidePanels();
      playSound('throw');
    }
  }
}

// ─── AI logic ─────────────────────────────────────────
function updateAI(ai) {
  const prof = AI_PROFILES[aiDifficulty];
  const [left] = players;                        // human player

  // ── Dodge incoming balloon (gentle strafe, not a teleport) ──
  const threat = balloons.find(b =>
    b.owner === 'left' && b.alive && b.x > canvas.width * 0.45
  );
  if (threat && Math.random() < prof.react * 0.05) {
    // Small nudge away from the balloon's travel direction
    const dodgeDir = threat.vx > 0 ? 1 : -1;
    ai.x = Math.max(ai.minX, Math.min(ai.maxX, ai.x + dodgeDir * prof.moveSpeed));
  }

  // ── Continuous wandering movement ──
  aiWanderTimer--;
  if (aiWanderTimer <= 0 || aiWanderTarget === null) {
    const range = ai.maxX - ai.minX;
    aiWanderTarget = ai.minX + Math.random() * range;
    aiWanderTimer = aiDifficulty === 'easy'   ? 120 + Math.random() * 120
                  : aiDifficulty === 'medium' ?  70 + Math.random() *  80
                  :                               35 + Math.random() *  45;
  }
  const wanderDx = aiWanderTarget - (ai.x + PLAYER_W / 2);
  if (Math.abs(wanderDx) > 8) {
    ai.x = Math.max(ai.minX, Math.min(ai.maxX,
      ai.x + Math.sign(wanderDx) * prof.moveSpeed
    ));
  }

  // ── Aim tracking: recalculate target angle every N frames, then smoothly sweep toward it ──
  aiAimTimer--;
  if (aiAimTimer <= 0) {
    // How often to recalculate (less frequent = smoother-looking movement)
    aiAimTimer = aiDifficulty === 'easy'   ? 25 + Math.random() * 25
               : aiDifficulty === 'medium' ? 12 + Math.random() * 12
               :                              5 + Math.random() *  6;

    const targetCX = left.x + PLAYER_W / 2;
    // AI always shoots at the same fixed speed, just like the player
    aiDesiredSpeed = THROW_SPEED;
    const aimAngle = solveAimAngle(ai, targetCX, aiDesiredSpeed);
    if (aimAngle !== null) {
      // Apply noise once per recalc, not every frame — this is what stopped the shaking
      const noise = (Math.random() - 0.5) * 2 * prof.aimNoise;
      aiDesiredAngle = Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, aimAngle + noise));
    }
  }
  // Smoothly move cannon toward the stable desired angle
  const aimStep = AIM_SPEED * prof.aimSpeed;
  if (ai.cannonAngle < aiDesiredAngle - 0.008) {
    ai.cannonAngle = Math.min(ai.cannonAngle + aimStep, aiDesiredAngle);
  } else if (ai.cannonAngle > aiDesiredAngle + 0.008) {
    ai.cannonAngle = Math.max(ai.cannonAngle - aimStep, aiDesiredAngle);
  }

  // ── Throw when cooldown is ready AND barrel is on target AND path is clear ──
  const aimTolerance = 0.06 + (aiDifficulty === 'easy' ? 0.10 : aiDifficulty === 'medium' ? 0.05 : 0.02);
  const barrelOnTarget = Math.abs(ai.cannonAngle - aiDesiredAngle) <= aimTolerance;
  if (ai.cooldown <= prof.throwDelay && barrelOnTarget) {
    // Pre-fire blocked check: simulate current barrel angle + chosen speed against the live obstacle
    const goRight   = ai.side === 'left';
    const barrelLen = 22;
    const pivotX    = goRight ? ai.x + PLAYER_W - 4 : ai.x + 4;
    const pivotY    = ai.y + 38;
    const dir       = goRight ? 1 : -1;
    const fireSpeed = aiDesiredSpeed * (ai.cannon ? ai.cannon.speedMult : 1);
    let x  = pivotX + dir * barrelLen * Math.cos(ai.cannonAngle);
    let y  = pivotY +       barrelLen * Math.sin(ai.cannonAngle);
    let vx = dir * fireSpeed * Math.cos(ai.cannonAngle);
    let vy = fireSpeed * Math.sin(ai.cannonAngle);
    const ob        = obstacle;
    const obsLeft   = ob ? ob.x - BALLOON_R         : -9999;
    const obsRight  = ob ? ob.x + OBS_W + BALLOON_R : -9999;
    const obsTop    = ob ? ob.y - BALLOON_R          : -9999;
    const obsBottom = ob ? ob.y + OBS_H + BALLOON_R  : -9999;
    let shotBlocked = false;
    for (let i = 0; i < 300; i++) {
      vy += BALLOON_GRAV; x += vx; y += vy;
      if (y + BALLOON_R >= groundY || x < -50 || x > canvas.width + 50) break;
      if (ob && x >= obsLeft && x <= obsRight && y >= obsTop && y <= obsBottom) {
        shotBlocked = true; break;
      }
    }
    if (!shotBlocked) {
      tryThrow(ai, aiDesiredSpeed);
      // Force a flat 6-second cooldown for the AI regardless of cannon type (360 frames @ 60 fps)
      if (ai.cooldown > 0) ai.cooldown = 360;
    }
  }
}

// Finds the cannon angle that sends a balloon through (targetCX, any y).
// Returns null if no clear path exists (AI should hold fire).
function solveAimAngle(ai, targetCX, launchSpeed) {
  const speed     = (launchSpeed !== undefined ? launchSpeed : THROW_SPEED)
                    * (ai.cannon ? ai.cannon.speedMult : 1);
  const goRight   = ai.side === 'left';
  const barrelLen = 22;
  const pivotX    = goRight ? ai.x + PLAYER_W - 4 : ai.x + 4;
  const pivotY    = ai.y + 38;
  const dir       = goRight ? 1 : -1;

  // Snapshot obstacle once for the whole search
  const ob         = obstacle;
  const obsLeft    = ob ? ob.x - BALLOON_R         : -9999;
  const obsRight   = ob ? ob.x + OBS_W + BALLOON_R : -9999;
  const obsTop     = ob ? ob.y - BALLOON_R          : -9999;
  const obsBottom  = ob ? ob.y + OBS_H + BALLOON_R  : -9999;

  // Simulate one angle; returns { landX, blocked }
  const testAngle = (angle) => {
    let x  = pivotX + dir * barrelLen * Math.cos(angle);
    let y  = pivotY +       barrelLen * Math.sin(angle);
    let vx = dir * speed * Math.cos(angle);
    let vy = speed * Math.sin(angle);
    for (let i = 0; i < 300; i++) {
      vy += BALLOON_GRAV; x += vx; y += vy;
      if (y + BALLOON_R >= groundY) return { landX: x, blocked: false };
      if (x < -50 || x > canvas.width + 50) return { landX: x, blocked: false };
      if (ob && x >= obsLeft && x <= obsRight && y >= obsTop && y <= obsBottom) {
        return { landX: x, blocked: true };
      }
    }
    return { landX: x, blocked: false };
  };

  // ── Step 1: binary-search the "direct" angle that lands on targetCX ──
  const { landX: xLo } = testAngle(ANGLE_MIN);
  const { landX: xHi } = testAngle(ANGLE_MAX);
  const reachable = targetCX >= Math.min(xLo, xHi) && targetCX <= Math.max(xLo, xHi);

  let directAngle = null;
  if (reachable) {
    let lo = ANGLE_MIN, hi = ANGLE_MAX;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const { landX: xMid } = testAngle(mid);
      if (goRight ? xMid < targetCX : xMid > targetCX) hi = mid;
      else lo = mid;
    }
    directAngle = (lo + hi) / 2;
    // If direct path is clear, use it immediately
    if (!testAngle(directAngle).blocked) return directAngle;
  }

  // ── Step 2: obstacle is blocking — scan many angles, find ones that land on
  //    target AND are unblocked, then pick the one closest to flat (travels furthest) ──
  const SCAN_STEPS = 60;
  const tolerance  = canvas.width * 0.06;   // ±~50px landing tolerance
  let bestAngle    = null;
  let bestDist     = Infinity;

  for (let s = 0; s <= SCAN_STEPS; s++) {
    const angle = ANGLE_MIN + (s / SCAN_STEPS) * (ANGLE_MAX - ANGLE_MIN);
    const { landX, blocked } = testAngle(angle);
    if (blocked) continue;
    const dist = Math.abs(landX - targetCX);
    if (dist < tolerance && dist < bestDist) {
      bestDist  = dist;
      bestAngle = angle;
    }
  }

  // If we found a clear angle that reaches near the target, use it
  if (bestAngle !== null) return bestAngle;

  // ── Step 3: no perfect clear path — return direct (or best-effort) so the
  //    aim still tracks; the pre-fire blocked-check in updateAI will suppress
  //    the shot until a window opens. ──
  return directAngle ?? (goRight ? ANGLE_MAX : ANGLE_MIN);
}

// ─── Update ───────────────────────────────────────────
function update() {
  if (paused) return;

  const [left, right] = players;

  // ── Player 1 input (left) ──
  if (keys['a'] || keys['A'])               left.x = Math.max(left.x - PLAYER_SPEED, left.minX);
  if (keys['d'] || keys['D'])               left.x = Math.min(left.x + PLAYER_SPEED, left.maxX);
  // P1 throw — tap T to fire instantly
  if (keys['t'] || keys['T']) {
    tryThrow(left);
  }
  // P1 aim: W = aim up, S = aim down
  if (keys['w'] || keys['W'])  left.cannonAngle  = Math.max(left.cannonAngle  - AIM_SPEED, ANGLE_MIN);
  if (keys['s'] || keys['S'])  left.cannonAngle  = Math.min(left.cannonAngle  + AIM_SPEED, ANGLE_MAX);

  // ── Player 2 input or AI (right) ──
  if (mode === '2p') {
    if (keys['ArrowLeft'])  right.x = Math.max(right.x - PLAYER_SPEED, right.minX);
    if (keys['ArrowRight']) right.x = Math.min(right.x + PLAYER_SPEED, right.maxX);
    // P2 throw — tap M to fire instantly
    if (keys['m'] || keys['M']) {
      tryThrow(right);
    }
    // P2 aim: ArrowUp = aim up, ArrowDown = aim down
    if (keys['ArrowUp'])    right.cannonAngle = Math.max(right.cannonAngle - AIM_SPEED, ANGLE_MIN);
    if (keys['ArrowDown'])  right.cannonAngle = Math.min(right.cannonAngle + AIM_SPEED, ANGLE_MAX);
  } else {
    updateAI(right);
  }

  // ── Physics & cooldowns ──
  for (const p of players) {
    p.vy += GRAVITY;
    p.y  += p.vy;
    if (p.y >= groundY - PLAYER_H) {
      p.y  = groundY - PLAYER_H;
      p.vy = 0;
      p.onGround = true;
    }
    if (p.cooldown > 0) p.cooldown--;
    if (p.hitFlash > 0) p.hitFlash--;
  }

  // ── Balloons ──
  for (const b of balloons) {
    if (!b.alive) continue;
    b.vy += BALLOON_GRAV;
    b.x  += b.vx;
    b.y  += b.vy;

    // Hit ground
    if (b.y + b.radius >= groundY) {
      b.alive = false;
      splashes.push(makeSplash(b.x, groundY));
      playSound('splash');
      continue;
    }

    // Off screen
    if (b.x < -b.radius * 2 || b.x > canvas.width + b.radius * 2) {
      b.alive = false;
      continue;
    }

    // Hit a player
    for (const p of players) {
      if (p.side === b.owner) continue; // can't hit self
      const cx = p.x + PLAYER_W / 2;
      const cy = p.y + PLAYER_H / 2;
      const dx = b.x - cx, dy = b.y - cy;
      if (Math.sqrt(dx * dx + dy * dy) < b.radius + PLAYER_W * 0.45) {
        b.alive = false;
        splashes.push(makeSplash(b.x, b.y));
        playSound('hit');
        p.hp--;
        p.hitFlash = 20;
        stats[b.owner].hits++;
        updateHUD();
        updateSidePanels();
        if (p.hp <= 0) { endGame(p.side === 'left' ? 'right' : 'left'); return; }
      }
    }

    // Hit the obstacle
    if (obstacle) {
      const ocx = obstacle.x + OBS_W / 2;
      const ocy = obstacle.y + OBS_H / 2;
      const odx = b.x - ocx, ody = b.y - ocy;
      if (Math.abs(odx) < OBS_W / 2 + b.radius && Math.abs(ody) < OBS_H / 2 + b.radius) {
        b.alive = false;
        splashes.push(makeSplash(b.x, b.y));
        playSound('splash');
        obstacle.hitFlash = 14;
        b.vx = 0; b.vy = 0;
      }
    }
  }

  balloons = balloons.filter(b => b.alive);

  // ── Splashes ──
  for (const s of splashes) {
    s.life--;
    for (const d of s.drops) { d.dx += d.ddx; d.dy += d.ddy; }
  }
  splashes = splashes.filter(s => s.life > 0);

  // ── Obstacle ──
  updateObstacle();

  // ── Rainbow Bubble ──
  // Spawns every 10–20 s; repeats after the bubble exits (popped or escaped).
  if (!rainbowBubbleSpawned) {
    rainbowBubbleTimer--;
    if (rainbowBubbleTimer <= 0) {
      rainbowBubbleSpawned = true;
      // Spawn at a random height in the upper half, moving slowly side to side
      const side = Math.random() < 0.5 ? -1 : 1;
      rainbowBubble = {
        x: side < 0 ? canvas.width + 55 : -55,
        y: rnd(80, groundY - 180),
        vx: side < 0 ? -1.1 : 1.1,
        vy: rnd(-0.4, 0.4),
        r: 52,
        frame: 0,
        alive: true,
      };
    }
  }

  if (rainbowBubble && rainbowBubble.alive) {
    const rb = rainbowBubble;
    rb.frame++;
    rb.x += rb.vx;
    rb.y += rb.vy;
    // Gentle vertical drift — bounce off ceiling and just above ground
    if (rb.y - rb.r < 10)             { rb.y = 10 + rb.r;           rb.vy =  Math.abs(rb.vy); }
    if (rb.y + rb.r > groundY - 30)   { rb.y = groundY - 30 - rb.r; rb.vy = -Math.abs(rb.vy); }
    // Bubble escaped off-screen — reset timer for next one
    if (rb.x < -rb.r * 2 || rb.x > canvas.width + rb.r * 2) {
      rb.alive = false;
      rainbowBubble = null;
      rainbowBubbleSpawned = false;
      rainbowBubbleTimer   = 60 * 10 + Math.floor(Math.random() * 60 * 10); // 10–20 s
    }
    // Check hit by any balloon
    if (rb.alive) {
      for (const b of balloons) {
        if (!b.alive) continue;
        const dx = b.x - rb.x, dy = b.y - rb.y;
        if (Math.sqrt(dx * dx + dy * dy) < rb.r + b.radius) {
          // Pop! Award a mega-ball to the shooter
          b.alive = false;
          rb.alive = false;
          rainbowBubble = null;
          // Reset timer so it can come back
          rainbowBubbleSpawned = false;
          rainbowBubbleTimer   = 60 * 10 + Math.floor(Math.random() * 60 * 10); // 10–20 s
          playSound('bubblePop');
          // Pop! Award the mega-ball to the shooter — they fire it manually on next throw
          const shooter = players.find(p => p.side === b.owner);
          if (shooter) {
            shooter.hasMegaBall = true;
            updateSidePanels();
          }
          break;
        }
      }
    }
  }

  // ── Mega-balls ──
  for (const mb of megaBalls) {
    if (!mb.alive) continue;
    mb.frame++;
    mb.vy += BALLOON_GRAV * 0.4;  // slight gravity so it arcs naturally
    mb.x  += mb.vx;
    mb.y  += mb.vy;
    // Safety: kill if stuck or frame limit exceeded
    if (mb.frame > 900 || (Math.abs(mb.vx) < 0.15 && Math.abs(mb.vy) < 0.15)) { mb.alive = false; continue; }
    // Hit ground — bounce up to 1 time
    if (mb.y + mb.r >= groundY) {
      mb.bounces = (mb.bounces || 0) + 1;
      if (mb.bounces >= 1) {
        mb.alive = false;
        splashes.push(makeSplash(mb.x, groundY));
        playSound('splash');
        continue;
      }
      // Bounce: reflect vy, lose some energy, keep rolling horizontally
      mb.y  = groundY - mb.r;
      mb.vy = -Math.abs(mb.vy) * 0.58;  // 58% energy retained per bounce
      mb.vx *= 0.82;                     // slight horizontal friction
      splashes.push(makeSplash(mb.x, groundY));
      playSound('splash');
    }
    // Off screen
    if (mb.x < -mb.r * 2 || mb.x > canvas.width + mb.r * 2) { mb.alive = false; continue; }
    // Hit a player
    for (const p of players) {
      if (p.side === mb.owner) continue;
      const cx = p.x + PLAYER_W / 2;
      const cy = p.y + PLAYER_H / 2;
      const dx = mb.x - cx, dy = mb.y - cy;
      if (Math.sqrt(dx * dx + dy * dy) < mb.r + PLAYER_W * 0.5) {
        mb.alive = false;
        splashes.push(makeSplash(mb.x, mb.y));
        playSound('megaHit');
        p.hp = Math.max(0, p.hp - MEGA_DAMAGE);
        p.hitFlash = 40;
        stats[mb.owner].hits++;
        updateHUD();
        updateSidePanels();
        if (p.hp <= 0) { endGame(p.side === 'left' ? 'right' : 'left'); return; }
      }
    }
  }
  megaBalls = megaBalls.filter(mb => mb.alive);
}

// ─── Character renderer ───────────────────────────────
// Draws a full cartoon character at (cx, topY) fitting within pw×ph pixels.
// jumpOffset shifts legs apart when airborne.
function drawCharacter(ctx, cx, topY, pw, ph, jumpOffset, emoji, color, facingRight) {
  // ── shared measurements ──
  const headR  = pw * 0.42;          // head radius
  const headCY = topY + headR + 2;   // head centre Y
  const bodyTop    = headCY + headR - 4;
  const bodyBottom = topY + ph - 14;
  const bodyH  = bodyBottom - bodyTop;
  const bodyW  = pw * 0.55;
  const legW   = pw * 0.18;
  const legH   = 18;
  const legY   = bodyBottom;
  const legLX  = cx - legW - 2;
  const legRX  = cx + 2;
  const footH  = 7;
  const armW   = 9;
  const armLen = bodyH * 0.55;

  // ── skin & accent tones derived from character ──
  const skin = charSkin(emoji);

  ctx.save();

  // ── legs ──
  const legSpread = jumpOffset !== 0 ? 5 : 0;
  ctx.fillStyle = skin.pants;
  // left leg
  ctx.beginPath();
  ctx.roundRect(legLX - legSpread, legY + jumpOffset, legW, legH, [0,0,4,4]);
  ctx.fill();
  // right leg
  ctx.beginPath();
  ctx.roundRect(legRX + legSpread, legY - jumpOffset, legW, legH, [0,0,4,4]);
  ctx.fill();

  // ── shoes ──
  ctx.fillStyle = skin.shoes;
  ctx.beginPath();
  ctx.ellipse(legLX - legSpread + legW/2, legY + legH + jumpOffset + footH/2 - 1, legW*0.7, footH/2, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(legRX + legSpread + legW/2, legY + legH - jumpOffset + footH/2 - 1, legW*0.7, footH/2, 0, 0, Math.PI*2);
  ctx.fill();

  // ── torso ──
  const torsoGrad = ctx.createLinearGradient(cx - bodyW/2, bodyTop, cx + bodyW/2, bodyTop);
  torsoGrad.addColorStop(0, skin.torso1);
  torsoGrad.addColorStop(1, skin.torso2);
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.roundRect(cx - bodyW/2, bodyTop, bodyW, bodyH, [4,4,6,6]);
  ctx.fill();

  // torso detail (collar / belt / pattern)
  if (skin.detail) skin.detail(ctx, cx, bodyTop, bodyW, bodyH, color);

  // ── arms ──
  ctx.strokeStyle = skin.skin;
  ctx.lineWidth = armW;
  ctx.lineCap = 'round';
  // left arm (hangs or slightly raised)
  ctx.beginPath();
  ctx.moveTo(cx - bodyW/2 + 2, bodyTop + 6);
  ctx.quadraticCurveTo(cx - bodyW/2 - 10, bodyTop + armLen * 0.6, cx - bodyW/2 - 4, bodyTop + armLen);
  ctx.stroke();
  // right arm
  ctx.beginPath();
  ctx.moveTo(cx + bodyW/2 - 2, bodyTop + 6);
  ctx.quadraticCurveTo(cx + bodyW/2 + 10, bodyTop + armLen * 0.6, cx + bodyW/2 + 4, bodyTop + armLen);
  ctx.stroke();

  // ── neck ──
  ctx.fillStyle = skin.skin;
  ctx.fillRect(cx - 5, headCY + headR - 6, 10, 8);

  // ── head ──
  ctx.fillStyle = skin.skin;
  ctx.beginPath();
  ctx.arc(cx, headCY, headR, 0, Math.PI * 2);
  ctx.fill();

  // head extra features (ears, snout, etc.)
  if (skin.headExtra) skin.headExtra(ctx, cx, headCY, headR, color);

  // ── hair / hat ──
  if (skin.hair) skin.hair(ctx, cx, headCY, headR, color);

  // ── face ──
  const eyeY   = headCY - headR * 0.12;
  const eyeOff = headR * 0.32;
  // eyes
  ctx.fillStyle = skin.eyeWhite || '#fff';
  ctx.beginPath(); ctx.ellipse(cx - eyeOff, eyeY, 5, 6, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + eyeOff, eyeY, 5, 6, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = skin.pupil || '#1a1a2e';
  ctx.beginPath(); ctx.arc(cx - eyeOff + 1, eyeY + 1, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + eyeOff + 1, eyeY + 1, 3, 0, Math.PI*2); ctx.fill();
  // eye shine
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx - eyeOff + 2, eyeY - 1, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + eyeOff + 2, eyeY - 1, 1.2, 0, Math.PI*2); ctx.fill();
  // mouth
  ctx.strokeStyle = skin.mouth || '#c0392b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(cx, eyeY + headR * 0.45, headR * 0.28, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // nose dot
  ctx.fillStyle = skin.nose || skin.mouth || '#c0392b';
  ctx.beginPath(); ctx.arc(cx, eyeY + headR * 0.28, 2, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}

// ── Per-character skin definitions ──
function charSkin(emoji) {
  const base = {
    skin: '#f5c5a3', pants: '#2d3a8c', shoes: '#2c2c2c',
    torso1: '#4f9cf5', torso2: '#2563eb',
    eyeWhite: '#fff', pupil: '#1a1a2e', mouth: '#b55',
    nose: '#c07850',
  };
  const s = { ...base };

  switch (emoji) {
    // ── 🧑 Boy ──
    case '🧑':
      s.torso1='#3b82f6'; s.torso2='#1d4ed8'; s.pants='#1e3a8a'; s.shoes='#1c1c1c';
      s.hair = (c,cx,cy,r) => {
        c.fillStyle='#5c3d11';
        c.beginPath(); c.arc(cx, cy - r*0.1, r, Math.PI, Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(cx, cy-r*0.9, r*0.85, r*0.5, 0, Math.PI, Math.PI*2); c.fill();
      };
      s.detail = (c,cx,bt,bw,bh) => {
        c.strokeStyle='#fff'; c.lineWidth=1.5;
        c.beginPath(); c.moveTo(cx,bt+4); c.lineTo(cx,bt+bh*0.55); c.stroke();
      };
      break;

    // ── 👧 Girl ──
    case '👧':
      s.torso1='#f472b6'; s.torso2='#db2777'; s.pants='#fbcfe8'; s.shoes='#be185d';
      s.hair = (c,cx,cy,r) => {
        c.fillStyle='#c8860a';
        // back hair
        c.beginPath(); c.ellipse(cx,cy+r*0.4, r*0.95, r*1.1, 0, 0, Math.PI*2); c.fill();
        // top
        c.beginPath(); c.arc(cx,cy,r*1.02, Math.PI, Math.PI*2); c.fill();
        // pigtails
        c.save(); c.fillStyle='#c8860a';
        c.beginPath(); c.ellipse(cx-r*0.9, cy-r*0.4, 6, 14, -0.4, 0, Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(cx+r*0.9, cy-r*0.4, 6, 14,  0.4, 0, Math.PI*2); c.fill();
        c.restore();
      };
      s.detail = (c,cx,bt,bw,bh,col) => {
        // bow on dress
        c.fillStyle='#fbcfe8';
        c.beginPath(); c.ellipse(cx,bt+6, bw*0.4, 5, 0, 0, Math.PI*2); c.fill();
      };
      break;

    // ── 👸 Princess ──
    case '👸':
      s.skin='#fddcb5'; s.torso1='#c084fc'; s.torso2='#7c3aed'; s.pants='#e9d5ff'; s.shoes='#f0abfc';
      s.hair = (c,cx,cy,r) => {
        c.fillStyle='#f9c74f';
        c.beginPath(); c.ellipse(cx, cy+r*0.3, r*0.96, r*1.05, 0, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx, cy, r*1.02, Math.PI, Math.PI*2); c.fill();
        // crown
        c.fillStyle='#fbbf24';
        const crownY = cy - r - 2;
        c.beginPath();
        c.moveTo(cx-r*0.7, crownY); c.lineTo(cx-r*0.7, crownY-10);
        c.lineTo(cx-r*0.3, crownY-5); c.lineTo(cx, crownY-13);
        c.lineTo(cx+r*0.3, crownY-5); c.lineTo(cx+r*0.7, crownY-10);
        c.lineTo(cx+r*0.7, crownY); c.closePath(); c.fill();
        c.fillStyle='#ef4444'; c.beginPath(); c.arc(cx, crownY-13, 3, 0, Math.PI*2); c.fill();
        c.fillStyle='#3b82f6'; c.beginPath(); c.arc(cx-r*0.7, crownY-10, 2.5, 0, Math.PI*2); c.fill();
        c.fillStyle='#22c55e'; c.beginPath(); c.arc(cx+r*0.7, crownY-10, 2.5, 0, Math.PI*2); c.fill();
      };
      s.detail = (c,cx,bt,bw,bh) => {
        c.fillStyle='rgba(255,255,255,0.35)';
        c.beginPath(); c.ellipse(cx, bt+bh*0.35, bw*0.3, bh*0.2, 0, 0, Math.PI*2); c.fill();
      };
      break;

    // ── 🤴 Prince ──
    case '🤴':
      s.skin='#f5c5a3'; s.torso1='#fbbf24'; s.torso2='#d97706'; s.pants='#1e40af'; s.shoes='#1c1c1c';
      s.hair = (c,cx,cy,r) => {
        c.fillStyle='#3b1f0a';
        c.beginPath(); c.arc(cx,cy,r*1.02, Math.PI,Math.PI*2); c.fill();
        // crown
        c.fillStyle='#fbbf24';
        const crownY = cy - r - 1;
        c.beginPath();
        c.moveTo(cx-r*0.65,crownY); c.lineTo(cx-r*0.65,crownY-8);
        c.lineTo(cx,crownY-13); c.lineTo(cx+r*0.65,crownY-8);
        c.lineTo(cx+r*0.65,crownY); c.closePath(); c.fill();
        c.fillStyle='#ef4444'; c.beginPath(); c.arc(cx, crownY-13,3,0,Math.PI*2); c.fill();
      };
      s.detail = (c,cx,bt,bw,bh) => {
        c.strokeStyle='#fff'; c.lineWidth=2;
        c.beginPath(); c.moveTo(cx-bw*0.2,bt+4); c.lineTo(cx-bw*0.2,bt+bh*0.6); c.stroke();
        c.beginPath(); c.moveTo(cx+bw*0.2,bt+4); c.lineTo(cx+bw*0.2,bt+bh*0.6); c.stroke();
      };
      break;

    // ── 🐸 Frog ──
    case '🐸':
      s.skin='#4ade80'; s.pants='#16a34a'; s.shoes='#15803d'; s.torso1='#86efac'; s.torso2='#4ade80';
      s.mouth='#166534'; s.nose='#15803d'; s.pupil='#166534'; s.eyeWhite='#fff';
      s.headExtra = (c,cx,cy,r) => {
        // bulging eyes on top
        c.fillStyle='#fff';
        c.beginPath(); c.arc(cx-r*0.5, cy-r*0.85, r*0.32, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx+r*0.5, cy-r*0.85, r*0.32, 0, Math.PI*2); c.fill();
        c.fillStyle='#166534';
        c.beginPath(); c.arc(cx-r*0.5, cy-r*0.85, r*0.18, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx+r*0.5, cy-r*0.85, r*0.18, 0, Math.PI*2); c.fill();
        // wide mouth / belly
        c.fillStyle='#d1fae5';
        c.beginPath(); c.ellipse(cx, cy+r*0.2, r*0.6, r*0.45, 0, 0, Math.PI*2); c.fill();
      };
      s.hair = null;
      break;

    // ── 🐼 Panda ──
    case '🐼':
      s.skin='#f8f8f8'; s.pants='#1f2937'; s.shoes='#111'; s.torso1='#e5e7eb'; s.torso2='#9ca3af';
      s.mouth='#374151'; s.nose='#374151'; s.pupil='#111';
      s.headExtra = (c,cx,cy,r) => {
        // ears
        c.fillStyle='#1f2937';
        c.beginPath(); c.arc(cx-r*0.72,cy-r*0.78,r*0.28,0,Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx+r*0.72,cy-r*0.78,r*0.28,0,Math.PI*2); c.fill();
        // eye patches
        c.fillStyle='#1f2937';
        c.beginPath(); c.ellipse(cx-r*0.32,cy-r*0.12,r*0.3,r*0.28,0,0,Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(cx+r*0.32,cy-r*0.12,r*0.3,r*0.28,0,0,Math.PI*2); c.fill();
        c.fillStyle='#fff';
        c.beginPath(); c.arc(cx-r*0.32,cy-r*0.12,r*0.18,0,Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx+r*0.32,cy-r*0.12,r*0.18,0,Math.PI*2); c.fill();
      };
      s.hair = null;
      break;

    // ── 🦊 Fox ──
    case '🦊':
      s.skin='#f97316'; s.pants='#7c2d12'; s.shoes='#1c1c1c'; s.torso1='#fb923c'; s.torso2='#ea580c';
      s.mouth='#7c2d12'; s.nose='#7c2d12'; s.pupil='#7c2d12';
      s.headExtra = (c,cx,cy,r) => {
        // pointed ears
        c.fillStyle='#f97316';
        c.beginPath(); c.moveTo(cx-r*0.6,cy-r*0.7); c.lineTo(cx-r*0.85,cy-r*1.3); c.lineTo(cx-r*0.2,cy-r*0.8); c.fill();
        c.beginPath(); c.moveTo(cx+r*0.6,cy-r*0.7); c.lineTo(cx+r*0.85,cy-r*1.3); c.lineTo(cx+r*0.2,cy-r*0.8); c.fill();
        c.fillStyle='#fde68a'; c.beginPath(); c.moveTo(cx-r*0.55,cy-r*0.75); c.lineTo(cx-r*0.78,cy-r*1.2); c.lineTo(cx-r*0.28,cy-r*0.82); c.fill();
        c.fillStyle='#fde68a'; c.beginPath(); c.moveTo(cx+r*0.55,cy-r*0.75); c.lineTo(cx+r*0.78,cy-r*1.2); c.lineTo(cx+r*0.28,cy-r*0.82); c.fill();
        // white muzzle
        c.fillStyle='#fff8e7';
        c.beginPath(); c.ellipse(cx, cy+r*0.22, r*0.52, r*0.38, 0, 0, Math.PI*2); c.fill();
      };
      s.hair = null;
      break;

    // ── 🐱 Cat ──
    case '🐱':
      s.skin='#fde68a'; s.pants='#92400e'; s.shoes='#78350f'; s.torso1='#fbbf24'; s.torso2='#d97706';
      s.mouth='#92400e'; s.nose='#f87171'; s.pupil='#065f46';
      s.headExtra = (c,cx,cy,r) => {
        c.fillStyle='#fde68a';
        c.beginPath(); c.moveTo(cx-r*0.55,cy-r*0.65); c.lineTo(cx-r*0.75,cy-r*1.25); c.lineTo(cx-r*0.15,cy-r*0.78); c.fill();
        c.beginPath(); c.moveTo(cx+r*0.55,cy-r*0.65); c.lineTo(cx+r*0.75,cy-r*1.25); c.lineTo(cx+r*0.15,cy-r*0.78); c.fill();
        // whiskers
        c.strokeStyle='#92400e'; c.lineWidth=1;
        [-1,1].forEach(s => {
          c.beginPath(); c.moveTo(cx+s*r*0.1,cy+r*0.2); c.lineTo(cx+s*r*0.9,cy+r*0.1); c.stroke();
          c.beginPath(); c.moveTo(cx+s*r*0.1,cy+r*0.28); c.lineTo(cx+s*r*0.9,cy+r*0.28); c.stroke();
        });
      };
      s.hair = null;
      break;

    // ── 🐶 Dog ──
    case '🐶':
      s.skin='#d97706'; s.pants='#92400e'; s.shoes='#78350f'; s.torso1='#f59e0b'; s.torso2='#d97706';
      s.mouth='#7c2d12'; s.nose='#1c1c1c'; s.pupil='#1c1c1c';
      s.headExtra = (c,cx,cy,r) => {
        // floppy ears
        c.fillStyle='#b45309';
        c.beginPath(); c.ellipse(cx-r*0.85,cy+r*0.2, r*0.28, r*0.55, -0.3, 0, Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(cx+r*0.85,cy+r*0.2, r*0.28, r*0.55,  0.3, 0, Math.PI*2); c.fill();
        // snout
        c.fillStyle='#fde68a';
        c.beginPath(); c.ellipse(cx, cy+r*0.25, r*0.48, r*0.32, 0, 0, Math.PI*2); c.fill();
      };
      s.hair = null;
      break;

    // ── 🦄 Unicorn ──
    case '🦄':
      s.skin='#fce7f3'; s.pants='#f9a8d4'; s.shoes='#f0abfc'; s.torso1='#f0abfc'; s.torso2='#c084fc';
      s.mouth='#be185d'; s.nose='#f9a8d4'; s.pupil='#6d28d9';
      s.hair = (c,cx,cy,r) => {
        // rainbow mane
        ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7'].forEach((col,i)=>{
          c.fillStyle=col;
          c.beginPath(); c.ellipse(cx-r*0.5+i*4, cy-r*0.6, 5, r*0.7, -0.3, 0, Math.PI*2); c.fill();
        });
        // horn
        c.fillStyle='#fbbf24';
        c.beginPath();
        c.moveTo(cx, cy-r-2); c.lineTo(cx-5, cy-r+8); c.lineTo(cx+5, cy-r+8); c.closePath(); c.fill();
        c.strokeStyle='#d97706'; c.lineWidth=1;
        c.beginPath(); c.moveTo(cx-2,cy-r+4); c.lineTo(cx+4,cy-r+8); c.stroke();
      };
      break;

    // ── 🤖 Robot ──
    case '🤖':
      s.skin='#94a3b8'; s.pants='#334155'; s.shoes='#1e293b'; s.torso1='#475569'; s.torso2='#334155';
      s.mouth='#06b6d4'; s.nose='#06b6d4'; s.pupil='#06b6d4'; s.eyeWhite='#1e293b';
      s.headExtra = (c,cx,cy,r) => {
        // square robot head override — antennae
        c.fillStyle='#94a3b8';
        c.fillRect(cx-r*0.85, cy-r*0.9, r*1.7, r*1.8);
        c.strokeStyle='#64748b'; c.lineWidth=2;
        c.strokeRect(cx-r*0.85, cy-r*0.9, r*1.7, r*1.8);
        // antenna
        c.strokeStyle='#94a3b8'; c.lineWidth=2;
        c.beginPath(); c.moveTo(cx, cy-r*0.9); c.lineTo(cx, cy-r*1.5); c.stroke();
        c.fillStyle='#ef4444'; c.beginPath(); c.arc(cx, cy-r*1.5, 4, 0, Math.PI*2); c.fill();
        // LED eyes
        c.fillStyle='#06b6d4';
        c.fillRect(cx-r*0.55, cy-r*0.4, r*0.38, r*0.32);
        c.fillRect(cx+r*0.17, cy-r*0.4, r*0.38, r*0.32);
        // grille mouth
        c.fillStyle='#0f172a';
        c.fillRect(cx-r*0.5, cy+r*0.18, r, r*0.26);
        for(let i=0;i<4;i++){
          c.fillStyle='#06b6d4';
          c.fillRect(cx-r*0.44+i*r*0.26, cy+r*0.2, r*0.14, r*0.22);
        }
      };
      s.hair = null;
      // Skip normal eyes/mouth since headExtra handles it
      s.eyeWhite = 'transparent'; s.pupil = 'transparent'; s.mouth = 'transparent';
      break;

    // ── 👻 Ghost ──
    case '👻':
      s.skin='#e2e8f0'; s.pants='#94a3b8'; s.shoes='#64748b'; s.torso1='#f1f5f9'; s.torso2='#cbd5e1';
      s.mouth='#334155'; s.nose='#94a3b8'; s.pupil='#334155';
      s.headExtra = (c,cx,cy,r) => {
        // wavy bottom
        c.fillStyle='#f1f5f9';
        c.beginPath(); c.arc(cx, cy, r*1.05, 0, Math.PI*2); c.fill();
        // dark hollow eyes
        c.fillStyle='#334155';
        c.beginPath(); c.ellipse(cx-r*0.33, cy-r*0.05, r*0.25, r*0.28, 0, 0, Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(cx+r*0.33, cy-r*0.05, r*0.25, r*0.28, 0, 0, Math.PI*2); c.fill();
        // wavy mouth
        c.strokeStyle='#334155'; c.lineWidth=2;
        c.beginPath();
        c.moveTo(cx-r*0.35, cy+r*0.4);
        for(let xi=0;xi<7;xi++){
          const rx2 = cx-r*0.35 + xi*r*0.1;
          c.lineTo(rx2, cy+r*0.4 + (xi%2===0?4:-4));
        }
        c.stroke();
      };
      s.hair = null; s.eyeWhite='transparent'; s.pupil='transparent'; s.mouth='transparent';
      break;

    // ── 🧙 Wizard ──
    case '🧙':
      s.skin='#c4a882'; s.pants='#312e81'; s.shoes='#1e1b4b'; s.torso1='#4c1d95'; s.torso2='#312e81';
      s.mouth='#78350f'; s.nose='#a16207'; s.pupil='#1e1b4b';
      s.hair = (c,cx,cy,r) => {
        // long white beard
        c.fillStyle='#e2e8f0';
        c.beginPath(); c.ellipse(cx, cy+r*0.7, r*0.55, r*0.6, 0, 0, Math.PI*2); c.fill();
        // hat
        c.fillStyle='#312e81';
        const hatBase = cy - r + 2;
        c.beginPath(); c.ellipse(cx, hatBase, r*1.1, r*0.28, 0, 0, Math.PI*2); c.fill();
        c.beginPath();
        c.moveTo(cx-r*0.55, hatBase);
        c.lineTo(cx-r*0.22, hatBase - r*1.7);
        c.lineTo(cx+r*0.22, hatBase - r*1.7);
        c.lineTo(cx+r*0.55, hatBase);
        c.closePath(); c.fill();
        c.fillStyle='#fbbf24'; c.beginPath(); c.arc(cx, hatBase-r*1.6, 4, 0, Math.PI*2); c.fill();
      };
      s.detail = (c,cx,bt,bw,bh) => {
        c.fillStyle='rgba(167,139,250,0.5)';
        ['★','✦'].forEach((s,i)=>{
          c.font='12px serif'; c.fillStyle='#a78bfa'; c.textAlign='center'; c.textBaseline='middle';
          c.fillText(s, cx + (i===0?-8:8), bt+bh*0.4);
        });
      };
      break;

    // ── 🦸 Hero ──
    case '🦸':
      s.skin='#f5c5a3'; s.pants='#1d4ed8'; s.shoes='#1e3a8a'; s.torso1='#dc2626'; s.torso2='#991b1b';
      s.hair = (c,cx,cy,r) => {
        c.fillStyle='#1c1c1c';
        c.beginPath(); c.arc(cx, cy, r*1.02, Math.PI, Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(cx,cy-r*0.85, r*0.8, r*0.45, 0, Math.PI,Math.PI*2); c.fill();
      };
      s.detail = (c,cx,bt,bw,bh) => {
        // lightning bolt
        c.fillStyle='#fbbf24';
        c.beginPath();
        c.moveTo(cx+4, bt+6); c.lineTo(cx-4, bt+bh*0.45);
        c.lineTo(cx+2, bt+bh*0.45); c.lineTo(cx-4, bt+bh*0.85);
        c.lineTo(cx+8, bt+bh*0.42); c.lineTo(cx+2, bt+bh*0.42);
        c.closePath(); c.fill();
      };
      break;

    // ── 🧜 Mermaid ──
    case '🧜':
      s.skin='#fddcb5'; s.pants='#0891b2'; s.shoes='#0e7490'; s.torso1='#06b6d4'; s.torso2='#0e7490';
      s.hair = (c,cx,cy,r) => {
        c.fillStyle='#22d3ee';
        c.beginPath(); c.ellipse(cx, cy+r*0.5, r*0.92, r*1.0, 0, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx, cy, r*1.0, Math.PI, Math.PI*2); c.fill();
      };
      s.detail = (c,cx,bt,bw,bh) => {
        // scales
        for(let row=0;row<3;row++)
          for(let col=0;col<4;col++){
            c.fillStyle= col%2===row%2?'#0891b2':'#06b6d4';
            c.beginPath(); c.ellipse(cx-bw*0.4+col*bw*0.27, bt+bh*0.2+row*bh*0.22, bw*0.1, bh*0.09, 0, 0, Math.PI*2); c.fill();
          }
      };
      break;

    // ── 🐲 Dragon ──
    case '🐲':
      s.skin='#16a34a'; s.pants='#14532d'; s.shoes='#052e16'; s.torso1='#15803d'; s.torso2='#166534';
      s.mouth='#dc2626'; s.nose='#166534'; s.pupil='#dc2626';
      s.headExtra = (c,cx,cy,r) => {
        // horns
        c.fillStyle='#854d0e';
        c.beginPath(); c.moveTo(cx-r*0.5,cy-r*0.8); c.lineTo(cx-r*0.65,cy-r*1.45); c.lineTo(cx-r*0.22,cy-r*0.9); c.fill();
        c.beginPath(); c.moveTo(cx+r*0.5,cy-r*0.8); c.lineTo(cx+r*0.65,cy-r*1.45); c.lineTo(cx+r*0.22,cy-r*0.9); c.fill();
        // spines
        c.fillStyle='#fbbf24';
        for(let i=-2;i<=2;i++){
          c.beginPath(); c.moveTo(cx+i*r*0.25, cy-r*0.96); c.lineTo(cx+i*r*0.25-4,cy-r*1.22); c.lineTo(cx+i*r*0.25+4,cy-r*1.22); c.fill();
        }
      };
      s.hair = null;
      break;

    default:
      // fallback: use emoji as face
      s.hair = (c,cx,cy,r) => {
        c.font=`${Math.round(r*1.5)}px serif`;
        c.textAlign='center'; c.textBaseline='middle';
        c.fillText(emoji, cx, cy);
      };
  }
  return s;
}

// ─── Draw ─────────────────────────────────────────────
function drawWorld() {
  const w = canvas.width, h = canvas.height;
  const world = selectedWorld;

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, world.sky[0]);
  sky.addColorStop(1, world.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // World-specific decorations (drawn behind ground)
  world.decor(ctx, w, h, groundY);

  // Ground fill
  ctx.fillStyle = world.ground;
  ctx.fillRect(0, groundY, w, h - groundY);
  // Ground top stripe
  ctx.fillStyle = world.groundTop;
  ctx.fillRect(0, groundY, w, 8);
}

function draw() {
  // World (sky + background + ground)
  drawWorld();

  // Shadows
  for (const p of players) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(p.x + PLAYER_W / 2, groundY + 6, PLAYER_W * 0.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Splashes
  for (const s of splashes) {
    const alpha = s.life / SPLASH_FRAMES;
    for (const d of s.drops) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = '#60b8f5';
      ctx.beginPath();
      ctx.arc(s.x + d.dx, s.y + d.dy, 4 * alpha + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Balloons
  for (const b of balloons) {
    b.frame = (b.frame || 0) + 1;
    const R = b.radius;
    ctx.save();

    // shadow
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(b.x, groundY + 4, R * 0.8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    if (b.style === 'rainbow') {
      // Spinning rainbow gradient
      const hue = (b.hue + b.frame * 4) % 360;
      const bg = ctx.createRadialGradient(b.x - R * 0.3, b.y - R * 0.3, 1, b.x, b.y, R);
      bg.addColorStop(0,   `hsl(${hue}, 100%, 80%)`);
      bg.addColorStop(0.5, `hsl(${(hue+120)%360}, 100%, 60%)`);
      bg.addColorStop(1,   `hsl(${(hue+240)%360}, 100%, 45%)`);
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
      // sparkle ring
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, R + 3 + Math.sin(b.frame * 0.3) * 2, 0, Math.PI * 2); ctx.stroke();

    } else if (b.style === 'penguin') {
      // White body, black head
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.arc(b.x, b.y - R * 0.3, R * 0.55, 0, Math.PI * 2); ctx.fill();
      // eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(b.x - R * 0.2, b.y - R * 0.38, R * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x + R * 0.2, b.y - R * 0.38, R * 0.14, 0, Math.PI * 2); ctx.fill();
      // beak
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.moveTo(b.x, b.y - R * 0.18); ctx.lineTo(b.x - R * 0.12, b.y - R * 0.05); ctx.lineTo(b.x + R * 0.12, b.y - R * 0.05); ctx.closePath(); ctx.fill();
      // feet
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.ellipse(b.x - R * 0.3, b.y + R * 0.9, R * 0.22, R * 0.12, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(b.x + R * 0.3, b.y + R * 0.9, R * 0.22, R * 0.12,  0.3, 0, Math.PI * 2); ctx.fill();

    } else if (b.style === 'ice') {
      // Icy crystal shard
      const bg = ctx.createRadialGradient(b.x - R * 0.3, b.y - R * 0.3, 1, b.x, b.y, R);
      bg.addColorStop(0, '#e0f7ff');
      bg.addColorStop(0.5, '#7dd3fc');
      bg.addColorStop(1, '#0369a1');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
      // crystal lines
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2 + b.frame * 0.03;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + Math.cos(ang) * R * 0.85, b.y + Math.sin(ang) * R * 0.85);
        ctx.stroke();
      }

    } else if (b.style === 'fire') {
      // Fiery red-orange
      const bg = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, R);
      bg.addColorStop(0, '#fff7a0');
      bg.addColorStop(0.4, '#f97316');
      bg.addColorStop(1, '#991b1b');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
      // flame tips
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#fef08a';
      for (let f = 0; f < 5; f++) {
        const ang = (f / 5) * Math.PI * 2 + b.frame * 0.07;
        const fr = R * (0.55 + Math.sin(b.frame * 0.2 + f) * 0.2);
        ctx.beginPath(); ctx.arc(b.x + Math.cos(ang) * R * 0.65, b.y + Math.sin(ang) * R * 0.65, fr * 0.35, 0, Math.PI * 2); ctx.fill();
      }

    } else if (b.style === 'fast') {
      // Yellow lightning bolt
      const bg = ctx.createRadialGradient(b.x - R * 0.2, b.y - R * 0.2, 1, b.x, b.y, R);
      bg.addColorStop(0, '#fef08a');
      bg.addColorStop(0.5, '#eab308');
      bg.addColorStop(1, '#92400e');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
      // ⚡ inside
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${R * 1.1}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⚡', b.x, b.y);

    } else if (b.style === 'big') {
      // Big blue + ripple rings
      const bg = ctx.createRadialGradient(b.x - R * 0.25, b.y - R * 0.25, 1, b.x, b.y, R);
      bg.addColorStop(0, '#bfdbfe');
      bg.addColorStop(0.5, '#2563eb');
      bg.addColorStop(1, '#1e3a5f');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, R + 4 + Math.sin(b.frame * 0.15) * 3, 0, Math.PI * 2); ctx.stroke();

    } else if (b.style === 'lights') {
      // Disco sparkle ball
      const bg = ctx.createRadialGradient(b.x - R * 0.3, b.y - R * 0.3, 1, b.x, b.y, R);
      bg.addColorStop(0, '#e9d5ff');
      bg.addColorStop(0.5, '#7c3aed');
      bg.addColorStop(1, '#4c1d95');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
      // flashing colour spots
      for (let d = 0; d < 6; d++) {
        const ang = (d / 6) * Math.PI * 2 + b.frame * 0.15;
        const hue = (d * 60 + b.frame * 5) % 360;
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
        ctx.beginPath(); ctx.arc(b.x + Math.cos(ang) * R * 0.5, b.y + Math.sin(ang) * R * 0.5, R * 0.22, 0, Math.PI * 2); ctx.fill();
      }

    } else {
      // Classic water balloon
      const bg = ctx.createRadialGradient(b.x - R * 0.25, b.y - R * 0.25, 1, b.x, b.y, R);
      bg.addColorStop(0, '#a8d8f8');
      bg.addColorStop(0.6, '#3b9ee8');
      bg.addColorStop(1, '#1d6fa4');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(b.x - R * 0.25, b.y - R * 0.33, R * 0.33, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1d6fa4';
      ctx.beginPath(); ctx.arc(b.x, b.y + R, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Universal shine
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x - R * 0.25, b.y - R * 0.3, R * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Obstacle
  drawObstacle();

  // ── Rainbow Bubble ──
  if (rainbowBubble && rainbowBubble.alive) {
    const rb  = rainbowBubble;
    const cx  = rb.x, cy = rb.y, R = rb.r;
    ctx.save();

    // Spinning rainbow fill
    const spin = rb.frame * 0.025;
    const rg = ctx.createConicGradient(spin, cx, cy);
    rg.addColorStop(0,      'hsla(0,   100%, 60%, 0.82)');
    rg.addColorStop(0.166,  'hsla(60,  100%, 60%, 0.82)');
    rg.addColorStop(0.333,  'hsla(120, 100%, 55%, 0.82)');
    rg.addColorStop(0.5,    'hsla(180, 100%, 55%, 0.82)');
    rg.addColorStop(0.666,  'hsla(240, 100%, 65%, 0.82)');
    rg.addColorStop(0.833,  'hsla(300, 100%, 60%, 0.82)');
    rg.addColorStop(1,      'hsla(360, 100%, 60%, 0.82)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = rg; ctx.fill();

    // Glassy bubble shell
    const shell = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
    shell.addColorStop(0,   'rgba(255,255,255,0.55)');
    shell.addColorStop(0.4, 'rgba(255,255,255,0.08)');
    shell.addColorStop(1,   'rgba(255,255,255,0.30)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = shell; ctx.fill();

    // Outer glow ring
    ctx.shadowColor = `hsl(${(rb.frame * 3) % 360}, 100%, 65%)`;
    ctx.shadowBlur  = 28;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur  = 0;

    // "MegaBall" label
    ctx.globalAlpha = 0.9;
    ctx.fillStyle   = '#fff';
    ctx.font        = `bold ${Math.round(R * 0.35)}px sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MegaBall', cx, cy);

    ctx.restore();
  }

  // ── Mega-balls ──
  for (const mb of megaBalls) {
    if (!mb.alive) continue;
    const cx = mb.x, cy = mb.y, R = mb.r;
    ctx.save();
    // Spinning rainbow body
    const spin2 = mb.frame * 0.07;
    const mg = ctx.createConicGradient(spin2, cx, cy);
    mg.addColorStop(0,     'hsl(0,   100%, 60%)');
    mg.addColorStop(0.166, 'hsl(60,  100%, 60%)');
    mg.addColorStop(0.333, 'hsl(120, 100%, 50%)');
    mg.addColorStop(0.5,   'hsl(180, 100%, 50%)');
    mg.addColorStop(0.666, 'hsl(240, 100%, 60%)');
    mg.addColorStop(0.833, 'hsl(300, 100%, 55%)');
    mg.addColorStop(1,     'hsl(360, 100%, 60%)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = mg; ctx.fill();
    // White highlight
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - R * 0.28, cy - R * 0.32, R * 0.34, 0, Math.PI * 2); ctx.fill();
    // Pulse ring
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(mb.frame * 0.22);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 4;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur  = 18;
    ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.restore();
  }

  // Trajectory preview (always shown for both players)
  for (const p of players) {
    const pts = trajectoryPoints(p);
    if (pts.length === 0) continue;
    const isLeft  = p.side === 'left';
    const isMega  = p.hasMegaBall;

    ctx.save();

    // ── Outer glow trail ──
    for (let i = 0; i < pts.length; i++) {
      // thin out: only every 4th dot for the glow layer
      if (i % 4 !== 0) continue;
      const t = i / pts.length;
      const fade = (1 - t) * 0.18;
      ctx.globalAlpha = fade;
      ctx.fillStyle = isMega
        ? `hsl(${(Date.now() / 5 + i * 3) % 360}, 100%, 65%)`
        : isLeft ? '#7dd3fc' : '#f9a8d4';
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Main dots ──
    for (let i = 0; i < pts.length; i++) {
      // Dashed look: skip every other dot; also thin out further along the arc
      if (i % 2 === 0) continue;
      // For longer arcs thin out further along
      if (i > 80 && i % 4 !== 1) continue;

      const t = i / pts.length;
      const fade = 1 - t * 0.85;
      const pulse = Math.sin(Date.now() / 120 + i * 0.55) * 0.5 + 0.5;
      const r = Math.max(1.5, 4.5 - t * 2.5);

      ctx.globalAlpha = fade * (0.65 + pulse * 0.35);
      if (isMega) {
        ctx.fillStyle = `hsl(${(Date.now() / 5 + i * 4) % 360}, 100%, 65%)`;
      } else {
        ctx.fillStyle = isLeft
          ? `hsl(${200 + t * 40}, 100%, ${60 + pulse * 20}%)`
          : `hsl(${320 + t * 30}, 100%, ${65 + pulse * 20}%)`;
      }
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
      ctx.fill();

      // White centre highlight
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Bounce markers — small ring where ball hits ground/obstacle ──
    for (let i = 0; i < pts.length; i++) {
      if (!pts[i].bounce) continue;
      const t = i / pts.length;
      const fade = 1 - t * 0.7;
      ctx.globalAlpha = fade * 0.85;
      ctx.strokeStyle = isMega ? `hsl(${(Date.now() / 5 + i * 4) % 360}, 100%, 75%)` : '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 7, 0, Math.PI * 2);
      ctx.stroke();
      // X mark
      ctx.globalAlpha = fade * 0.7;
      ctx.strokeStyle = isMega ? '#fff' : (isLeft ? '#7dd3fc' : '#f9a8d4');
      ctx.lineWidth = 1.5;
      const s = 4;
      ctx.beginPath();
      ctx.moveTo(pts[i].x - s, pts[i].y - s); ctx.lineTo(pts[i].x + s, pts[i].y + s);
      ctx.moveTo(pts[i].x + s, pts[i].y - s); ctx.lineTo(pts[i].x - s, pts[i].y + s);
      ctx.stroke();
    }

    // ── Sparkles every ~20 pts ──
    for (let i = 0; i < pts.length; i += 20) {
      const t = i / pts.length;
      const fade = (1 - t) * 0.9;
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#fff';
      const rx = pts[i].x, ry = pts[i].y;
      const sr = 4 + (1 - t) * 3;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(Date.now() / 300 + i);
      for (let s = 0; s < 4; s++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillRect(-1, -sr, 2, sr);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // Players
  for (const p of players) {
    ctx.save();

    const flashHide = p.hitFlash > 0 && Math.floor(p.hitFlash / 3) % 2 === 0;
    if (flashHide) ctx.globalAlpha = 0.35;

    const rx = p.x, ry = p.y;
    const cx = rx + PLAYER_W / 2;          // horizontal centre
    const jumpOffset = p.onGround ? 0 : -6;
    const isLeft = p.side === 'left';

    // ── draw full character ──────────────────────────────
    drawCharacter(ctx, cx, ry, PLAYER_W, PLAYER_H, jumpOffset, p.emoji, p.color, isLeft);

    // ── Cannon ──
    ctx.globalAlpha = flashHide ? 0.35 : 1;
    const barrelLen   = 22;
    const barrelAngle = p.cannonAngle;
    const pivotX = isLeft ? rx + PLAYER_W - 4 : rx + 4;
    const pivotY = ry + 38;
    const cn = p.cannon || CANNONS[0];

    // Cannon wheel
    ctx.fillStyle = cn.wheelColor;
    ctx.beginPath();
    ctx.arc(pivotX + (isLeft ? -4 : 4), pivotY + 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = cn.wheelRim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Disco lights flashing on wheel
    if (cn.style === 'lights') {
      const hue = (Date.now() / 8) % 360;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
      ctx.beginPath();
      ctx.arc(pivotX + (isLeft ? -4 : 4), pivotY + 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = flashHide ? 0.35 : 1;
    }

    // Angle indicator arc
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    const arcStartAngle = isLeft ? Math.PI + barrelAngle : barrelAngle;
    ctx.arc(pivotX, pivotY, 14, arcStartAngle, isLeft ? Math.PI : 0,
            isLeft ? barrelAngle > -0.38 : barrelAngle < -0.38);
    ctx.stroke();
    ctx.restore();

    // Cannon barrel
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(isLeft ? barrelAngle : Math.PI - barrelAngle);
    ctx.fillStyle = cn.barrelColor;
    ctx.beginPath();
    ctx.roundRect(0, -5, barrelLen, 10, 3);
    ctx.fill();
    ctx.fillStyle = cn.barrelAccent;
    ctx.fillRect(2, -3, barrelLen - 4, 3);
    // Style-specific barrel decorations
    if (cn.style === 'lights') {
      // blinking LED dots along barrel
      for (let d = 0; d < 3; d++) {
        const hue = ((Date.now() / 6) + d * 120) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
        ctx.beginPath();
        ctx.arc(6 + d * 6, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (cn.style === 'rainbow') {
      // rainbow stripe along barrel
      const grad = ctx.createLinearGradient(0, -5, barrelLen, -5);
      ['#f87171','#fb923c','#facc15','#4ade80','#60a5fa','#a78bfa'].forEach((c, i) => grad.addColorStop(i / 5, c));
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = grad;
      ctx.fillRect(0, -5, barrelLen, 10);
    } else if (cn.style === 'ice') {
      // icy shimmer stripe
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#e0f7ff';
      ctx.fillRect(2, -5, barrelLen - 4, 4);
    } else if (cn.style === 'fire') {
      // fire glow at tip
      const fg = ctx.createRadialGradient(barrelLen, 0, 1, barrelLen, 0, 7);
      fg.addColorStop(0, '#fef08a'); fg.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 80) * 0.3;
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(barrelLen, 0, 7, 0, Math.PI * 2); ctx.fill();
    } else if (cn.style === 'fast') {
      // speed lines
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(barrelLen - 2, -2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2,  1); ctx.lineTo(barrelLen - 3,  1); ctx.stroke();
    } else if (cn.style === 'penguin') {
      // cute face sticker on barrel
      ctx.globalAlpha = 0.9;
      ctx.font = '7px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🐧', barrelLen * 0.55, 0);
    }
    ctx.restore();

    // ⭐ Mega-ball ready indicator — glowing rainbow ring around barrel tip
    if (p.hasMegaBall) {
      const megaDir = isLeft ? 1 : -1;
      const tipX = pivotX + megaDir * barrelLen * Math.cos(barrelAngle);
      const tipY = pivotY + barrelLen * Math.sin(barrelAngle);
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 120);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = `hsl(${(Date.now() / 8) % 360}, 100%, 65%)`;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = `hsl(${(Date.now() / 8) % 360}, 100%, 65%)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tipX, tipY, MEGA_R * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('⭐ MEGA', tipX, tipY - MEGA_R * 0.7);
      ctx.restore();
    }

    ctx.restore();
  }

  // Cooldown bar — shown for both players
  for (const p of players) {
    const maxCool = Math.round(THROW_COOL * (p.cannon ? p.cannon.coolMult : 1));
    const barW  = PLAYER_W - 8;
    const filled = barW * (1 - p.cooldown / maxCool);
    ctx.fillStyle = '#00000022';
    ctx.fillRect(p.x + 4, groundY + 12, barW, 5);
    ctx.fillStyle = p.cooldown === 0 ? '#22c55e' : '#f97316';
    ctx.fillRect(p.x + 4, groundY + 12, Math.max(filled, 0), 5);
  }

}

// ─── Loop ─────────────────────────────────────────────
function loop() {
  if (!gameRunning) return;
  try {
    update();
    draw();
  } catch (err) {
    console.error('Game loop error:', err);
  }
  animId = requestAnimationFrame(loop);
}

// ─── End game ─────────────────────────────────────────
function endGame(winnerSide) {
  gameRunning = false;
  cancelAnimationFrame(animId);
  // winner = right means player (left) lost in 1p; otherwise cheer
  if (mode === '1p') {
    playSound(winnerSide === 'left' ? 'win' : 'lose');
  } else {
    playSound('win');
  }
  const wName = winnerSide === 'left' ? nameLeftEl.textContent : nameRightEl.textContent;
  winnerText.textContent = `🏆 ${wName} Wins!`;
  finalScore.textContent = `${players[0].hp} ❤️  vs  ${players[1].hp} ❤️  remaining`;
  showScreen(screenGameover);
}

// ─── Screen helper ────────────────────────────────────
function showScreen(target) {
  [screenMenu, screenDiff, screenChars, screenWorld, screenCannon, screenControls, screenGame, screenGameover]
    .forEach(s => s.classList.remove('active'));
  target.classList.add('active');
  // Hide side panels unless on game screen
  if (target !== screenGame) {
    sidePanelLeft.classList.remove('visible');
    sidePanelRight.classList.remove('visible');
  }
  // Music: play on menu, stop everywhere else
  if (target === screenMenu) {
    menuMusic.start();
  } else {
    menuMusic.stop();
  }
}

// ─── Character selection ──────────────────────────────
function showCharSelect(step) {
  charSelectStep = step;

  if (step === 0) {
    charTitle.textContent = 'Choose your character';
    charStep.textContent  = mode === '2p' ? 'Player 1' : 'You (Player 1)';
  } else {
    charTitle.textContent = mode === '2p' ? 'Player 2 — choose your character' : 'Pick the AI character';
    charStep.textContent  = mode === '2p' ? 'Player 2' : 'AI opponent';
  }

  // Build the grid
  charGrid.innerHTML = '';
  const currentChoice = step === 0 ? charChoices.left : charChoices.right;
  CHARACTERS.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'char-btn' + (ch === currentChoice ? ' picked' : '');
    btn.innerHTML = `<span class="char-emoji">${ch.emoji}</span><span class="char-name">${ch.name}</span>`;
    btn.addEventListener('click', () => {
      charGrid.querySelectorAll('.char-btn').forEach(b => b.classList.remove('picked'));
      btn.classList.add('picked');
      if (step === 0) charChoices.left  = ch;
      else            charChoices.right = ch;
      updateCharSelectedRow();
      btnCharNext.disabled = false;
    });
    charGrid.appendChild(btn);
  });

  updateCharSelectedRow();
  btnCharNext.disabled = currentChoice === null;
  showScreen(screenChars);
}

function updateCharSelectedRow() {
  const left  = charChoices.left;
  const right = charChoices.right;
  if (charSelectStep === 0) {
    charSelectedRow.innerHTML = left
      ? `<span class="char-preview">${left.emoji} <em>${left.name}</em></span>`
      : '';
  } else {
    charSelectedRow.innerHTML =
      `<span class="char-preview">${left ? left.emoji : '?'}</span>` +
      `<span class="char-vs">VS</span>` +
      `<span class="char-preview">${right ? right.emoji : '?'}</span>`;
  }
}

// ─── Controls screen ──────────────────────────────────
function showControlsScreen() {
  // Fill chosen characters display
  chosenCharsEl.textContent =
    `${charChoices.left.emoji}  VS  ${charChoices.right.emoji}`;

  if (mode === '1p') {
    controlsBody.innerHTML = `
      <div class="controls-grid">
        <span class="ctrl-player">${charChoices.left.emoji} You</span>
        <span><kbd>A</kbd> <kbd>D</kbd></span><span class="ctrl-desc">Move left / right</span>
        <span><kbd>W</kbd> <kbd>S</kbd></span><span class="ctrl-desc">Aim cannon up / down</span>
        <span><kbd>T</kbd></span><span class="ctrl-desc">Throw balloon</span>
      </div>`;
  } else {
    controlsBody.innerHTML = `
      <div class="controls-grid">
        <span class="ctrl-player">${charChoices.left.emoji} Player 1 (left)</span>
        <span><kbd>A</kbd> <kbd>D</kbd></span><span class="ctrl-desc">Move left / right</span>
        <span><kbd>W</kbd> <kbd>S</kbd></span><span class="ctrl-desc">Aim cannon up / down</span>
        <span><kbd>T</kbd></span><span class="ctrl-desc">Throw balloon</span>
        <span class="ctrl-player">${charChoices.right.emoji} Player 2 (right)</span>
        <span><kbd>←</kbd> <kbd>→</kbd></span><span class="ctrl-desc">Move left / right</span>
        <span><kbd>↑</kbd> <kbd>↓</kbd></span><span class="ctrl-desc">Aim cannon up / down</span>
        <span><kbd>M</kbd></span><span class="ctrl-desc">Throw balloon</span>
      </div>`;
  }

  showScreen(screenControls);
}

// ─── World selection ──────────────────────────────────
function showWorldSelect() {
  // Build grid of world cards
  worldGrid.innerHTML = '';
  WORLDS.forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'world-btn' + (w === selectedWorld ? ' picked' : '');
    btn.innerHTML =
      `<span class="world-icon">${w.icon}</span>` +
      `<span class="world-name">${w.name}</span>` +
      `<span class="world-desc">${w.desc}</span>`;
    btn.addEventListener('click', () => {
      selectedWorld = w;
      worldGrid.querySelectorAll('.world-btn').forEach(b => b.classList.remove('picked'));
      btn.classList.add('picked');
      btnWorldNext.disabled = false;
    });
    worldGrid.appendChild(btn);
  });
  btnWorldNext.disabled = false; // always enabled — default world pre-selected
  showScreen(screenWorld);
}

// ─── Cannon selection ─────────────────────────────────
function showCannonSelect(step) {
  cannonSelectStep = step;
  const isP1 = step === 0;
  const currentChoice = isP1 ? cannonChoices.left : cannonChoices.right;

  cannonStep.textContent = mode === '2p'
    ? (isP1 ? 'Player 1' : 'Player 2')
    : (isP1 ? 'Your cannon' : 'AI cannon');

  cannonGrid.innerHTML = '';
  CANNONS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cannon-btn' + (c === currentChoice ? ' picked' : '');
    btn.innerHTML =
      `<span class="cannon-icon">${c.icon}</span>` +
      `<span class="cannon-name">${c.name}</span>` +
      `<span class="cannon-desc">${c.desc}</span>`;
    btn.addEventListener('click', () => {
      if (isP1) cannonChoices.left  = c;
      else      cannonChoices.right = c;
      cannonGrid.querySelectorAll('.cannon-btn').forEach(b => b.classList.remove('picked'));
      btn.classList.add('picked');
      btnCannonNext.disabled = false;
    });
    cannonGrid.appendChild(btn);
  });
  btnCannonNext.disabled = false;
  showScreen(screenCannon);
}

// ─── Events ───────────────────────────────────────────
btn1P.addEventListener('click', () => {
  mode = '1p';
  charChoices = { left: null, right: null };
  showScreen(screenDiff);
});
btn2P.addEventListener('click', () => {
  mode = '2p';
  charChoices = { left: null, right: null };
  showCharSelect(0);
});

// Difficulty buttons
[btnDiffEasy, btnDiffMedium, btnDiffHard].forEach(btn => {
  btn.addEventListener('click', () => {
    [btnDiffEasy, btnDiffMedium, btnDiffHard].forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    aiDifficulty = btn === btnDiffEasy ? 'easy' : btn === btnDiffMedium ? 'medium' : 'hard';
  });
});
btnDiffBack.addEventListener('click', () => showScreen(screenMenu));
btnDiffNext.addEventListener('click', () => showCharSelect(0));

btnCharBack.addEventListener('click', () => {
  if (charSelectStep === 0) {
    showScreen(mode === '1p' ? screenDiff : screenMenu);
  } else {
    showCharSelect(0);
  }
});

btnCharNext.addEventListener('click', () => {
  if (charSelectStep === 0) {
    if (mode === '1p') {
      // Auto-pick a random AI character (different from player's)
      const aiOptions = CHARACTERS.filter(c => c !== charChoices.left);
      charChoices.right = aiOptions[Math.floor(Math.random() * aiOptions.length)];
      showWorldSelect();
    } else {
      showCharSelect(1);
    }
  } else {
    showWorldSelect();
  }
});

btnWorldBack.addEventListener('click', () => {
  if (mode === '1p') {
    showCharSelect(0);
  } else {
    showCharSelect(1);
  }
});
btnWorldNext.addEventListener('click', () => showCannonSelect(0));

btnCannonBack.addEventListener('click', () => {
  if (cannonSelectStep === 0) {
    showWorldSelect();
  } else {
    showCannonSelect(0);
  }
});
btnCannonNext.addEventListener('click', () => {
  if (cannonSelectStep === 0 && mode === '2p') {
    // AI gets a random cannon in 1p; in 2p ask P2
    showCannonSelect(1);
  } else {
    if (mode === '1p') {
      // Auto-assign a random cannon to AI
      cannonChoices.right = CANNONS[Math.floor(Math.random() * CANNONS.length)];
    }
    showControlsScreen();
  }
});

btnCtrlBack.addEventListener('click', () => {
  if (mode === '2p') showCannonSelect(1);
  else               showCannonSelect(0);
});

btnPlay.addEventListener('click', () => startGame());

btnPause.addEventListener('click', () => {
  paused = true;
  pauseOverlay.classList.remove('hidden');
});
btnResume.addEventListener('click', () => {
  paused = false;
  pauseOverlay.classList.add('hidden');
});
btnMenuPause.addEventListener('click', () => {
  gameRunning = false;
  cancelAnimationFrame(animId);
  showScreen(screenMenu);
});
btnRematch.addEventListener('click',  () => startGame());
btnMenuGO.addEventListener('click',   () => showScreen(screenMenu));

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && gameRunning) {
    paused = !paused;
    pauseOverlay.classList.toggle('hidden', !paused);
  }
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key) && gameRunning) {
    e.preventDefault();
  }
});
document.addEventListener('keyup', e => {
  keys[e.key] = false;
});
window.addEventListener('resize', () => { if (gameRunning) { resizeCanvas(); } });

// ─── Init ─────────────────────────────────────────────
showScreen(screenMenu);
