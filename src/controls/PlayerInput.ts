export interface PlayerInputState {
  movementX: number;
  movementZ: number;
  lookX: number;
  lookY: number;
}

export interface PlayerInput {
  read(): PlayerInputState;
  dispose(): void;
}
