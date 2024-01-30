import axios, { AxiosInstance } from 'axios'
import { IMod, ModData } from './models/index.js'
import { ImportedPack } from './types.js'

interface CurseforgeMod {
   id: number
   logo?: {
      thumbnailUrl: string
      url: string
   }
   primaryCategoryId: number
   categories: Array<{
      id: number
      name: string
   }>
   name: string
   slug: string
   gamePopularityRank: number
   links: {
      websiteUrl?: string
      wikiUrl?: string
      issuesUrl?: string
      sourceUrl?: string
   }
}

interface CurseforgePack {
   installedAddons: {
      addonID: number
      installedFile: {
         fileDate: string
         /** @deprecated use `fileName` */
         displayName?: string
         fileName: string
         categorySectionPackageType: number
         dependencies: Array<{
            addonId: number
         }>
         modules: Array<{
            foldername: string
         }>
      }
   }[]
}

export interface CurseforgeOptions {
   curseforgeToken: string
   curseforgePackFile?: string
}

const libIds = [421, 425, 423, 435]

export function validateCurseforgeOptions<T>(
   options: T & Partial<CurseforgeOptions>
): asserts options is T & CurseforgeOptions {
   if (!options.curseforgeToken) throw new Error('CurseForge Token missing')
}

type ModDataWithId = ModData & {
   id: number
}

const categoryReplacements: Record<string, string[]> = {
   'api-and-library': ['library'],
   'world-gen': ['worldgen'],
   'ores-and-resources': ['worldgen'],
   dimensions: ['$', 'worldgen'],
   'utility-&-qol': ['utility'],
   'server-utility': ['$', 'utility'],
   'armor-tools-and-weapons': ['equipment'],
}

function uniq<T>(array: T[]) {
   return array.filter((v1, i1) => !array.some((v2, i2) => v1 === v2 && i2 < i1))
}

export default class CurseforgeService {
   private readonly api: AxiosInstance

   constructor(options: CurseforgeOptions) {
      this.api = axios.create({
         baseURL: 'https://api.curseforge.com/v1',
         responseType: 'json',
         headers: {
            Accept: 'application/json',
            'x-api-key': options.curseforgeToken,
         },
      })
   }

   private resolveCategory(from: string) {
      const snakeCase = from.replace(/[\s,]+/g, '-').toLowerCase()
      if (snakeCase in categoryReplacements) {
         return categoryReplacements[snakeCase].map(it => {
            if (it === '$') return snakeCase
            return it
         })
      }
      return [snakeCase]
   }

   private resolveMod(data: CurseforgeMod): ModDataWithId {
      return {
         id: data.id,
         name: data.name,
         slug: data.slug,
         ...data.links,
         categories: uniq(data.categories.flatMap(it => this.resolveCategory(it.name))),
         library: [421, 425].includes(data.primaryCategoryId) && data.categories.every(c => libIds.includes(c.id)),
         popularityScore: data.gamePopularityRank,
         icon: data.logo?.thumbnailUrl,
      }
   }

   async fetchMod(id: number): Promise<ModDataWithId> {
      console.log(`Fetching ${id} from curseforge`)
      const response = await this.api.get(`/mods/${id}`)
      return this.resolveMod(response.data.data)
   }

   async fetchMods(ids: number[]): Promise<ModDataWithId[]> {
      console.log(`Fetching ${ids.length} mods from curseforge`)
      const response = await this.api.post(`/mods`, {
         modIds: ids,
      })
      return response.data.data.map((it: CurseforgeMod) => this.resolveMod(it))
   }

   /*
export async function importCurseforgeMod(modId: number): Promise<IMod> {
   const { logo, primaryCategoryId, categories, gamePopularityRank, links, cfID, ...values } = await getMod(modId)

   const libIds = [421, 425, 423, 435]

   return {
      ...values,
      ...links,
      id: cfID.toString(),
      categories,
      library: !!([421, 425].includes(primaryCategoryId) && categories.every(c => libIds.includes(c.id))),
      popularityScore: gamePopularityRank,
      icon: logo?.thumbnailUrl,
   }
}
*/

   async importCurseforgePack(pack: CurseforgePack): Promise<ImportedPack> {
      const addons = pack.installedAddons
         .filter(a => a.installedFile.modules.some(m => m.foldername === 'META-INF'))
         .map(({ addonID, installedFile }) => ({
            cfID: addonID,
            version: {
               date: installedFile.fileDate,
               file: installedFile.fileName ?? installedFile.displayName,
            },
            library: pack.installedAddons.some(a => a.installedFile.dependencies.some(d => d.addonId === addonID)),
         }))

      const mods = await Promise.all(
         addons.map<Promise<IMod>>(async ({ cfID, version, library }) => {
            const mod = await this.fetchMod(cfID)

            return {
               ...mod,
               version: version.file,
               id: cfID.toString(),
               library: library && mod.library,
            }
         })
      )

      return { mods }
   }
}
