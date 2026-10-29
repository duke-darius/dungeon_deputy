import React, { useEffect, useRef, useState } from 'react';
import { getPresentation } from './api';
import { publicView, sceneById } from './contracts.mjs';
import type { PublicPresentation } from './contracts.mjs';
import tavernArt from '../../../assets/maps/tavern.svg?url';
import heroArt from '../../../assets/tokens/hero.svg?url';
import goblinArt from '../../../assets/tokens/goblin.svg?url';
import { rasterizeFogMask } from './map/fogMask.mjs';

const black: PublicPresentation = { mode: 'black', sceneId: null, title: null, description: null };

export default function PublicDisplay() {
  const [presentation, setPresentation] = useState<PublicPresentation>(black);
  const maskCanvas = useRef<HTMLCanvasElement>(null);
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
  useEffect(() => {
    const canvas=maskCanvas.current; if(!canvas || !map || map.revealedTerrain === undefined) return;
    canvas.width=1200; canvas.height=760;
    const context=canvas.getContext('2d'); if(!context)return;
    const pixels=rasterizeFogMask(1200,760,map.revealedTerrain);
    const imageData=context.createImageData(1200,760); imageData.data.set(pixels); context.putImageData(imageData,0,0);
  },[map]);
  return <main className="public-stage" aria-label="Player scene display">
    {scene && <img className="public-art" src={scene.image} alt="" />}
    {map && <div className="public-map" style={{'--map-scale':`${map.scale}px`} as React.CSSProperties}>
      {image && <img className="public-map-art" src={image} alt="" />}
      {map.revealedTerrain !== undefined && <canvas ref={maskCanvas} className="public-map-fog-mask" aria-hidden="true" />}
      {map.gridVisible && <div className="public-map-grid" />}
      <div className="public-map-tokens">{map.tokens?.map(token=><img key={token.id} className="public-map-token" src={token.artwork==='goblin.svg'?goblinArt:heroArt} alt="" style={{left:`${token.x/12}%`,top:`${token.y/7.6}%`} as React.CSSProperties}/>)}</div>
    </div>}
  </main>;
}
