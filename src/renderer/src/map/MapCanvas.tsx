import 'pixi.js/unsafe-eval';
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import { useEffect, useRef } from 'react';
import tavernArt from '../../../../assets/maps/tavern.svg?url';
import heroArt from '../../../../assets/tokens/hero.svg?url';
import goblinArt from '../../../../assets/tokens/goblin.svg?url';
import type { MapToken } from './types';
import type { FogStamp, FogStroke } from './types';
import { screenToMap, zoomAt } from './camera.mjs';
import type { Camera } from './camera.mjs';
import { attachCanvas, registerPointerLifecycle } from './canvasPolicy.mjs';

export function MapCanvas({ image, gridVisible, scale, tokens, fogEnabled, fogStrokes, fogTool, brushSize, onStroke, onMove }: { image:string; gridVisible:boolean; scale:number; tokens:MapToken[]; fogEnabled:boolean; fogStrokes:FogStroke[]; fogTool:'reveal'|'hide'|null; brushSize:number; onStroke:(stamps:FogStamp[])=>void; onMove:(id:string,x:number,y:number)=>void }) {
  const host = useRef<HTMLDivElement>(null);
  const drawRef = useRef<() => Promise<void>>(async () => {});
  const latest = useRef({ image, gridVisible, scale, tokens, fogEnabled, fogStrokes, fogTool, brushSize, onStroke, onMove }); latest.current = { image, gridVisible, scale, tokens, fogEnabled, fogStrokes, fogTool, brushSize, onStroke, onMove };
  useEffect(() => {
    let cancelled = false; let app: Application | undefined; let lifecycleRef: {dispose:()=>void}|undefined; let detachPointers: (()=>void)|undefined; let detachWheel:(()=>void)|undefined;
    void (async () => {
      app = new Application();
      const lifecycle = attachCanvas(app, host.current!, async initialized => {
      const world = new Container(); initialized.stage.addChild(world);
       let camera: Camera = { x: 0, y: 0, zoom: 1 }, dragging: string | null = null, panning = false, painting = false, stamps: FogStamp[] = [], preview: Graphics | undefined, last = {x:0,y:0};
      const render = async () => {
        world.removeChildren().forEach(child => child.destroy({ children:true }));
        const state = latest.current;
        if (state.image) { const tex = await Assets.load(tavernArt); const art = new Sprite(tex); art.width=1200; art.height=760; world.addChild(art); }
         if (state.gridVisible) { const g = new Graphics(); for(let x=0;x<=1200;x+=state.scale) g.moveTo(x,0).lineTo(x,760); for(let y=0;y<=760;y+=state.scale) g.moveTo(0,y).lineTo(1200,y); g.stroke({color:0xf2e6cf,alpha:.26,width:1}); world.addChild(g); }
         if (state.fogEnabled) {
           const fog = new Graphics().rect(0,0,1200,760).fill({color:0x080a09,alpha:1});
           for (const stroke of state.fogStrokes) for (const point of stroke.stamps) fog.circle(point.x,point.y,point.radius).fill({color:stroke.mode === 'reveal' ? 0xffffff : 0x080a09,alpha:stroke.mode === 'reveal' ? .9 : 1});
           world.addChild(fog);
         }
        for (const token of state.tokens) { const texture=await Assets.load(token.artwork==='goblin.svg'?goblinArt:heroArt); const g = new Sprite(texture); g.anchor.set(.5); g.width=46;g.height=46;g.position.set(token.x,token.y);g.tint=token.color;g.eventMode='static';g.cursor='grab';g.on('pointerdown',e=>{dragging=token.id;panning=false;last={x:e.global.x,y:e.global.y};});world.addChild(g); }
        world.position.set(camera.x,camera.y); world.scale.set(camera.zoom);
      };
       drawRef.current = render;
       await render();
       if (cancelled) return;
         const finish=(e:{global:{x:number;y:number}})=>{if(painting){painting=false;if(stamps.length)latest.current.onStroke(stamps);stamps=[];}else if(dragging){const pos=screenToMap(e.global,camera);latest.current.onMove(dragging,pos.x,pos.y);dragging=null;}};
         detachPointers=registerPointerLifecycle(initialized.stage,finish,(e:{global:{x:number;y:number}})=>{ if(painting){const pos=screenToMap(e.global,camera);const prev=stamps.at(-1);if(!prev||Math.hypot(pos.x-prev.x,pos.y-prev.y)>=latest.current.brushSize*.2)stamps.push({x:pos.x,y:pos.y,radius:latest.current.brushSize/2});if(preview){preview.clear().circle(pos.x,pos.y,latest.current.brushSize/2).stroke({color:0xb58d51,width:2});} }else if(dragging){const pos=screenToMap(e.global,camera);const item=latest.current.tokens.find(t=>t.id===dragging);if(item){item.x=pos.x;item.y=pos.y;void render();}} else if(panning){camera={...camera,x:camera.x+e.global.x-last.x,y:camera.y+e.global.y-last.y};last={x:e.global.x,y:e.global.y};world.position.set(camera.x,camera.y);} },(e:{global:{x:number;y:number}})=>{if(latest.current.fogEnabled&&latest.current.fogTool){painting=true;panning=false;dragging=null;stamps=[];const pos=screenToMap(e.global,camera);stamps.push({x:pos.x,y:pos.y,radius:latest.current.brushSize/2});preview=new Graphics();world.addChild(preview);}else if(!dragging){panning=true;last={x:e.global.x,y:e.global.y};}},()=>{panning=false;if(painting){painting=false;stamps=[];preview?.destroy();preview=undefined;}});
       initialized.stage.eventMode='static'; initialized.stage.hitArea=initialized.screen;
        const wheel=(e:WheelEvent)=>{e.preventDefault();camera=zoomAt(camera,{x:e.offsetX,y:e.offsetY},e.deltaY<0?1.1:.9);world.position.set(camera.x,camera.y);world.scale.set(camera.zoom);};
       initialized.canvas.addEventListener('wheel',wheel,{passive:false}); detachWheel=()=>initialized.canvas.removeEventListener('wheel',wheel);
      });
      lifecycleRef=lifecycle;
      await lifecycle.ready;
      if(cancelled) return;
    })();
    return ()=>{cancelled=true;detachPointers?.();detachWheel?.();if(lifecycleRef) lifecycleRef.dispose(); else app?.destroy(true,{children:true});};
  }, []);
   useEffect(()=>{ void drawRef.current(); },[image,gridVisible,scale,tokens,fogEnabled,fogStrokes]);
  return <div className="map-canvas" ref={host} aria-label="Map canvas; drag to pan, scroll to zoom" role="application" />;
}
