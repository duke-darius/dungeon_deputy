export const SCENES = [
  { id: 'ashen-road', title: 'The Ashen Road', description: 'A road winds beneath a smoke-darkened sky.', image: '/assets/scenes/ashen-road.svg' },
  { id: 'moonlit-fen', title: 'Moonlit Fen', description: 'Still water catches the light between reeds.', image: '/assets/scenes/moonlit-fen.svg' },
  { id: 'old-bridge', title: 'Old Bridge', description: 'A weathered crossing spans a deep ravine.', image: '/assets/scenes/old-bridge.svg' },
];

export function publicView(value) {
  return { mode: 'black', sceneId: null, title: null, description: null };
}

export function sceneById(id) {
  return SCENES.find((scene) => scene.id === id);
}
