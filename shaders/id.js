import * as THREE from 'three';

export function createId(){
    const geometry = new THREE.SphereGeometry(4, 128, 128);
    const material = new THREE.ShaderMaterial({
        vertexShader: /* glsl */`
          uniform float uTime;
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform float userDist;
          float random(vec3 p) {
            return fract(sin(dot(p, vec3(12.9898, 78.233, 54.53))) * 43758.5453);
          }

          // Fake noise using layered sine functions
          float chaoticNoise(vec3 p, float time) {
            float n = 0.0;
            n += sin(p.x * 10.0 + time * 2.0) * 0.55 * userDist;
            n += sin(p.y * 15.0 + time * 1.7) * 0.34 * userDist;
            n += sin(p.z * 12.0 + time * 2.5) * 0.56 * userDist;
            n += sin((p.x + p.y + p.z) * 8.0 + time * .5) * 0.03;
            n += sin(length(p.xy) * 20.0 - time * 2.0) * 0.02;
            n += random(p * time) * 0.05;
            return n;
          }

          void main() {
            vNormal = normal;
            vPosition = position;

            // Calculate chaotic noise based on position and time
            float noise = chaoticNoise(position, uTime);

            // Displace vertex along its normal
            vec3 displacedPosition = position + normal * noise;

            // Output final position
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
          }
        `,
        fragmentShader: /* glsl */`
          uniform float uTime;
          uniform float userDist; 
          varying vec3 vNormal;
          varying vec3 vPosition;


          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));

            vec2 u = f * f * (3.0 - 2.0 * f);

            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }

          vec3 getLavaColor(vec3 pos, float time, float chaos) {
            float n = noise(pos.xy * 5.0 + time * 0.5) * chaos;
            float pulse = sin(time * 3.0 + pos.z * 10.0) * 0.5 + 0.5;

            // Lava palette
            vec3 deepPurple = vec3(0.2, 0.0, 0.3);
            vec3 darkRed    = vec3(0.5, 0.0, 0.0);
            vec3 orange     = vec3(1.0, 0.3, 0.0);
            vec3 yellow     = vec3(1.0, 1.0, 0.3);

            vec3 color = mix(deepPurple, darkRed, pulse);
            color = mix(color, orange, n * 1.2);
            color = mix(color, yellow, pow(n, 3.0));

            return color;
          }

          void main() {
            vec3 normal = normalize(vNormal);
            vec3 lightDir = normalize(vec3(-.10, 0.15, 1.0));
            float light = clamp(dot(normal, lightDir), 0.2, 1.0);

            vec3 lava = getLavaColor(vPosition * 2.0, uTime, userDist/3.5 );
            gl_FragColor = vec4(lava * light, 1.0);
          }
        `
        ,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x66ccff) },
          userDist: { value: 0.05 } 
        },
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.shaderType = 'water';
      return mesh;
}
