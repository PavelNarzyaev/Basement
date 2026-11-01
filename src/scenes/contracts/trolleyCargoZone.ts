import { Vector3 } from 'three';
import { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';

// The deck surface is at 1.157307; the zone extends two units above it.
export const trolleyCargoZone = new OrientedBoxDto(
  new Vector3(-0.38983, 2.157307, -19.88941), new Vector3(1.62, 1, 1.02), 0.3104,
);
