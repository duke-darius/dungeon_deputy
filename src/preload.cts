import { contextBridge, ipcRenderer } from 'electron';

const publicWindow = process.argv.some(arg => arg === '--window-role=public');
const api = publicWindow
  ? Object.freeze({ getPresentation: () => ipcRenderer.invoke('public:presentation'), connectRealtime: () => ipcRenderer.invoke('public:realtime'), onPresentationUpdated: (callback: (value: unknown) => void) => { const listener = (_event: Electron.IpcRendererEvent, value: unknown) => callback(value); ipcRenderer.on('public:presentation-updated', listener); return () => ipcRenderer.removeListener('public:presentation-updated', listener); } })
  : Object.freeze({
      command: (path: string, method = 'GET', body?: unknown) => ipcRenderer.invoke('dm:command', path, method, body),
      preferences: (value?: unknown) => ipcRenderer.invoke('dm:preferences', value),
      displays: () => ipcRenderer.invoke('display:list'),
      audioConfig: (value?: unknown) => ipcRenderer.invoke('audio:config', value),
      audioImport: () => ipcRenderer.invoke('audio:import'),
      audioBytes: (id: string) => ipcRenderer.invoke('audio:bytes', id),
      audioDiscard: (id: string) => ipcRenderer.invoke('audio:discard', id),
      getPresentation: () => ipcRenderer.invoke('dm:command', '/api/presentation', 'GET'),
    });
contextBridge.exposeInMainWorld('dungeonDeputy', api);
