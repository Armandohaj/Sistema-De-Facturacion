import { contextBridge, ipcRenderer } from 'electron'

export interface AppInfo {
  name: string
  version: string
  platform: string
}

const posApi = {
  app: {
    getInfo: (): Promise<AppInfo> => {
      return ipcRenderer.invoke('app:get-info')
    }
  }
}

contextBridge.exposeInMainWorld('pos', posApi)