import * as THREE from 'three';
// falback to ego if no camera is available
export function createEgo(){
    const geometry = new THREE.SphereGeometry(8, 64, 64);
    const material = new THREE.ShaderMaterial({
        vertexShader: /* glsl */`
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
        vUv = uv * 10.0;

        // aplicas la onda
        vec3 pos = position;
        pos.z += sin((position.x + uTime) * 2.0) * 0.1
                + cos((position.y + uTime) * 2.5) * 0.1;

        // pasas la posición mundial ya desplazada
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;

        gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
        `,
        fragmentShader: /* glsl */`
          uniform vec3 uColor;
          varying vec3 vNormal;
          varying vec3 vPosition;
    
          void main() {
            vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            float light = dot(normalize(vNormal), lightDir);
            light = clamp(light, 0.2, 1.0);
            gl_FragColor = vec4(uColor * light, 1.0);
          }
        `,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x66ccff) }
        },
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.shaderType = 'water';
      return mesh;
    }
//helper function to setup the camera
export async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user' // 'user' for front camera, 'environment' for back camera
            }
        });
        
        // Create video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
            video.addEventListener('loadedmetadata', resolve);
            
        });
        await video.play();

        
        return video;
    } catch (error) {
        console.error('Error accessing camera:', error);
        throw error;
    }
}
// This function creates an ego with a camera texture
export function createEgoWithCamera(videoElement) {
  const geometry = new THREE.SphereGeometry(8, 64, 64);
  const videoTexture = new THREE.VideoTexture(videoElement);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.format = THREE.RGBFormat;
  videoTexture.flipY = false;

  const material = new THREE.ShaderMaterial({
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        vNormal = normalMatrix * normal;
        vUv = uv;
        vUv.y = 1.0 - vUv.y;

        float noise = sin(position.x * 3.0 + uTime) * 0.1
                    + sin(position.y * 5.0 + uTime * 1.5) * 0.07
                    + sin(position.z * 4.0 + uTime * 0.8) * 0.08;
        vec3 displaced = position + normal * noise;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uTime;
      uniform sampler2D uCameraTexture;
      uniform float uCameraOpacity;
      uniform float uDistortion;
      uniform vec3 uLightDir;

      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        // Distortion
        vec2 dv = vUv;
        dv.x += sin(vUv.y * 10.0 + uTime * 2.0) * uDistortion;
        dv.y += cos(vUv.x * 10.0 + uTime * 1.5) * uDistortion;
        vec3 camColor = texture2D(uCameraTexture, dv).rgb;

        // Lighting from Three.js light direction
        float light = max(dot(normalize(vNormal), normalize(uLightDir)), 0.0);

        // Fresnel emission
        float fresnel = pow(1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 2.0);
        vec3 emission = vec3(0.2, 0.6, 1.0) * fresnel * 1.5;

        // Base and mix
        vec3 base = uColor;
        base.b += sin(uTime * 2.0) * 0.4;
        base.g += cos(uTime * 1.5) * 0.6;
        vec3 color = mix(base * light, camColor, uCameraOpacity);

        // Final
        vec3 finalColor = mix(color, vec3(1.0), fresnel * 0.2) + emission;
        gl_FragColor = vec4(finalColor, 0.9);
      }
    `,
    uniforms: {
      uTime:        { value: 0 },
      uColor:       { value: new THREE.Color(0x66ccff) },
      uCameraTexture: { value: videoTexture },
      uCameraOpacity: { value: 0.25 },
      uDistortion:    { value: 0.02 },
      uLightDir:      { value: new THREE.Vector3(1, 1, 1).normalize() }
    },
    transparent: true,
    side: THREE.DoubleSide
  });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.shaderType = 'waterCamera';
    mesh.userData.videoTexture = videoTexture; 
    
    mesh.animate = function(time) {
        this.material.uniforms.uTime.value = time;
            this.userData.videoTexture.needsUpdate = true;
    };
    
    mesh.setCameraOpacity = function(opacity) {
        this.material.uniforms.uCameraOpacity.value = opacity;
    };
    
    mesh.setDistortion = function(distortion) {
        this.material.uniforms.uDistortion.value = distortion;
    };
    
    return mesh;
}

export async function initCameraEgo(scene) {
    try {
        // 1. Get camera access
        const video = await setupCamera();
        
        // 2. Create ego with camera texture
        const ego = createEgoWithCamera(video);
        scene.add(ego);
        
        // 3. Camera controls
        return {
            ego,
            video,
            // Control methods
            setCameraOpacity: (opacity) => ego.setCameraOpacity(opacity),
            setDistortion: (distortion) => ego.setDistortion(distortion),
            // Function to stop camera
            stopCamera: () => {
                const stream = video.srcObject;
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            },
            // Function to update camera in real-time (call this every frame)
            updateCamera: () => {
                if (ego.userData.videoTexture) {
                    ego.userData.videoTexture.needsUpdate = true;
                }
            }
        };
    } catch (error) {
        console.error('Failed to initialize camera ego:', error);
        throw error;
    }
}