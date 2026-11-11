'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('exstraSites', Object.freeze({
  state: () => ipcRenderer.invoke('exstra-sites:state'),
  command: payload => ipcRenderer.invoke('exstra-sites:command', payload),
  onState: callback => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('exstra-sites:changed', handler);
    return () => ipcRenderer.removeListener('exstra-sites:changed', handler);
  },
  onFocus: callback => {
    const handler = () => callback();
    ipcRenderer.on('exstra-sites:focus-address', handler);
    return () => ipcRenderer.removeListener('exstra-sites:focus-address', handler);
  }
}));
