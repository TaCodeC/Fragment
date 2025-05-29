import * as THREE from 'three';
import { createEgo, initCameraEgo } from '../shaders/ego.js';
import { createId } from '../shaders/id.js';
import { createSuperego } from '../shaders/superego.js';

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

const egoLight = new THREE.SpotLight(0x66ccff, 100.); 
egoLight.position.set(0, 15, 0); 
egoLight.target.position.set(0, 0, 0); 
egoLight.angle = Math.PI / 8; 
egoLight.penumbra = 1.0;
egoLight.distance = 50; 
egoLight.decay = 1; 
scene.add(egoLight);
scene.add(egoLight.target);

const floor = createFloor();
scene.add(floor);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.x = 0;
camera.position.y = 10.5; 
camera.position.z = 30;

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

let currentEgo = null;
let currentId = null;
let currentSuperego = null;

// Initialize the ego, either with camera or fallback
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

currentId = createId();
scene.add(currentId);

currentSuperego = createSuperego();
scene.add(currentSuperego);

function animate() {
    requestAnimationFrame(animate);
    control.update(clock.getDelta());
    var time = clock.getElapsedTime();
    
    floor.update(time);
    
     // const now = performance.now();
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
    let distancesp = calculateDistance(currentSuperego, camera);
    currentSuperego.material.uniforms.userDist.value = distancesp;
    currentSuperego.material.uniforms.uTime.value = time;
    orbitEgo(currentSuperego, 1);
    
    let distanceid = calculateDistance(currentId, camera);
    currentId.material.uniforms.userDist.value = distanceid;
    currentId.material.uniforms.uTime.value = time;
    orbitEgo(currentId, 2);
     

    /*
    // FPS FOR PERFOMANCE TESTING
      if (now - lastTime >= 1000) {
    const fps = frameCount / ((now - lastTime) / 1000);
    console.log(`FPS: ${fps.toFixed(1)}`);
    frameCount = 0;
    lastTime = now;
    */
  
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


function orbitEgo(ego, n) {
    if (!ego) return;
    
    const radius = 30;
    const baseAngle = performance.now() * 0.0002; // Base speed of orbit
    // If n=2, add PI (180 degrees) to place the ego opposite to the first one
    const angle = baseAngle + (n === 2 ? Math.PI : 0);
    
    ego.position.x = radius * Math.cos(angle);
    ego.position.y = radius * Math.cos(angle * 0.5) + 13.5; 
    if (ego.position.y < 5) {
        ego.position.y = 5; 
    }
    ego.position.z = radius * Math.sin(angle);
    ego.lookAt(0, 13.5, 0); 
}
function calculateDistance(ego1, camera) {
    if (!ego1 || !camera) return 0;
    
    const egoPosition = new THREE.Vector3();
    ego1.getWorldPosition(egoPosition);
    
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    // Calculate raw distance
    const rawDistance = egoPosition.distanceTo(cameraPosition);
    
    // Define distance thresholds
    const minDistance = 2;   // When closer than this, value is 7
    const maxDistance = 50;  // When farther than this, value is 0.5
    
    // Clamp and normalize the distance (inverted: closer = higher value)
    const clampedDistance = Math.max(minDistance, Math.min(maxDistance, rawDistance));
    const normalizedValue = 7 - 6.5 * ((clampedDistance - minDistance) / (maxDistance - minDistance));
    
    return normalizedValue;
}

