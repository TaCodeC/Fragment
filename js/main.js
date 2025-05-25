import * as THREE from 'three';
import SpectatorControls from './SpectatorControls.js';

// Initialize scene, camera, and renderer
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const canvas = renderer.domElement;
// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;
// Debug cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Spectator controls init
const control = new SpectatorControls(camera);
control.disable();

// Mouse lock
canvas.addEventListener('click', () => {
  canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    control.enable();
  } else {
    control.disable();
  }
});
const clock = new THREE.Clock();


// Animation loop
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.y += 0.10;
  control.update(clock.getDelta());
  renderer.render(scene, camera);
}
animate();
