export interface AppInfo {
  name: string
  version: string
  platform: string
}

export interface PosApi {
  app: {
    getInfo: () => Promise<AppInfo>
  }
}

declare global {
  interface Window {
    pos: PosApi
  }
}