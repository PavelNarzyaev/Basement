import type { Vector3 } from 'three';

export class PlayerSpawnDto {
  constructor(
    /** World position of the feet, independent of the character's height. */
    readonly position: Vector3,
    /** Rotation around the Y axis in radians; zero faces +Z. */
    readonly rotationY: number,
  ) {}
}
