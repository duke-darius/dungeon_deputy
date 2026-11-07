import React, { useEffect, useState } from 'react';
import { getPresentation } from './api';
import { publicView, sceneById } from './contracts.mjs';
import type { PublicPresentation } from './contracts.mjs';
import heroArt from '../../../assets/tokens/hero.svg?url';
import goblinArt from '../../../assets/tokens/goblin.svg?url';
import ashenRoadArt from '../../../assets/scenes/ashen-road.svg?url';
import moonlitFenArt from '../../../assets/scenes/moonlit-fen.svg?url';
import oldBridgeArt from '../../../assets/scenes/old-bridge.svg?url';

const black: PublicPresentation = { mode: 'black', sceneId: null, title: null, description: null };

export default function PublicDisplay() {
  const [presentation, setPresentation] = useState<PublicPresentation>(black);
  useEffect(() => {
    let alive = true;
    const unsubscribe = window.dungeonDeputy.onPresentationUpdated(value => { if (alive) setPresentation(publicView(value)); });
    void getPresentation().then(value => { if (alive) setPresentation(publicView(value)); }).catch(() => { if (alive) setPresentation(black); });
    void window.dungeonDeputy.connectRealtime().catch(() => {});
    return () => { alive = false; unsubscribe(); };
  }, []);

  const scene = presentation.mode === 'scene' ? sceneById(presentation.sceneId) : undefined;
  const sceneArt = scene ? { 'ashen-road': ashenRoadArt, 'moonlit-fen': moonlitFenArt, 'old-bridge': oldBridgeArt }[scene.id] : undefined;
  const map = presentation.mode === 'map' ? presentation : undefined;
  return <main className="public-stage" aria-label="Player scene display">
    {scene && <img className="public-art" src={sceneArt} alt="" />}
    {map && <div className="public-map">
      <img className="public-map-art" src={map.imageData} alt="" />
      <div className="public-map-tokens">{map.tokens?.map(token=><img key={token.id} className="public-map-token" src={token.artwork==='goblin.svg'?goblinArt:heroArt} alt="" style={{left:`${token.x/12}%`,top:`${token.y/7.6}%`} as React.CSSProperties}/>)}</div>
    </div>}
  </main>;
}
