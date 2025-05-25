import * as THREE from 'three';

export function createFloor() {
  const geo = new THREE.PlaneGeometry(100, 100, 128, 128);

  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec3 vWorldPosition;

      float oceanWave(vec2 pos, float time) {
        float d = length(pos);
        float w1 = sin(d * 0.2 - time * 1.0) * 0.8;
        float w2 = sin(d * 0.5 - time * 0.7) * 0.4;
        float w3 = sin(d * 1.0 - time * 0.4) * 0.4;
        return w1 + w2 + w3;
      }

      void main() {
        vec3 pos = position;
        pos.z += oceanWave(position.xz, uTime);
        pos.x += oceanWave(position.xy, uTime);
        pos.y += oceanWave(position.xz, uTime);
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPos.xyz;

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uEgoPos;    
      uniform vec3 uEgoColor;   
      uniform float uEgoRadius; 
      varying vec3 vWorldPosition;

      float oceanWave(vec2 pos, float time) {
        float d = length(pos);
        return sin(d * 0.2 - time * 1.0) * 0.8
             + sin(d * 0.5 - time * 0.7) * 0.4
             + sin(d * 1.0 - time * 0.4) * 0.2;
      }

      void main() {
        float dist = length(vWorldPosition.xz);

        // Base radial gradient: deep blue at center, black at edges
        vec3 centerColor = vec3(0.0, 0.4, 0.6);
        vec3 edgeColor   = vec3(0.0);
        float fadeBase = smoothstep(0.0, 50.0, dist);
        vec3 color = mix(centerColor, edgeColor, fadeBase);

        //  Foam on wave crests
        float fadeFoam = smoothstep(20.0, 5.0, dist);
        float waveVal   = oceanWave(vWorldPosition.xz, uTime);
        float crestFoam = smoothstep(0.5, 0.7, waveVal) * fadeFoam * 0.8;
        color = mix(color, vec3(1.0), crestFoam);

        //  Pressure rings
        float ringSpeed   = 3.0;
        float ringSpacing = .8;
        float m = mod(dist - uTime * ringSpeed, ringSpacing);
        float ringRaw = smoothstep(0.05, 0.0, abs(m - ringSpacing * 0.5));
        float fadeRing = smoothstep(10.0, 1.0, dist);
        color += ringRaw * fadeRing * 0.6;

        // Ego imprint: color + glow around ego position
        float dE = length(vWorldPosition.xz - uEgoPos.xz);
        float egoFade = smoothstep(uEgoRadius, 0.0, dE);
        // Blend floor color toward ego color
        color = mix(color, uEgoColor, egoFade);
        // Add a soft glow emission
        color += uEgoColor * egoFade * 0.5;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    uniforms: {
      uTime:      { value: 0 },
      uEgoPos:    { value: new THREE.Vector3(0, 0, 0) },
      uEgoColor:  { value: new THREE.Color(0x66ccff) },
      uEgoRadius: { value: 10.0 }
    },
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -1.0;
  mesh.update = t => mesh.material.uniforms.uTime.value = t;
  return mesh;
}
