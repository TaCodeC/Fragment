import * as THREE from 'three';

export function createFloor() {
  const geo = new THREE.PlaneGeometry(100, 100, 128, 128);

  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec3 vWorldPosition;

      float oceanWave(vec2 pos, float time) {
        float d = length(pos);
        return sin(d * 0.2 - time * 1.0) * 0.8
             + sin(d * 0.5 - time * 0.7) * 0.4
             + sin(d * 1.0 - time * 0.4) * 0.2;
      }

      void main() {
        vec3 pos = position;
        pos.z += oceanWave(position.xz, uTime);
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      varying vec3 vWorldPosition;

      float oceanWave(vec2 pos, float time) {
        float d = length(pos);
        return sin(d * 0.2 - time * 1.0) * 0.8
             + sin(d * 0.5 - time * 0.7) * 0.4
             + sin(d * 1.0 - time * 0.4) * 0.2;
      }

      void main() {
        float dist = length(vWorldPosition.xz);

        // Gradient
        vec3 centerColor = vec3(0.0, 0.4, 0.6);
        vec3 edgeColor   = vec3(0.0);
        float fadeBase = smoothstep(0.0, 50.0, dist);
        vec3 color = mix(centerColor, edgeColor, fadeBase);

        // ocean foam
        float fadeFoam = smoothstep(20.0, 5.0, dist);
        float waveVal   = oceanWave(vWorldPosition.xz, uTime);
        float crestFoam = smoothstep(0.5, 0.7, waveVal) * fadeFoam * 0.8;
        color = mix(color, vec3(1.0), crestFoam);

        // whitecaps
        float ringSpeed    = 3.0;   // van más rápido
        float ringSpacing  = 1.0;   // más densos
        float m = mod(dist - uTime * ringSpeed, ringSpacing);
        float ringRaw = smoothstep(0.05, 0.0, abs(m - ringSpacing * 0.5));

        float fadeRing = smoothstep(10.0, 1.0, dist);
        float ring = ringRaw * fadeRing * 0.6;  

        color += ring;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    uniforms: {
      uTime: { value: 0 }
    },
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -1.0;
  mesh.update = t => mesh.material.uniforms.uTime.value = t;
  return mesh;
}
