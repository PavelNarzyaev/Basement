import { BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector2, Vector3 } from 'three';
import type { IDustEffect } from '../contracts/IDustEffect';
import { DustSettingsDto } from '../contracts/DustSettingsDto';
import type { DustVolumeDto } from '../contracts/DustVolumeDto';
import { dustBrightness, dustColor, dustFadeStart, dustRadius } from '../contracts/dustAppearance';

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
    regionSize: { value: new Vector3() },
    dustRadius: { value: dustRadius },
    fadeStart: { value: dustFadeStart },
    dustColor: { value: new Color(dustColor).multiplyScalar(dustBrightness) },
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
      uniform vec3 regionSize;
      uniform float dustRadius;
      uniform float fadeStart;
      attribute vec3 variation;
      varying float visibility;

      void main() {
        float phase = variation.x * 6.283185;
        vec3 swirl = vec3(
          sin(elapsedTime * 0.43 + phase),
          sin(elapsedTime * 0.31 + phase * 2.0),
          cos(elapsedTime * 0.37 + phase)
        ) * turbulence;
        vec3 offset = vec3(drift, -elapsedTime * 0.008, drift * 0.37) + swirl;
        vec3 regionMin = clamp(cameraPosition - regionSize * 0.5,
          volumeMin, volumeMin + volumeSize - regionSize);
        // Subtract the moving origin before wrapping to keep surviving particles anchored in the world.
        vec3 localPosition = mod(position + offset - regionMin, regionSize);
        vec3 worldPosition = regionMin + localPosition;
        vec4 viewPosition = viewMatrix * vec4(worldPosition, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(variation.y * viewportHeight * projectionMatrix[1][1]
          / max(-viewPosition.z, 0.1), 1.0, 24.0);

        vec3 edge = min(localPosition, regionSize - localPosition);
        float edgeFade = smoothstep(0.0, 0.35, min(edge.x, min(edge.y, edge.z)));
        float nearFade = smoothstep(0.2, 0.8, -viewPosition.z);
        float distanceFade = 1.0 - smoothstep(fadeStart, dustRadius, distance(worldPosition, cameraPosition));
        visibility = edgeFade * nearFade * distanceFade * smoothstep(variation.z, variation.z + 0.04, density);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float opacity;
      uniform vec3 dustColor;
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
    const regionSize = this.uniforms.regionSize.value.copy(size).min(new Vector3().setScalar(dustRadius * 2));

    // Reserve room for denser bombardment dust without reallocating GPU buffers.
    const count = Math.ceil(regionSize.x * regionSize.y * regionSize.z * 6);
    const positions = new Float32Array(count * 3);
    const variations = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      positions.set([Math.random() * regionSize.x, Math.random() * regionSize.y, Math.random() * regionSize.z], index * 3);
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
