import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import { useEffect, useRef } from 'react';
import tavernArt from '../../../../assets/maps/tavern.svg?url';
import type { MapToken } from './types';
import { screenToMap, zoomAt } from './camera.mjs';
import type { Camera } from './camera.mjs';

export function MapCanvas({ image, gridVisible, scale, tokens, onMove }: { image:string; gridVisible:boolean; scale:number; tokens:MapToken[]; onMove:(id:string,x:number,y:number)=>void }) {
  const host = useRef<HTMLDivElement>(null);
  const drawRef = useRef<() => Promise<void>>(async () => {});
  const latest = useRef({ image, gridVisible, scale, tokens, onMove }); latest.current = { image, gridVisible, scale, tokens, onMove };
  useEffect(() => {
    let cancelled = false; let app: Application | undefined;
    void (async () => {
      app = new Application(); await app.init({ resizeTo: host.current!, background: '#171b1a', antialias: true });
      if (cancelled || !host.current) { app.destroy(true); return; }
      host.current.appendChild(app.canvas);
      const world = new Container(); app.stage.addChild(world);
      let camera: Camera = { x: 0, y: 0, zoom: 1 }, dragging: string | null = null, panning = false, last = {x:0,y:0};
      const render = async () => {
        world.removeChildren().forEach(child => child.destroy({ children:true }));
        const state = latest.current;
        if (state.image) { const tex = await Assets.load(tavernArt); const art = new Sprite(tex); art.width=1200; art.height=760; world.addChild(art); }
        if (state.gridVisible) { const g = new Graphics(); for(let x=0;x<=1200;x+=state.scale) g.moveTo(x,0).lineTo(x,760); for(let y=0;y<=760;y+=state.scale) g.moveTo(0,y).lineTo(1200,y); g.stroke({color:0xf2e6cf,alpha:.26,width:1}); world.addChild(g); }
        for (const token of state.tokens) { const g = new Graphics().circle(token.X,token.Y,20).fill(token.Color).circle(token.X,token.Y,20).stroke({color:0xe7d9bd,width:2}); g.eventMode='static'; g.cursor='grab'; g.on('pointerdown', e=>{ dragging=token.Id; panning=false; last={x:e.global.x,y:e.global.y}; }); world.addChild(g); }
        world.position.set(camera.x,camera.y); world.scale.set(camera.zoom);
      };
      drawRef.current = render;
      await render();
      app.stage.eventMode='static'; app.stage.hitArea=app.screen;
      app.stage.on('pointerdown', e=>{ if(!dragging){panning=true;last={x:e.global.x,y:e.global.y};} });
      app.stage.on('pointerup', e=>{ if(dragging){const pos=screenToMap(e.global,camera);latest.current.onMove(dragging,pos.x,pos.y);dragging=null;} panning=false; });
      app.stage.on('pointerupoutside',()=>{dragging=null;panning=false;});
      app.stage.on('pointermove',e=>{ if(dragging){const pos=screenToMap(e.global,camera);const item=latest.current.tokens.find(t=>t.Id===dragging);if(item){item.X=pos.x;item.Y=pos.y;void render();}} else if(panning){camera={...camera,x:camera.x+e.global.x-last.x,y:camera.y+e.global.y-last.y};last={x:e.global.x,y:e.global.y};world.position.set(camera.x,camera.y);} });
      app.canvas.addEventListener('wheel', e=>{ e.preventDefault(); camera=zoomAt(camera,{x:e.offsetX,y:e.offsetY},e.deltaY<0?1.1:.9);world.position.set(camera.x,camera.y);world.scale.set(camera.zoom); },{passive:false});
    })();
    return ()=>{cancelled=true;app?.destroy(true,{children:true});};
  }, []);
  useEffect(()=>{ void drawRef.current(); },[image,gridVisible,scale,tokens]);
  return <div className="map-canvas" ref={host} aria-label="Map canvas; drag to pan, scroll to zoom" role="application" />;
}
