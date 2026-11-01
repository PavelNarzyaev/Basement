import { BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector2, Vector3 } from 'three';
import type { IDustEffect } from '../contracts/IDustEffect';
import { DustSettingsDto } from '../contracts/DustSettingsDto';
import type { DustVolumeDto } from '../contracts/DustVolumeDto';

export class DustEffect implements IDustEffect {
  private settings = new DustSettingsDto();
  private readonly geometry = new BufferGeometry();
  private readonly uniforms = {
    elapsedTime: { value: 0 },
    drift: { value: 0 },
    density: { value: this.settings.density },
    opacity: { value: this.settings.opacity },
    turbulence: { value: this.settings.turbulence },
    viewportHeight: { value: 1 },
    volumeMin: { value: new Vector3() },
    volumeSize: { value: new Vector3() },
    lampPositions: { value: [] as Vector3[] },
    lampColor: { value: new Color() },
    lampIntensity: { value: 0 },
  };
  private readonly material = new ShaderMaterial({
    uniforms: this.uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float elapsedTime;
      uniform float drift;
      uniform float density;
      uniform float turbulence;
      uniform float viewportHeight;
      uniform vec3 volumeMin;
      uniform vec3 volumeSize;
      #if LAMP_COUNT > 0
        uniform vec3 lampPositions[LAMP_COUNT];
      #endif
      uniform vec3 lampColor;
      uniform float lampIntensity;
      attribute vec3 variation;
      varying vec3 dustColor;
      varying float visibility;

      void main() {
        float phase = variation.x * 6.283185;
        vec3 swirl = vec3(
          sin(elapsedTime * 0.43 + phase),
          sin(elapsedTime * 0.31 + phase * 2.0),
          cos(elapsedTime * 0.37 + phase)
        ) * turbulence;
        vec3 offset = vec3(drift, -elapsedTime * 0.008, drift * 0.37) + swirl;
        vec3 localPosition = mod(position + offset, volumeSize);
        vec3 worldPosition = volumeMin + localPosition;
        vec4 viewPosition = viewMatrix * vec4(worldPosition, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(variation.y * viewportHeight * projectionMatrix[1][1]
          / max(-viewPosition.z, 0.1), 1.0, 24.0);

        vec3 edge = min(localPosition, volumeSize - localPosition);
        float edgeFade = smoothstep(0.0, 0.35, min(edge.x, min(edge.y, edge.z)));
        float nearFade = smoothstep(0.2, 0.8, -viewPosition.z);
        visibility = edgeFade * nearFade * smoothstep(variation.z, variation.z + 0.04, density);
        float illumination = 0.035;
        #if LAMP_COUNT > 0
          for (int i = 0; i < LAMP_COUNT; i++) {
            vec3 lightOffset = lampPositions[i] - worldPosition;
            illumination += lampIntensity / max(dot(lightOffset, lightOffset), 0.5);
          }
        #endif
        dustColor = lampColor * min(illumination, 1.5);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float opacity;
      varying vec3 dustColor;
      varying float visibility;

      void main() {
        float radius = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = (1.0 - smoothstep(0.0, 1.0, radius)) * opacity * visibility;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(dustColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  readonly object = new Points(this.geometry, this.material);
  private readonly viewportSize = new Vector2();
  private driftSpeed = this.settings.driftSpeed;

  constructor() {
    this.object.name = 'AirborneDust';
    // Positions are wrapped on the GPU; the CPU position attribute is not the rendered bounds.
    this.object.frustumCulled = false;
    this.object.onBeforeRender = (renderer) => {
      renderer.getDrawingBufferSize(this.viewportSize);
      this.uniforms.viewportHeight.value = this.viewportSize.y;
    };
  }

  initialize(volume: DustVolumeDto): void {
    const size = volume.bounds.getSize(this.uniforms.volumeSize.value);
    this.uniforms.volumeMin.value.copy(volume.bounds.min);
    this.uniforms.lampPositions.value = volume.lampPositions.map((position) => position.clone());
    this.uniforms.lampColor.value.copy(volume.lampColor);
    this.uniforms.lampIntensity.value = volume.lampIntensity;
    this.material.defines.LAMP_COUNT = volume.lampPositions.length;
    this.material.needsUpdate = true;

    // Reserve room for denser bombardment dust without reallocating GPU buffers.
    const count = Math.min(24000, Math.ceil(size.x * size.y * size.z * 6));
    const positions = new Float32Array(count * 3);
    const variations = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      positions.set([Math.random() * size.x, Math.random() * size.y, Math.random() * size.z], index * 3);
      variations.set([Math.random(), 0.005 + Math.random() * 0.009, Math.random() * 0.96], index * 3);
    }
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.setAttribute('variation', new BufferAttribute(variations, 3));
  }

  setSettings(settings: DustSettingsDto): void {
    this.settings = settings;
  }

  update(delta: number): void {
    // Discard time spent in a background tab so returning does not jump the simulation.
    const step = Math.min(delta, 0.1);
    const blend = 1 - Math.exp(-step * 2);
    this.uniforms.density.value += (this.settings.density - this.uniforms.density.value) * blend;
    this.uniforms.opacity.value += (this.settings.opacity - this.uniforms.opacity.value) * blend;
    this.uniforms.turbulence.value += (this.settings.turbulence - this.uniforms.turbulence.value) * blend;
    this.driftSpeed += (this.settings.driftSpeed - this.driftSpeed) * blend;
    this.uniforms.elapsedTime.value += step;
    this.uniforms.drift.value += this.driftSpeed * step;
  }

  dispose(): void {
    this.object.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
