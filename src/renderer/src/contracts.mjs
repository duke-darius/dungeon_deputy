export const SCENES = [
  { id: 'ashen-road', title: 'The Ashen Road', description: 'A road winds beneath a smoke-darkened sky.', image: '/scenes/ashen-road.svg' },
  { id: 'moonlit-fen', title: 'Moonlit Fen', description: 'Still water catches the light between reeds.', image: '/scenes/moonlit-fen.svg' },
  { id: 'old-bridge', title: 'Old Bridge', description: 'A weathered crossing spans a deep ravine.', image: '/scenes/old-bridge.svg' },
];

const black = { mode: 'black', sceneId: null, title: null, description: null };
const tokenOk = token => token && typeof token.id === 'string' && token.id.length <= 80 && typeof token.name === 'string' && token.name.length <= 60 && ['hero','monster'].includes(token.kind) && /^#[0-9a-fA-F]{6}$/.test(token.color) && Number.isFinite(token.x) && Number.isFinite(token.y) && ['hero.svg','goblin.svg'].includes(token.artwork) && token.visible !== false;
const fogOk = strokes => Array.isArray(strokes) && strokes.length <= 2000 && strokes.every(stroke => stroke && ['reveal','hide'].includes(stroke.mode) && Array.isArray(stroke.stamps) && stroke.stamps.length <= 500 && stroke.stamps.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.radius) && point.radius >= 1 && point.radius <= 5000));

export function publicView(value) {
  if (value?.mode === 'black') return black;
  if (value?.mode === 'map' && typeof value.id === 'string' && value.id.length <= 80 && ['tavern.svg',''].includes(value.image) && typeof value.gridVisible === 'boolean' && Number.isFinite(value.scale) && value.scale >= 8 && value.scale <= 256 && Array.isArray(value.tokens) && value.tokens.length <= 100 && value.tokens.every(tokenOk) && (value.revealedTerrain === undefined || value.revealedTerrain === null || fogOk(value.revealedTerrain))) {
    return { mode:'map', id:value.id, image:value.image, gridVisible:value.gridVisible, scale:value.scale, ...(value.revealedTerrain == null ? {} : { revealedTerrain: value.revealedTerrain.map(({mode,stamps})=>({mode,stamps:stamps.map(({x,y,radius})=>({x,y,radius}))})) }), tokens:value.tokens.map(({id,name,kind,color,x,y,artwork})=>({id,name,kind,color,x,y,artwork})) };
  }
  if (!value || value.mode !== 'scene' || !sceneById(value.sceneId) || typeof value.title !== 'string' || typeof value.description !== 'string') {
    return black;
  }
  return { mode: 'scene', sceneId: value.sceneId, title: value.title, description: value.description };
}

export function sceneById(id) {
  return SCENES.find((scene) => scene.id === id);
}
