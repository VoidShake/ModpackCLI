import axios, { AxiosInstance } from 'axios'
import chalk from 'chalk'
import FormData from 'form-data'
import { createReadStream, existsSync, readdirSync, readFileSync } from 'fs'
import { basename, extname, join } from 'path'
import yaml from 'yaml'
import { CliOptions, ReleaseOptions } from './cli/options.js'
import { IMod } from './models/index.js'
import { parsePack } from './pack.js'
import type { PackData, Release, WebData } from './types.js'

export interface WebOptions {
   apiUrl?: string
   webDir?: string
   webToken: string
}

export const defaultWebDir = 'web'
export const defaultApiUrl = 'https://packs.macarena.ceo/api'

function validateRelease<T>(options: T & Partial<ReleaseOptions>): asserts options is T & ReleaseOptions {
   if (!options.version) throw new Error('Version missing')
   if (!options.changelog) throw new Error('Changelog missing')
   if (!options.releaseType) throw new Error('Release-Type missing')
}

export default class WebService {
   private readonly api: AxiosInstance
   private readonly dir: string
   private readonly baseUrl: string

   constructor(private readonly options: Readonly<CliOptions & WebOptions>) {
      if (!options.webToken) throw new Error('Web Token missing')

      this.dir = options.webDir ?? defaultWebDir
      this.baseUrl = options.apiUrl ?? defaultApiUrl

      this.api = axios.create({
         baseURL: this.baseUrl,
         responseType: 'json',
         headers: {
            Accept: 'application/json',
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
      console.group(`Updating web at ${chalk.underline(this.baseUrl)}`)

      await Promise.all([...this.updatePages(), this.updateData(), this.updateAssets()])

      console.groupEnd()
   }

   private async updateData() {
      const packData = readPackData(this.dir)

      if (!packData) {
         console.warn('Skip updating pack data')
         return
      }

      await this.api.put('/pack', packData)
      console.log('Updated pack data')
   }

   private async updateAssets() {
      const assetsDir = join(this.dir, 'assets')

      if (!existsSync(assetsDir)) {
         console.warn('No assets defined')
         return
      }

      const assets = readdirSync(assetsDir)
         .filter(it => ['.png', '.jpg', '.jpeg'].includes(extname(it)))
         .map(f => join(assetsDir, f))

      const assetsData = assets.reduce((data, img) => {
         data.append(basename(img), createReadStream(img))
         return data
      }, new FormData())

      await this.api.put(`/pack/assets`, assetsData, {
         headers: assetsData.getHeaders(),
      })
      console.log(`Updated assets`)
   }

   private updatePages() {
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

   async parseAndCreateRelease() {
      const options = { ...this.options }
      const { mods, version } = await parsePack(options)

      if (!options.version) options.version = version
      validateRelease(options)

      await this.createRelease(mods, options)
   }

   async createRelease(mods: IMod[], release: ReleaseOptions) {
      const releaseData: Release = {
         date: new Date().toISOString(),
         name: release.version,
         ...release,
      }

      const { data } = await this.api.put(`/pack/release/${release.version}`, {
         mods,
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
