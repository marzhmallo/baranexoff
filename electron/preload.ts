import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Get app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Open external URL
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // Listen for auth callbacks
  onAuthCallback: (callback: (url: string) => void) => {
    ipcRenderer.on('auth-callback', (_, url) => callback(url));
  },
  
  // Platform information
  platform: process.platform,
  isElectron: true
});

// Type definitions for window
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      onAuthCallback: (callback: (url: string) => void) => void;
      platform: string;
      isElectron: boolean;
    };
  }
}
