import React, { useEffect, useState } from 'react';
import { getPresentation } from './api';
import { publicView, sceneById } from './contracts.mjs';
import type { PublicPresentation } from './contracts.mjs';

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
  return <main className="public-stage" aria-label="Player scene display">
    {scene && <img className="public-art" src={scene.image} alt="" />}
  </main>;
}
