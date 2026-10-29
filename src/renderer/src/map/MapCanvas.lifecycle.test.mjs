import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { attachCanvas, registerPointerLifecycle, createRedrawGeneration } from './canvasPolicy.mjs';
import { mapToScreen, screenToMap } from './camera.mjs';

test('late async initialization after unmount destroys without attaching stale canvas', async () => {
  let release; let destroyed=0; const host={appendChild(){throw Error('stale append');}};
  const app={canvas:{},init:()=>new Promise(resolve=>release=resolve),destroy:()=>destroyed++};
  const lifecycle=attachCanvas(app,host,()=>{}); lifecycle.dispose(); release();
  assert.equal(await lifecycle.ready,false); assert.equal(destroyed,1);
});

test('dispose during asynchronous canvas setup waits until Pixi initialization finishes', async () => {
  let finishSetup; let destroyed=0;
  const app={canvas:{},init:async()=>{},destroy:()=>{destroyed++;}};
  const lifecycle=attachCanvas(app,{appendChild(){}},()=>new Promise(resolve=>{finishSetup=resolve;}));
  while(!finishSetup) await new Promise(resolve=>setImmediate(resolve));
  lifecycle.dispose();
  assert.equal(destroyed,0);
  finishSetup();
  assert.equal(await lifecycle.ready,false);
  assert.equal(destroyed,1);
});

test('pointerupoutside commits final map-space position and all registrations clean up', () => {
  const handlers=new Map(); const stage={on:(name,fn)=>handlers.set(name,fn),off:(name)=>handlers.delete(name)};
  let final,ended=0; const detach=registerPointerLifecycle(stage,e=>final=e.global,()=>{},()=>{},()=>ended++);
  handlers.get('pointerupoutside')({global:{x:325,y:241}});
  assert.deepEqual(final,{x:325,y:241}); assert.equal(ended,1);
  detach(); assert.equal(handlers.size,0);
});

test('pointercancel clears active gesture state and unregisters its handler', () => {
  const handlers=new Map(); const stage={on:(name,fn)=>handlers.set(name,fn),off:(name)=>handlers.delete(name)};
  let painting=true,pan=false; const detach=registerPointerLifecycle(stage,()=>{},()=>{},()=>{},()=>{painting=false;pan=false;});
  handlers.get('pointercancel')(); assert.equal(painting,false); assert.equal(pan,false);
  detach(); assert.equal(handlers.size,0);
});

test('redraw implementation rejects stale async work before scene mutation', async () => {
  const generation = createRedrawGeneration(); const scene = [];
  const redraw = async wait => { const current=generation.begin(); await wait; if (!generation.isCurrent(current)) return; scene.push(current); };
  let finish; const old=redraw(new Promise(resolve=>{finish=resolve;}));
  await redraw(Promise.resolve()); finish(); await old;
  assert.deepEqual(scene,[2]);
});

test('pointercancel invokes cancellation cleanup without committing the preview', () => {
  const handlers = new Map(); const stage = {on:(name,fn)=>handlers.set(name,fn),off:name=>handlers.delete(name)};
  let preview={destroyed:false,destroy(){this.destroyed=true;}}; let painting=true; let submitted=0;
  const cancel=()=>{painting=false;preview?.destroy();preview=undefined;};
  registerPointerLifecycle(stage,()=>submitted++,()=>{},()=>{},()=>{},cancel);
  handlers.get('pointercancel')();
  assert.equal(painting,false); assert.equal(preview,undefined); assert.equal(submitted,0);
});

test('brush mode and save rejection paths clear painting without publishing a stroke', async () => {
  const source=await readFile(new URL('./MapCanvas.tsx',import.meta.url),'utf8');
  assert.match(source,/state\.fogTool === null \|\| !state\.fogEnabled/);
  assert.match(source,/const cancelGesture=\(\)=>\{panning=false;dragging=null;painting=false;stamps=\[\];preview\?\.destroy\(\);preview=undefined;\}/);
  assert.match(source,/latest\.current\.onStroke\(stamps\)/);
  assert.doesNotMatch(source,/setFogStrokes\(stamps\)/);
});

test('remount leaves exactly one canvas and each mounted listener set is removed', async () => {
  let count=0; const host={appendChild(){count++;}};
  const makeApp=()=>({canvas:{},init:async()=>{},destroy(){count--;}});
  const first=attachCanvas(makeApp(),host,()=>{}); assert.equal(await first.ready,true);
  first.dispose();
  const second=attachCanvas(makeApp(),host,()=>{}); assert.equal(await second.ready,true);
  assert.equal(count,1); second.dispose(); assert.equal(count,0);
  const handlers=new Map();const stage={on:(k,v)=>handlers.set(k,v),off:k=>handlers.delete(k)};
  const detach=registerPointerLifecycle(stage,()=>{},()=>{},()=>{},()=>{});assert.equal(handlers.size,5);detach();assert.equal(handlers.size,0);
});

test('map coordinate conversion round-trips under pan and zoom', () => {
  const camera={x:83,y:-27,zoom:1.75}, point={x:240,y:610};
  const back=screenToMap(mapToScreen(point,camera),camera);
  assert.ok(Math.abs(back.x-point.x)<1e-9); assert.ok(Math.abs(back.y-point.y)<1e-9);
});

test('Pixi CSP polyfill loads before renderer initialization without loosening CSP', async () => {
  const canvas = await readFile(new URL('./MapCanvas.tsx', import.meta.url), 'utf8');
  const managerHtml = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const publicHtml = await readFile(new URL('../../public.html', import.meta.url), 'utf8');
  assert.match(canvas, /^import 'pixi\.js\/unsafe-eval';/);
  assert.match(managerHtml, /connect-src 'self' data:/);
  assert.doesNotMatch(managerHtml, /frame-ancestors|unsafe-eval/);
  assert.doesNotMatch(publicHtml, /frame-ancestors|unsafe-eval/);
});
