import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3 } from 'three';
import { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';
import { CollisionWorld } from '../../collision/runtime/CollisionWorld';
import { ThirdPersonCameraController } from '../runtime/ThirdPersonCameraController';

for (const offset of [0, 0.4]) {
  const collisionCheck = offset === 0 ? 'ray' : 'sphere sweep';

  test(`ignores only the carried crate in the ${collisionCheck} and restores blocking when released`, () => {
    const crate = new OrientedBoxDto(new Vector3(offset, 1.35, 0.76), new Vector3(0.3, 0.25, 0.25));
    const world = new CollisionWorld(new Group(), [crate]);
    const camera = new PerspectiveCamera();
    const controller = new ThirdPersonCameraController(camera, world);
    const playerPosition = new Vector3(0, 1, 0);
    controller.rotate(0, -0.25);

    controller.update(playerPosition);
    assert.ok(camera.position.z < 0.76);

    controller.update(playerPosition, crate);
    assert.ok(Math.abs(camera.position.z - 3) < 0.001);

    controller.update(playerPosition);
    assert.ok(camera.position.z < 0.76);
    world.dispose();
  });

  for (const obstacleType of ['wall', 'another crate']) {
    test(`still detects ${obstacleType} with the ${collisionCheck} while carrying a crate`, () => {
      const carriedCrate = new OrientedBoxDto(new Vector3(0, 1.35, 0.76), new Vector3(0.3, 0.25, 0.25));
      const otherCrate = new OrientedBoxDto(new Vector3(offset, 1.35, 2), new Vector3(0.3, 0.25, 0.25));
      const environment = new Group();
      const wall = new Mesh(new BoxGeometry(0.6, 0.5, 0.5), new MeshBasicMaterial());
      wall.position.copy(otherCrate.center);
      if (obstacleType === 'wall') environment.add(wall);
      const boxes = obstacleType === 'wall' ? [carriedCrate] : [carriedCrate, otherCrate];
      const world = new CollisionWorld(environment, boxes);
      const camera = new PerspectiveCamera();
      const controller = new ThirdPersonCameraController(camera, world);
      controller.rotate(0, -0.25);

      controller.update(new Vector3(0, 1, 0), carriedCrate);

      assert.ok(camera.position.z > 1.5 && camera.position.z < 1.8);
      world.dispose();
      wall.geometry.dispose();
      wall.material.dispose();
    });
  }
}
