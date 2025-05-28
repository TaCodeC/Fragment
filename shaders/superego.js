import * as THREE from 'three';

export function createSuperego(){
    const geometry = new THREE.SphereGeometry(4, 64, 64);
    const material = new THREE.ShaderMaterial({
        vertexShader: /* glsl */`
          uniform float uTime;
          varying vec3 vNormal;
          varying vec3 vPosition;
    
          void main() {
            vNormal = normal;
            vPosition = position;

    
            vec3 displacedPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
          }
        `,
        fragmentShader: /* glsl */`
          uniform float uTime;
          uniform float userDist;
          uniform vec3 uColor;
          varying vec3 vPosition;
          varying vec3 vNormal;

          // Golden gradient palette
          vec3 goldPalette(float t) {
              t = clamp(t, 0.0, 1.0);
              return mix(
                  mix(vec3(0.1*-userDist/4.0, .1*userDist/4.0 , 0.3*userDist/4.0), vec3(0.8, 0.5, 0.1), t),
                  vec3(1.0, 0.85, 0.4),
                  smoothstep(0.6, 1.0, t)
              );
          }

          // Iterative radial pattern
          float sacredPattern(vec2 uv, float t) {
              vec2 uv0 = uv;
              float acc = 0.0;

              for (float i = 0.0; i < 4.0; i++) {
                  uv = fract(uv * 1.5) - 0.5;
                  float d = length(uv) * exp(-length(uv0 * 2.5));
                  d = sin(d * (i + abs(cos(t)) - 3.0 - t * 0.5) + t) / 8.0;
                  d = smoothstep(0.01 / d, 1.5, d);
                  acc += d * (0.5 + 0.5 * cos(t * 1.5 + i));
              }

              return acc;
          }

          void main() {
              vec3 normal = normalize(vNormal);
              vec3 lightDir = normalize(vec3(0.0, 0.4, 1.0));
              float diff = dot(normal, lightDir);
              float fresnel = pow(1.0 - dot(normal, normalize(vPosition)), 3.0);

              // Spherical UVs from normal
              vec2 uv = vec2(atan(normal.z, normal.x), acos(normal.y));
              uv /= vec2(3.1416, 3.1416);
              uv = uv * 2.0 - 1.0;

              float adjustedTime = uTime * (0.5 + userDist / 3.5 * 0.55);
              float sacred = sacredPattern(uv, adjustedTime);

              vec3 baseColor = goldPalette(sacred);
              vec3 dynamicColor = mix(baseColor, vec3(1.0), fresnel);
              vec3 finalColor = dynamicColor * clamp(diff, 0.2, 1.0);

              float brightness = dot(finalColor, vec3(0.2126, 0.7152, 0.0722));
              float alpha = brightness > 0.95 ? 0.5 : 1.0;
              if (alpha < 1.0) finalColor = vec3(0.0);

              gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x66ccff) },
          userDist: { value: 0.5}
        },
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.shaderType = 'water';
      return mesh;
}