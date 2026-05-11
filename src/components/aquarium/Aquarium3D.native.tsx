import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

interface Aquarium3DProps {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  fishCount?: number;
  waterType?: 'freshwater' | 'saltwater' | 'brackish';
}

function buildHTML(l: number, w: number, h: number, fishCount: number, waterType: string): string {
  const waterColor   = waterType === 'saltwater' ? '#006994' : waterType === 'brackish' ? '#4a7c5b' : '#1a6b8a';
  const bgNum        = waterType === 'saltwater' ? 0x061420 : waterType === 'brackish' ? 0x0d1f15 : 0x0a1628;
  const substrateNum = waterType === 'saltwater' ? 0xc8b560 : waterType === 'brackish' ? 0x7a6540 : 0x8b6914;
  const plantNum     = waterType === 'saltwater' ? 0x1a8c5e : waterType === 'brackish' ? 0x2a7a3a : 0x2d7a2d;

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
<div id="info">Arrastra para rotar • Pellizca para zoom</div>

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

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = false;
document.body.appendChild(renderer.domElement);

// ── Lighting ─────────────────────────────────────
scene.add(new THREE.AmbientLight(0x334466, 0.7));
const topLight = new THREE.DirectionalLight(0x88ccff, 1.2);
topLight.position.set(0, 10, 0);
topLight.castShadow = true;
scene.add(topLight);
const frontLight = new THREE.DirectionalLight(0x6699bb, 0.5);
frontLight.position.set(0, 0, 5);
scene.add(frontLight);

// ── Tank glass ───────────────────────────────────
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

// ── Substrate ────────────────────────────────────
const substrate = new THREE.Mesh(
  new THREE.BoxGeometry(tw - 0.04, 0.08, td - 0.04),
  new THREE.MeshStandardMaterial({ color: ${substrateNum}, roughness: 0.95 })
);
substrate.position.y = -th/2 + 0.04;
scene.add(substrate);

const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(300 * 3);
for(let i = 0; i < 300; i++) {
  pPos[i*3]   = (Math.random() - 0.5) * (tw - 0.1);
  pPos[i*3+1] = -th/2 + 0.08 + Math.random() * 0.02;
  pPos[i*3+2] = (Math.random() - 0.5) * (td - 0.1);
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: ${substrateNum}, size: 0.015 })));

// ── Water ─────────────────────────────────────────
const water = new THREE.Mesh(
  new THREE.BoxGeometry(tw - 0.05, th - 0.12, td - 0.05),
  new THREE.MeshPhysicalMaterial({
    color: ${JSON.stringify(waterColor)}, transparent: true, opacity: 0.25,
    roughness: 0, metalness: 0.1, side: THREE.FrontSide, depthWrite: false,
  })
);
water.position.y = -0.04;
scene.add(water);

const surface = new THREE.Mesh(
  new THREE.PlaneGeometry(tw - 0.05, td - 0.05),
  new THREE.MeshPhysicalMaterial({
    color: 0xaaddff, transparent: true, opacity: 0.4,
    roughness: 0, metalness: 0.3, side: THREE.DoubleSide,
  })
);
surface.rotation.x = -Math.PI / 2;
surface.position.y = th/2 - 0.08;
scene.add(surface);

const causticLines = [];
for(let i = 0; i < 12; i++) {
  const p = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05 + Math.random() * 0.15, 0.05 + Math.random() * 0.15),
    new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
  );
  p.rotation.x = -Math.PI / 2;
  p.position.set((Math.random()-0.5)*(tw-0.2), -th/2+0.09, (Math.random()-0.5)*(td-0.2));
  p.userData = { baseOpacity: 0.05 + Math.random() * 0.15, phase: Math.random() * Math.PI * 2 };
  scene.add(p); causticLines.push(p);
}

// ── Decorations ───────────────────────────────────
const rockMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.9 });
[-tw*0.25, tw*0.25].forEach(x => {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(th * 0.08 + Math.random() * th * 0.05), rockMat
  );
  rock.position.set(x, -th/2 + 0.1, (Math.random()-0.5)*td*0.4);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  scene.add(rock);
});

for(let p = 0; p < 5; p++) {
  const stemH = th * (0.2 + Math.random() * 0.4);
  const px = (Math.random()-0.5)*(tw-0.2);
  const pz = (Math.random()-0.5)*(td-0.2);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.01, stemH, 5),
    new THREE.MeshStandardMaterial({ color: Math.floor(${plantNum} * 0.6), roughness: 0.8 })
  );
  stem.position.set(px, -th/2 + stemH/2 + 0.08, pz);
  stem.rotation.z = (Math.random()-0.5)*0.3;
  scene.add(stem);
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(stemH * 0.25, 6, 4),
    new THREE.MeshStandardMaterial({ color: ${plantNum}, transparent: true, opacity: 0.85, roughness: 0.7 })
  );
  leaf.scale.set(1, 0.5, 0.6);
  leaf.position.set(px, -th/2 + stemH + 0.08, pz);
  scene.add(leaf);
}

// ── Fish ──────────────────────────────────────────
const FISH_COLORS = ${JSON.stringify(fishColors)};
const fishList = [];
const fishCount = Math.max(1, Math.min(${fishCount}, 12));
for(let i = 0; i < fishCount; i++) {
  const color = FISH_COLORS[i % FISH_COLORS.length];
  const size = 0.04 + Math.random() * 0.06;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(size,8,6),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 }));
  body.scale.set(2,0.7,0.9); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(size*0.6, size*1.2, 4),
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
    radius: 0.2+Math.random()*(Math.min(tw,td)*0.3),
    centerX: (Math.random()-0.5)*(tw*0.5),
    centerZ: (Math.random()-0.5)*(td*0.5),
    centerY: -th/2+0.15+Math.random()*(th-0.35),
    tailPhase: Math.random()*Math.PI*2,
  };
  scene.add(g); fishList.push(g);
}

// ── Bubbles ───────────────────────────────────────
const bubbles = [];
for(let b = 0; b < 30; b++) {
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.008+Math.random()*0.012,6,6),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0, metalness: 0 })
  );
  bubble.position.set((Math.random()-0.5)*(tw-0.1), -th/2+Math.random()*th, (Math.random()-0.5)*(td-0.1));
  bubble.userData = { speed: 0.002+Math.random()*0.003, wobble: Math.random()*Math.PI*2, startY: -th/2+0.1 };
  scene.add(bubble); bubbles.push(bubble);
}

// ── Controls ──────────────────────────────────────
let isDragging=false, prevX=0, prevY=0, rotX=0.3, rotY=0.5, autoRotate=true;
let camDist = camera.position.length();
let initDist = 0;

const onDown = e => {
  isDragging=true; autoRotate=false;
  prevX=e.touches?e.touches[0].clientX:e.clientX;
  prevY=e.touches?e.touches[0].clientY:e.clientY;
};
const onMove = e => {
  if(!isDragging) return;
  const x=e.touches?e.touches[0].clientX:e.clientX;
  const y=e.touches?e.touches[0].clientY:e.clientY;
  rotY+=(x-prevX)*0.008; rotX+=(y-prevY)*0.008;
  rotX=Math.max(-Math.PI/3,Math.min(Math.PI/3,rotX));
  prevX=x; prevY=y;
};
const onUp = () => { isDragging=false; };

renderer.domElement.addEventListener('mousedown', onDown);
renderer.domElement.addEventListener('mousemove', onMove);
renderer.domElement.addEventListener('mouseup', onUp);
renderer.domElement.addEventListener('touchstart', onDown, {passive:true});
renderer.domElement.addEventListener('touchmove', onMove, {passive:true});
renderer.domElement.addEventListener('touchend', onUp);

renderer.domElement.addEventListener('touchstart', e => {
  if(e.touches.length===2) initDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
},{passive:true});
renderer.domElement.addEventListener('touchmove', e => {
  if(e.touches.length===2){
    const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    camDist*=initDist/d; camDist=Math.max(1,Math.min(12,camDist)); initDist=d;
  }
},{passive:true});

// ── Animation ─────────────────────────────────────
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
    const d=fish.userData;
    d.angle+=d.speed;
    fish.position.x=Math.max(-tw/2+0.15,Math.min(tw/2-0.15,d.centerX+Math.cos(d.angle)*d.radius));
    fish.position.z=Math.max(-td/2+0.15,Math.min(td/2-0.15,d.centerZ+Math.sin(d.angle)*d.radius));
    fish.position.y=Math.max(-th/2+0.15,Math.min(th/2-0.15,d.centerY+Math.sin(d.angle*0.7+d.angleY)*0.06));
    fish.rotation.y=-d.angle+Math.PI/2;
    const tail=fish.children[1];
    if(tail) tail.rotation.y=Math.sin(t*8+d.tailPhase)*0.4;
  });

  bubbles.forEach(b => {
    b.position.y+=b.userData.speed;
    b.position.x+=Math.sin(t+b.userData.wobble)*0.001;
    if(b.position.y>th/2-0.1){ b.position.y=b.userData.startY; b.position.x=(Math.random()-0.5)*(tw-0.1); }
  });

  causticLines.forEach(c => {
    c.material.opacity=c.userData.baseOpacity*(0.7+0.3*Math.sin(t*1.5+c.userData.phase));
  });
  surface.position.y=th/2-0.08+Math.sin(t*0.8)*0.004;
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

function Fallback({ lengthCm, widthCm, heightCm }: { lengthCm: number; widthCm: number; heightCm: number }) {
  const liters = Math.round(lengthCm * widthCm * heightCm / 1000);
  return (
    <View style={[styles.container, styles.fallback]}>
      <Ionicons name="cube-outline" size={48} color={COLORS.primary} />
      <Text style={styles.fallbackTitle}>Vista 3D no disponible</Text>
      <Text style={styles.fallbackText}>📐 {lengthCm} × {widthCm} × {heightCm} cm</Text>
      <Text style={styles.fallbackText}>💧 {liters} litros</Text>
    </View>
  );
}

export default function Aquarium3D({
  lengthCm, widthCm, heightCm,
  fishCount = 0, waterType = 'freshwater',
}: Aquarium3DProps) {
  const [hasError, setHasError] = useState(false);

  // Validate inputs — bad data crashes the WebGL setup
  if (!Number.isFinite(lengthCm) || !Number.isFinite(widthCm) || !Number.isFinite(heightCm) ||
      lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
    return <Fallback lengthCm={lengthCm || 0} widthCm={widthCm || 0} heightCm={heightCm || 0} />;
  }

  if (hasError) return <Fallback lengthCm={lengthCm} widthCm={widthCm} heightCm={heightCm} />;

  const html = buildHTML(lengthCm, widthCm, heightCm, fishCount, waterType);

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onError={() => setHasError(true)}
        onHttpError={(e: any) => {
          // CDN failure — show fallback instead of broken WebView
          if (e?.nativeEvent?.statusCode >= 400) setHasError(true);
        }}
        onContentProcessDidTerminate={() => setHasError(true)}
        renderError={() => <Fallback lengthCm={lengthCm} widthCm={widthCm} heightCm={heightCm} />}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        )}
        startInLoadingState
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
  webview: { flex: 1, backgroundColor: '#0a1628' },
  loading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0a1628',
  },
  fallback: {
    backgroundColor: '#0a1628',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  fallbackTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 8 },
  fallbackText:  { color: '#a8c5e0', fontSize: 13 },
});
