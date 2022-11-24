import axios, { AxiosInstance } from 'axios'
import FormData from 'form-data'
import { createReadStream, existsSync, readdirSync, readFileSync } from 'fs'
import fs from 'fs-extra'
import { basename, extname, join } from 'path'
import yaml from 'yaml'
import { ReleaseOptions } from './cli/options.js'
import type { MinecraftInstance, PackData, Release, WebData } from './types'

export interface WebOptions {
   apiUrl?: string
   webDir?: string
   webToken: string
}

export const defaultWebDir = 'web'
export const defaultApiUrl = 'https://pack.macarena.ceo/api'

export default class WebService {
   private readonly api: AxiosInstance
   private readonly dir: string

   constructor(private readonly options: Readonly<WebOptions>) {
      if (!options.webToken) throw new Error('Web Token missing')

      this.dir = options.webDir ?? defaultWebDir

      this.api = axios.create({
         baseURL: options.apiUrl ?? defaultApiUrl,
         headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${options.webToken}`,
         },
      })
   }

   async getWebData() {
      const { data } = await this.api.get<WebData>('/pack')
      return data
   }

   async updateWeb() {
      console.group('Updating web')

      await Promise.all([...this.updatePages(), this.updateData(), this.updateAssets()])

      console.groupEnd()
   }

   async updateData() {
      const packData = readPackData(this.dir)

      if (!packData) {
         console.warn('Skip updating pack data')
         return
      }

      await this.api.put('/pack', packData)
      console.log('Updated pack data')
   }

   async updateAssets() {
      const assetsDir = join(this.dir, 'assets')

      if (!existsSync(assetsDir)) {
         console.warn('No assets defined')
         return
      }

      const assets = readdirSync(assetsDir).map(f => join(assetsDir, f))
      const assetsData = assets.reduce((data, img) => {
         data.append(basename(img), createReadStream(img))
         return data
      }, new FormData())

      await this.api.put(`/pack/assets`, assetsData, {
         headers: assetsData.getHeaders(),
      })
      console.log(`Updated assets`)
   }

   updatePages() {
      const pageDir = join(this.dir, 'pages')

      if (!existsSync(pageDir)) {
         console.warn('No pages defined')
         return []
      }

      const pages = readdirSync(pageDir).map(f => join(pageDir, f))

      const parsed = pages.map(page => {
         const ext = extname(page)
         const content = readFileSync(page).toString()
         switch (ext) {
            case '.json':
               return JSON.parse(content)
            case '.yml':
               return yaml.parse(content)
            default:
               return {}
         }
      })

      return parsed.map(async content => {
         await this.api.put('pack/page', content)
         console.log(`Uploaded ${content.title}`)
      })
   }

   async createRelease(release: ReleaseOptions) {
      const cfFile = 'minecraftinstance.json'
      if (!existsSync(cfFile)) throw new Error('minecraftinstance.json file missing')

      const cfData = fs.readJsonSync(cfFile) as MinecraftInstance

      const installedAddons = cfData.installedAddons.filter(addon =>
         existsSync(join('mods', addon.installedFile.fileName))
      )

      const releaseData: Release = {
         date: new Date().toISOString(),
         name: release.version,
         ...release,
      }

      const { data } = await this.api.put(`/pack/release/${release.version}`, {
         installedAddons,
         ...releaseData,
      })

      console.log(`Created release for version '${release.version}'`)

      return data
   }
}

export function readPackData(dir: string): Partial<PackData> | null {
   const file = join(dir, 'pack.yml')
   if (!existsSync(file)) return null
   return yaml.parse(readFileSync(file).toString())
}

export async function getPackName(options: Partial<WebOptions>) {
   if (options.webToken) {
      const service = new WebService(options as WebOptions)
      const data = await service.getWebData()
      return data.name
   } else {
      const packData = readPackData(options.webDir ?? 'web')
      return packData?.name
   }
}
