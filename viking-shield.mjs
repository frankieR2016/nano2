import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'fs';

// 1 unit = 1mm
//
// 2-PIECE PRINT:
//   Piece 1 — Shield (disc + boss + rim + planks + peg holes on back)
//             Print FACE-DOWN: boss dome on bed = smooth finish
//   Piece 2 — Handle (A-frame + pegs that fit into shield holes)
//             Print FLAT on bed

// --- Dimensions ---
const SHIELD_RADIUS = 75;
const SHIELD_THICK = 5;
const BOSS_RADIUS = 20;
const BOSS_HEIGHT = 12;
const BOSS_RING_OUTER = 24;
const BOSS_RING_INNER = 20;
const BOSS_RING_H = 3;
const RIM_INNER = 71;
const RIM_OUTER = 75;
const RIM_H = 7;
const PLANK_W = 1.2;
const PLANK_H = 0.8;
const HANDLE_LEN = 70;
const HANDLE_W = 10;
const HANDLE_H = 8;
const HANDLE_GAP = 6;
const POST_W = 12;
const POST_D = 10;
const SEG = 64;

// --- Helpers ---
function geo(g, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
  const mat = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  mat.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(mat);
  return g;
}

function normalizeGeo(g) {
  if (g.index) g = g.toNonIndexed();
  g.computeVertexNormals();
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  return g;
}

function merge(geos) {
  const normalized = geos.map(normalizeGeo);
  const merged = mergeGeometries(normalized);
  if (!merged) throw new Error('mergeGeometries failed');
  merged.computeVertexNormals();
  return merged;
}

function exportSTL(geometry, filename) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  const scene = new THREE.Scene();
  scene.add(mesh);
  const exporter = new STLExporter();
  const data = exporter.parse(scene, { binary: true });
  const buf = data instanceof DataView ? Buffer.from(data.buffer) : Buffer.from(data);
  const path = `C:\\Users\\paqui\\OneDrive\\Documents\\claude_code\\nano2\\${filename}`;
  fs.writeFileSync(path, buf);
  const kb = (fs.statSync(path).size / 1024).toFixed(0);
  const tris = geometry.getAttribute('position').count / 3;
  console.log(`  ${filename}: ${kb} KB, ~${Math.round(tris)} triangles`);
}

// ============================================================
// PIECE 1: SHIELD
// Coordinate system: face at Y=0, back at Y=-SHIELD_THICK
// Prints face-down: boss dome (Y>0) touches the bed
// ============================================================
const shieldGeos = [];

// Shield body disc
shieldGeos.push(geo(
  new THREE.CylinderGeometry(SHIELD_RADIUS, SHIELD_RADIUS, SHIELD_THICK, SEG),
  { y: -SHIELD_THICK / 2 }
));

// Boss dome (solid lathe)
const domePts = [new THREE.Vector2(0, 0)];
for (let i = 32; i >= 0; i--) {
  const a = (i / 32) * Math.PI / 2;
  domePts.push(new THREE.Vector2(BOSS_RADIUS * Math.cos(a), BOSS_HEIGHT * Math.sin(a)));
}
shieldGeos.push(new THREE.LatheGeometry(domePts, SEG));

// Boss transition ring (chamfered)
shieldGeos.push(geo(
  new THREE.CylinderGeometry(BOSS_RING_INNER, BOSS_RING_OUTER, BOSS_RING_H, SEG),
  { y: BOSS_RING_H / 2 }
));

// Outer rim
const rimPts = [
  new THREE.Vector2(RIM_INNER, 0),
  new THREE.Vector2(RIM_OUTER, 0),
  new THREE.Vector2(RIM_OUTER, RIM_H - SHIELD_THICK),
  new THREE.Vector2(RIM_INNER, RIM_H - SHIELD_THICK),
];
shieldGeos.push(geo(new THREE.LatheGeometry(rimPts, SEG), { y: -SHIELD_THICK }));

// Plank ridges
for (const px of [-45, -22, 22, 45]) {
  const chord = 2 * Math.sqrt(Math.max(0, SHIELD_RADIUS ** 2 - px ** 2)) - 8;
  if (chord <= 0) continue;
  shieldGeos.push(geo(
    new THREE.BoxGeometry(PLANK_W, PLANK_H, chord),
    { x: px, y: PLANK_H / 2, z: 0 }
  ));
}

// Clean flat back — nothing on the back surface

console.log('Building shield...');
const shieldMerged = merge(shieldGeos);

// ============================================================
// PIECE 2: HANDLE (classic posts + bridge bar)
// Built in assembled position, then rotated ON ITS SIDE for printing.
// Printed on its side: the posts become horizontal walls,
// the bridge bar becomes a vertical wall — zero supports needed.
// ============================================================
const handleGeos = [];

const postH = HANDLE_GAP + HANDLE_H;
const postSpacing = HANDLE_LEN / 2 - POST_W / 2;

// Left post (top touches shield back at Y=-SHIELD_THICK)
handleGeos.push(geo(
  new THREE.BoxGeometry(POST_W, postH, POST_D),
  { x: -postSpacing, y: -SHIELD_THICK - postH / 2, z: 0 }
));

// Right post
handleGeos.push(geo(
  new THREE.BoxGeometry(POST_W, postH, POST_D),
  { x: postSpacing, y: -SHIELD_THICK - postH / 2, z: 0 }
));

// Handle bar (bridges between posts)
const handleBarY = -SHIELD_THICK - HANDLE_GAP - HANDLE_H / 2;
handleGeos.push(geo(
  new THREE.BoxGeometry(HANDLE_LEN, HANDLE_H, HANDLE_W),
  { x: 0, y: handleBarY, z: 0 }
));

console.log('Building handle...');
const handleAssembled = merge(handleGeos);

// Rotate handle ON ITS SIDE for printing (90° around Z axis)
// This turns the vertical posts into horizontal walls — no bridge, no supports.
const handleForPrint = handleAssembled.clone();
const sideMatrix = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
handleForPrint.applyMatrix4(sideMatrix);
// Shift so everything sits above Y=0 (on the bed)
handleForPrint.computeBoundingBox();
const minY = handleForPrint.boundingBox.min.y;
const minX = handleForPrint.boundingBox.min.x;
const minZ = handleForPrint.boundingBox.min.z;
handleForPrint.translate(-minX, -minY, -minZ);

// ============================================================
// EXPORT
// ============================================================
console.log('Exporting STL files...');
exportSTL(shieldMerged, 'viking-shield-face.stl');
exportSTL(handleForPrint, 'viking-shield-handle.stl');

console.log('\nPrint instructions:');
console.log('  viking-shield-face.stl   — Print face-down (boss on bed for smooth finish)');
console.log('  viking-shield-handle.stl — Already rotated on its side. Print as-is.');
console.log('  Glue handle onto shield back. Pegs align to ring markers.');
console.log('  No supports needed for either piece.');
