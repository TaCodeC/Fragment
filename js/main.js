import * as THREE from 'three';
import { createEgo, initCameraEgo } from '../shaders/ego.js';
import SpectatorControls from './SpectatorControls.js';
import { createFloor } from '../shaders/floor.js';
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
let lastTime = performance.now();
let frameCount = 0;


// Initialize scene, camera, and renderer
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const canvas = renderer.domElement;

// Egospotlight
const egoLight = new THREE.SpotLight(0x66ccff, 100.); 
egoLight.position.set(0, 15, 0); 
egoLight.target.position.set(0, 0, 0); 
egoLight.angle = Math.PI / 8; 
egoLight.penumbra = 1.0;
egoLight.distance = 50; 
egoLight.decay = 1; 
scene.add(egoLight);
scene.add(egoLight.target);

// Create floor
const floor = createFloor();
scene.add(floor);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.x = 0;
camera.position.y = 3.5; 
camera.position.z = 10;

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

// Variable to store current ego
let currentEgo = null;

async function init() {
    try {
        // Try to initialize with camera
        const cameraEgo = await initCameraEgo(scene);
        currentEgo = cameraEgo.ego;
        currentEgo.position.set(0, 13.5, 0);
        console.log('Camera ego initialized successfully');
        
        // camera controls
        document.addEventListener('keydown', (event) => {
            switch(event.code) {
                case 'KeyQ': // Q for less camera opacity
                    cameraEgo.setCameraOpacity(Math.max(0, cameraEgo.ego.material.uniforms.uCameraOpacity.value - 0.1));
                    break;
                case 'KeyE': // E for more camera opacity
                    cameraEgo.setCameraOpacity(Math.min(1, cameraEgo.ego.material.uniforms.uCameraOpacity.value + 0.1));
                    break;
                case 'KeyR': // R to toggle distortion
                    const currentDistortion = cameraEgo.ego.material.uniforms.uDistortion.value;
                    cameraEgo.setDistortion(currentDistortion > 0.05 ? 0.01 : 0.05);
                    break;
            }
        });
        
    } catch (error) {
        console.error('Camera not available:', error);
        // Fallback: use ego without camera
        const ego = createEgo();
        scene.add(ego);
        currentEgo = ego;
        console.log('Fallback ego initialized');
    }
}

function animate() {
    requestAnimationFrame(animate);
    // Update controls
    control.update(clock.getDelta());
    var time = clock.getElapsedTime();

    floor.update(time);
      const now = performance.now();
    frameCount++;

    if (currentEgo) {
        if (currentEgo.animate) {
            // For camera ego
            currentEgo.animate(time);
            const camPos = new THREE.Vector3();
            camera.getWorldPosition(camPos);
            currentEgo.lookAt(camPos);
            // Update light direction 
            const dir = new THREE.Vector3().subVectors(
            egoLight.position,
            currentEgo.position
            ).normalize();
            currentEgo.material.uniforms.uLightDir.value.copy(dir);

            
        } else {
            // For basic ego
            currentEgo.material.uniforms.uTime.value = time;
        }
    }
      if (now - lastTime >= 1000) {
    const fps = frameCount / ((now - lastTime) / 1000);
    console.log(`FPS: ${fps.toFixed(1)}`);
    frameCount = 0;
    lastTime = now;
  }
    // Render
    renderer.render(scene, camera);
}

// Window resize handler
window.onresize = () => {
    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
    renderer.setSize(WIDTH, HEIGHT);
};

// Initialize and start animation
init().then(() => {
    animate();
}).catch((error) => {
    console.error('Initialization failed:', error);
    // Still start animation with fallback
    animate();
});