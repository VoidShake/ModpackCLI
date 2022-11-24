export interface PackData {
   name: string
   author: string
   description: string
   links?: Record<string, string | undefined>
   curseforgeProject?: number
   apiUrl?: string
}

export interface WebData extends PackData {
   slug: string
   assets?: Record<string, string | undefined>
   private: boolean
}

export interface Release {
   name: string
   url?: string
   version: string
   date: string
   changelog: string
}

export interface MinecraftInstance {
   name: string
   baseModLoader: {
      forgeVersion: string
      name: string
      type: number
      downloadUrl: string
      filename: string
      installMethod: number
      latest: boolean
      recommended: boolean
      minecraftVersion: string
   }
   installedAddons: Array<{
      addonID: number
      installedFile: {
         categorySectionPackageType: number
         id: number
         fileName: string
      }
   }>
}
