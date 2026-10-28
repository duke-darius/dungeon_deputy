export function attachCanvas(app, host, onReady) {
  let disposed = false;
  let destroyed = false;
  const destroy = () => { if (!destroyed) { destroyed = true; app.destroy(true, { children: true }); } };
  const ready = (async () => {
    await app.init({ resizeTo: host, background: '#171b1a', antialias: true });
    if (disposed || !host) { destroy(); return false; }
    host.appendChild(app.canvas);
    await onReady(app);
    return true;
  })();
  return { ready, dispose() { disposed = true; destroy(); } };
}

export function registerPointerLifecycle(stage, finishDrag, move, panStart, panEnd) {
  const end = event => { finishDrag(event); panEnd(); };
  stage.on('pointerup', end);
  stage.on('pointerupoutside', end);
  stage.on('globalpointermove', move);
  stage.on('pointerdown', panStart);
  return () => {
    stage.off('pointerup', end);
    stage.off('pointerupoutside', end);
    stage.off('globalpointermove', move);
    stage.off('pointerdown', panStart);
  };
}
