// flameShader.js

import * as THREE from 'three';

export const FlameShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uColor: { value: new THREE.Color(0xff5500) }
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.x += sin(uv.y * 10.0 + uTime * 5.0) * 0.02;
      pos.y += sin(uv.x * 20.0 + uTime * 3.0) * 0.01;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      float alpha = 1.0 - vUv.y;
      alpha *= smoothstep(0.0, 0.3, vUv.y);
      alpha *= 1.0 - smoothstep(0.8, 1.0, vUv.y);
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});