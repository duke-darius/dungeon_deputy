import { contextBridge, ipcRenderer } from 'electron';

const publicWindow = process.argv.some(arg => arg === '--window-role=public');
const api = publicWindow
  ? Object.freeze({ getPresentation: () => ipcRenderer.invoke('public:presentation') })
  : Object.freeze({
      command: (path: string, method = 'GET') => ipcRenderer.invoke('dm:command', path, method),
      preferences: (value?: unknown) => ipcRenderer.invoke('dm:preferences', value),
      displays: () => ipcRenderer.invoke('display:list'),
      getPresentation: () => ipcRenderer.invoke('dm:command', '/api/presentation', 'GET'),
    });
contextBridge.exposeInMainWorld('dungeonDeputy', api);
