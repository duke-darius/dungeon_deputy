import React, { useEffect, useState } from 'react';
import { getPresentation } from './api';
import { publicView, sceneById } from './contracts.mjs';
import type { PublicPresentation } from './contracts.mjs';
import tavernArt from '../../../assets/maps/tavern.svg?url';
import heroArt from '../../../assets/tokens/hero.svg?url';
import goblinArt from '../../../assets/tokens/goblin.svg?url';

const black: PublicPresentation = { mode: 'black', sceneId: null, title: null, description: null };

export default function PublicDisplay() {
  const [presentation, setPresentation] = useState<PublicPresentation>(black);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try { const value = publicView(await getPresentation()); if (alive) setPresentation(value); }
      catch { if (alive) setPresentation(black); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  const scene = presentation.mode === 'scene' ? sceneById(presentation.sceneId) : undefined;
  const map = presentation.mode === 'map' ? presentation : undefined;
  const image = map?.image === 'tavern.svg' ? tavernArt : undefined;
  return <main className="public-stage" aria-label="Player scene display">
    {scene && <img className="public-art" src={scene.image} alt="" />}
    {map && <div className="public-map" style={{'--map-scale':`${map.scale}px`} as React.CSSProperties}>
      {image && <img className="public-map-art" src={image} alt="" />}
      {map.gridVisible && <div className="public-map-grid" />}
      <div className="public-map-tokens">{map.tokens?.map(token=><img key={token.id} className="public-map-token" src={token.artwork==='goblin.svg'?goblinArt:heroArt} alt="" style={{left:`${token.x/12}%`,top:`${token.y/7.6}%`} as React.CSSProperties}/>)}</div>
    </div>}
  </main>;
}
