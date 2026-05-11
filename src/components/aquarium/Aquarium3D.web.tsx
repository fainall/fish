import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';

interface Aquarium3DProps {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  fishCount?: number;
  waterType?: 'freshwater' | 'saltwater' | 'brackish';
}

function buildHTML(
  l: number, w: number, h: number,
  fishCount: number, waterType: string,
): string {
  const waterColorStr = waterType === 'saltwater' ? '#006994' : waterType === 'brackish' ? '#4a7c5b' : '#1a6b8a';
  const bgNum         = waterType === 'saltwater' ? 0x061420 : waterType === 'brackish' ? 0x0d1f15 : 0x0a1628;
  const substrateNum  = waterType === 'saltwater' ? 0xc8b560 : waterType === 'brackish' ? 0x7a6540 : 0x8b6914;
  const plantNum      = waterType === 'saltwater' ? 0x1a8c5e : waterType === 'brackish' ? 0x2a7a3a : 0x2d7a2d;

  const fishColors = waterType === 'saltwater'
    ? ['#ff6b35', '#ffd700', '#00ced1', '#ff1493', '#7fff00']
    : ['#ff8c00', '#00bfff', '#ff4500', '#32cd32', '#9932cc'];

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0a1628; overflow:hidden; }
  canvas { display:block; }
  #info {
    position:absolute; bottom:10px; left:0; right:0;
    text-align:center; color:rgba(255,255,255,0.5);
    font-family:sans-serif; font-size:11px; pointer-events:none;
  }
  #dims {
    position:absolute; top:10px; left:10px;
    color:rgba(144,202,249,0.8);
    font-family:sans-serif; font-size:11px; pointer-events:none;
    line-height:1.6;
  }
</style>
</head>
<body>
<div id="dims">
  📐 ${l} × ${w} × ${h} cm<br>
  💧 ${Math.round(l * w * h / 1000)} litros
</div>
<div id="info">Arrastra para rotar • Rueda para zoom</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
const scene = new THREE.Scene();
scene.background = new THREE.Color(${bgNum});
scene.fog = new THREE.FogExp2(${bgNum}, 0.018);

const W = window.innerWidth, H = window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 1000);

const scale = 4 / Math.max(${l}, ${w}, ${h});
const tw = ${w} * scale;
const th = ${h} * scale;
const td = ${l} * scale;

camera.position.set(tw * 1.8, th * 1.2, td * 2.5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ── Iluminación ───────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x334466, 0.7));
const topLight = new THREE.DirectionalLight(0x88ccff, 1.2);
topLight.position.set(0, 10, 0);
topLight.castShadow = true;
scene.add(topLight);
const frontLight = new THREE.DirectionalLight(0x6699bb, 0.5);
frontLight.position.set(0, 0, 5);
scene.add(frontLight);

// ── Vidrio del tanque ─────────────────────────────────────────────────────
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x88ccff, transparent: true, opacity: 0.12,
  roughness: 0, metalness: 0, reflectivity: 0.8,
  side: THREE.DoubleSide, depthWrite: false,
});
const thickness = 0.02;
[
  { size:[tw, th, thickness], pos:[0, 0, td/2] },
  { size:[tw, th, thickness], pos:[0, 0, -td/2] },
  { size:[thickness, th, td], pos:[-tw/2, 0, 0] },
  { size:[thickness, th, td], pos:[tw/2, 0, 0] },
  { size:[tw, thickness, td], pos:[0, -th/2, 0] },
].forEach(({ size, pos }, i) => {
  const mat = i === 4
    ? new THREE.MeshStandardMaterial({ color: ${substrateNum}, roughness: 0.9 })
    : glassMat;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...pos);
  scene.add(mesh);
});

const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(tw, th, td));
scene.add(new THREE.LineSegments(edgeGeo,
  new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4 })));

const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.5, roughness: 0.5 });
const topFrame = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.04, 0.03, td + 0.04), frameMat);
topFrame.position.y = th/2 + 0.015;
scene.add(topFrame);

// ── Sustrato ──────────────────────────────────────────────────────────────
const substrate = new THREE.Mesh(
  new THREE.BoxGeometry(tw - 0.04, 0.08, td - 0.04),
  new THREE.MeshStandardMaterial({ color: ${substrateNum}, roughness: 0.95 })
);
substrate.position.y = -th/2 + 0.04;
scene.add(substrate);

const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(300 * 3);
for(let i = 0; i < 300; i++) {
  pPos[i*3]   = (Math.random()-0.5)*(tw-0.1);
  pPos[i*3+1] = -th/2 + 0.09 + Math.random()*0.02;
  pPos[i*3+2] = (Math.random()-0.5)*(td-0.1);
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: ${substrateNum}, size: 0.015 })));

// ── Agua ──────────────────────────────────────────────────────────────────
const water = new THREE.Mesh(
  new THREE.BoxGeometry(tw-0.05, th-0.12, td-0.05),
  new THREE.MeshPhysicalMaterial({
    color: ${JSON.stringify(waterColorStr)}, transparent: true, opacity: 0.28,
    roughness: 0, metalness: 0.1, side: THREE.FrontSide, depthWrite: false,
  })
);
water.position.y = -0.04;
scene.add(water);

const surface = new THREE.Mesh(
  new THREE.PlaneGeometry(tw-0.05, td-0.05),
  new THREE.MeshPhysicalMaterial({
    color: 0xaaddff, transparent: true, opacity: 0.4,
    roughness: 0, metalness: 0.3, side: THREE.DoubleSide,
  })
);
surface.rotation.x = -Math.PI/2;
surface.position.y = th/2 - 0.08;
scene.add(surface);

const caustics = [];
for(let i = 0; i < 12; i++) {
  const p = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05+Math.random()*0.15, 0.05+Math.random()*0.15),
    new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
  );
  p.rotation.x = -Math.PI/2;
  p.position.set((Math.random()-0.5)*(tw-0.2), -th/2+0.09, (Math.random()-0.5)*(td-0.2));
  p.userData = { base: 0.05+Math.random()*0.15, phase: Math.random()*Math.PI*2 };
  scene.add(p); caustics.push(p);
}

// ── Rocas ─────────────────────────────────────────────────────────────────
const rockMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.9 });
[-tw*0.25, tw*0.25].forEach(x => {
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(th*0.08+Math.random()*th*0.05), rockMat);
  r.position.set(x, -th/2+0.1, (Math.random()-0.5)*td*0.4);
  r.rotation.set(Math.random(), Math.random(), Math.random());
  scene.add(r);
});

// ── Plantas ───────────────────────────────────────────────────────────────
for(let p = 0; p < 5; p++) {
  const stemH = th*(0.2+Math.random()*0.45);
  const px = (Math.random()-0.5)*(tw-0.15);
  const pz = (Math.random()-0.5)*(td-0.15);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.01, stemH, 5),
    new THREE.MeshStandardMaterial({ color: Math.floor(${plantNum}*0.6), roughness: 0.8 })
  );
  stem.position.set(px, -th/2+stemH/2+0.08, pz);
  stem.rotation.z = (Math.random()-0.5)*0.3;
  scene.add(stem);
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(stemH*0.28, 7, 5),
    new THREE.MeshStandardMaterial({ color: ${plantNum}, transparent: true, opacity: 0.88, roughness: 0.6 })
  );
  leaf.scale.set(1, 0.45, 0.6);
  leaf.position.set(px, -th/2+stemH+0.08, pz);
  scene.add(leaf);
}

// ── Peces ─────────────────────────────────────────────────────────────────
const FISH_COLORS = ${JSON.stringify(fishColors)};
const fishList = [];
const count = Math.max(1, Math.min(${fishCount}, 12));
for(let i = 0; i < count; i++) {
  const color = FISH_COLORS[i % FISH_COLORS.length];
  const size = 0.04+Math.random()*0.06;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(size,8,6),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 }));
  body.scale.set(2,0.7,0.9); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(size*0.6,size*1.2,4),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, transparent: true, opacity: 0.8 }));
  tail.rotation.z = Math.PI/2; tail.position.x = -size*1.8; g.add(tail);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(size*0.18,6,6),
    new THREE.MeshStandardMaterial({ color: 0x000000 }));
  eye.position.set(size*1.6, size*0.2, size*0.6); g.add(eye);
  g.position.set(
    (Math.random()-0.5)*(tw-0.25),
    -th/2+0.15+Math.random()*(th-0.35),
    (Math.random()-0.5)*(td-0.25)
  );
  g.userData = {
    speed: 0.003+Math.random()*0.004,
    angle: Math.random()*Math.PI*2,
    angleY: (Math.random()-0.5)*0.3,
    radius: 0.2+Math.random()*Math.min(tw,td)*0.3,
    centerX: (Math.random()-0.5)*tw*0.5,
    centerZ: (Math.random()-0.5)*td*0.5,
    centerY: -th/2+0.15+Math.random()*(th-0.35),
    tailPhase: Math.random()*Math.PI*2,
  };
  scene.add(g); fishList.push(g);
}

// ── Burbujas ──────────────────────────────────────────────────────────────
const bubbles = [];
for(let b = 0; b < 30; b++) {
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.008+Math.random()*0.012,6,6),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0, metalness: 0 })
  );
  bubble.position.set((Math.random()-0.5)*(tw-0.1), -th/2+Math.random()*th, (Math.random()-0.5)*(td-0.1));
  bubble.userData = { speed: 0.002+Math.random()*0.003, wobble: Math.random()*Math.PI*2 };
  scene.add(bubble); bubbles.push(bubble);
}

// ── Controles ─────────────────────────────────────────────────────────────
let isDragging=false, prevX=0, prevY=0, rotX=0.3, rotY=0.5, autoRotate=true;
let camDist = camera.position.length();

renderer.domElement.addEventListener('mousedown', e => { isDragging=true; autoRotate=false; prevX=e.clientX; prevY=e.clientY; });
renderer.domElement.addEventListener('mousemove', e => {
  if(!isDragging) return;
  rotY += (e.clientX-prevX)*0.008; rotX += (e.clientY-prevY)*0.008;
  rotX = Math.max(-Math.PI/3, Math.min(Math.PI/3, rotX));
  prevX=e.clientX; prevY=e.clientY;
});
renderer.domElement.addEventListener('mouseup', () => isDragging=false);
renderer.domElement.addEventListener('wheel', e => {
  camDist += e.deltaY * 0.01;
  camDist = Math.max(1, Math.min(12, camDist));
}, { passive: true });
renderer.domElement.addEventListener('touchstart', e => {
  isDragging=true; autoRotate=false;
  prevX=e.touches[0].clientX; prevY=e.touches[0].clientY;
}, {passive:true});
renderer.domElement.addEventListener('touchmove', e => {
  if(!isDragging) return;
  rotY+=(e.touches[0].clientX-prevX)*0.008; rotX+=(e.touches[0].clientY-prevY)*0.008;
  rotX=Math.max(-Math.PI/3,Math.min(Math.PI/3,rotX));
  prevX=e.touches[0].clientX; prevY=e.touches[0].clientY;
}, {passive:true});
renderer.domElement.addEventListener('touchend', () => isDragging=false);

// ── Animación ─────────────────────────────────────────────────────────────
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.016;
  if(autoRotate) rotY += 0.003;
  const r = camDist;
  camera.position.x = r*Math.sin(rotY)*Math.cos(rotX);
  camera.position.y = r*Math.sin(rotX)+th*0.1;
  camera.position.z = r*Math.cos(rotY)*Math.cos(rotX);
  camera.lookAt(0,0,0);

  fishList.forEach(fish => {
    const d = fish.userData;
    d.angle += d.speed;
    fish.position.x = Math.max(-tw/2+0.15, Math.min(tw/2-0.15, d.centerX+Math.cos(d.angle)*d.radius));
    fish.position.z = Math.max(-td/2+0.15, Math.min(td/2-0.15, d.centerZ+Math.sin(d.angle)*d.radius));
    fish.position.y = Math.max(-th/2+0.15, Math.min(th/2-0.15, d.centerY+Math.sin(d.angle*0.7+d.angleY)*0.06));
    fish.rotation.y = -d.angle+Math.PI/2;
    if(fish.children[1]) fish.children[1].rotation.y = Math.sin(t*8+d.tailPhase)*0.4;
  });

  bubbles.forEach(b => {
    b.position.y += b.userData.speed;
    b.position.x += Math.sin(t+b.userData.wobble)*0.001;
    if(b.position.y > th/2-0.1) {
      b.position.y = -th/2+0.1;
      b.position.x = (Math.random()-0.5)*(tw-0.1);
    }
  });

  caustics.forEach(c => {
    c.material.opacity = c.userData.base*(0.7+0.3*Math.sin(t*1.5+c.userData.phase));
  });
  surface.position.y = th/2-0.08+Math.sin(t*0.8)*0.004;
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  const W=window.innerWidth, H=window.innerHeight;
  camera.aspect=W/H; camera.updateProjectionMatrix(); renderer.setSize(W,H);
});
</script>
</body>
</html>`;
}

export default function Aquarium3D({
  lengthCm, widthCm, heightCm,
  fishCount = 0, waterType = 'freshwater',
}: Aquarium3DProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html = buildHTML(lengthCm, widthCm, heightCm, fishCount, waterType);

  return (
    <View style={styles.container}>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={styles.iframe as any}
        frameBorder="0"
        scrolling="no"
        title="Aquarium 3D"
        sandbox="allow-scripts"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
  },
  iframe: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0a1628',
    borderRadius: 16,
  } as any,
});
