export function attachCanvas(app, host, onReady) {
  let disposed = false;
  let destroyed = false;
  let initialized = false;
  let setupFinished = false;
  const destroy = () => {
    if (!destroyed && initialized && setupFinished) {
      destroyed = true;
      app.destroy(true, { children: true });
    }
  };
  const ready = (async () => {
    try {
      await app.init({ resizeTo: host, background: '#171b1a', antialias: true });
      initialized = true;
      if (disposed || !host) { setupFinished = true; destroy(); return false; }
      host.appendChild(app.canvas);
      await onReady(app);
      setupFinished = true;
      if (disposed) { destroy(); return false; }
      return true;
    } catch (error) {
      setupFinished = true;
      destroy();
      throw error;
    }
  })();
  return { ready, dispose() { disposed = true; destroy(); } };
}

export function registerPointerLifecycle(stage, finishDrag, move, panStart, panEnd) {
  const end = event => { finishDrag(event); panEnd(); };
  const cancel = () => panEnd();
  stage.on('pointerup', end);
  stage.on('pointerupoutside', end);
  stage.on('pointercancel', cancel);
  stage.on('globalpointermove', move);
  stage.on('pointerdown', panStart);
  return () => {
    stage.off('pointerup', end);
    stage.off('pointerupoutside', end);
    stage.off('pointercancel', cancel);
    stage.off('globalpointermove', move);
    stage.off('pointerdown', panStart);
  };
}
