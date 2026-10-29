import {
  BoxGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  Scene,
} from 'three';

export function createDemoScene() {
  const scene = new Scene();
  scene.background = new Color('#151a24');

  const geometry = new BoxGeometry();
  const material = new MeshStandardMaterial({
    color: '#d79456',
    roughness: 0.45,
    metalness: 0.1,
  });
  const cube = new Mesh(geometry, material);

  const hemisphereLight = new HemisphereLight('#dceaff', '#423024', 2);
  const keyLight = new DirectionalLight('#fff1db', 3);
  keyLight.position.set(3, 4, 5);
  scene.add(cube, hemisphereLight, keyLight);

  return {
    scene,
    update(deltaSeconds: number) {
      cube.rotation.y += deltaSeconds * 0.6;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      scene.clear();
    },
  };
}
