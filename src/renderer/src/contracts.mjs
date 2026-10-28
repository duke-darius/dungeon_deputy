export const SCENES = [
  { id: 'ashen-road', title: 'The Ashen Road', description: 'A road winds beneath a smoke-darkened sky.', image: '/scenes/ashen-road.svg' },
  { id: 'moonlit-fen', title: 'Moonlit Fen', description: 'Still water catches the light between reeds.', image: '/scenes/moonlit-fen.svg' },
  { id: 'old-bridge', title: 'Old Bridge', description: 'A weathered crossing spans a deep ravine.', image: '/scenes/old-bridge.svg' },
];

export function publicView(value) {
  if (!value || value.mode !== 'scene' || !sceneById(value.sceneId) || typeof value.title !== 'string' || typeof value.description !== 'string') {
    return { mode: 'black', sceneId: null, title: null, description: null };
  }
  return { mode: 'scene', sceneId: value.sceneId, title: value.title, description: value.description };
}

export function sceneById(id) {
  return SCENES.find((scene) => scene.id === id);
}
