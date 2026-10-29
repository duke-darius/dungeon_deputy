export const SCENES = [
  { id: 'ashen-road', title: 'The Ashen Road', description: 'A road winds beneath a smoke-darkened sky.', image: '/scenes/ashen-road.svg' },
  { id: 'moonlit-fen', title: 'Moonlit Fen', description: 'Still water catches the light between reeds.', image: '/scenes/moonlit-fen.svg' },
  { id: 'old-bridge', title: 'Old Bridge', description: 'A weathered crossing spans a deep ravine.', image: '/scenes/old-bridge.svg' },
];

const black = { mode: 'black', sceneId: null, title: null, description: null };
const tokenKeys = ['id','name','kind','color','x','y','artwork'];
const tokenOk = token => token && Object.keys(token).sort().join(',') === [...tokenKeys].sort().join(',') && typeof token.id === 'string' && token.id.length <= 80 && typeof token.name === 'string' && token.name.length <= 60 && ['hero','monster'].includes(token.kind) && /^#[0-9a-fA-F]{6}$/.test(token.color) && Number.isFinite(token.x) && Number.isFinite(token.y) && ['hero.svg','goblin.svg'].includes(token.artwork);

export function publicView(value) {
  if (value?.mode === 'black') return black;
  if (value?.mode === 'map' && typeof value.id === 'string' && value.id.length <= 80 && typeof value.imageData === 'string' && value.imageData.startsWith('data:image/png;base64,') && value.imageData.length <= 5_600_000 && Array.isArray(value.tokens) && value.tokens.length <= 100 && value.tokens.every(tokenOk)) {
    return { mode:'map', id:value.id, imageData:value.imageData, tokens:value.tokens.map(({id,name,kind,color,x,y,artwork})=>({id,name,kind,color,x,y,artwork})) };
  }
  if (!value || value.mode !== 'scene' || !sceneById(value.sceneId) || typeof value.title !== 'string' || typeof value.description !== 'string') {
    return black;
  }
  return { mode: 'scene', sceneId: value.sceneId, title: value.title, description: value.description };
}

export function sceneById(id) {
  return SCENES.find((scene) => scene.id === id);
}
