import axios, { AxiosInstance } from 'axios'
import { ModData } from './models/index.js'

export interface ModrinthOptions {
   modrinthToken: string
}

interface ModrinthMod {
   project_type: string
   slug: string
   description: string
   id: string
   title: string
   categories: string[]
   downloads?: number
   icon_url: string
}

type ModDataWithId = ModData & {
   id: string
}

export function validateModrinthOptions<T>(
   options: T & Partial<ModrinthOptions>
): asserts options is T & ModrinthOptions {
   if (!options.modrinthToken) throw new Error('Modrinth Token missing')
}

export default class ModrinthService {
   private readonly api: AxiosInstance

   constructor(options: ModrinthOptions) {
      this.api = axios.create({
         baseURL: 'https://api.modrinth.com/v2',
         responseType: 'json',
         headers: {
            Accept: 'application/json',
            Authorization: `Authorization ${options.modrinthToken}`,
            'User-Agent': 'VoidShake/ModpackCLI (packs.macarena.ceo)',
         },
      })
   }

   private resolveMod(data: ModrinthMod): ModDataWithId {
      return {
         id: data.id,
         name: data.title,
         slug: data.slug,
         categories: data.categories ?? [],
         icon: data.icon_url,
         popularityScore: data.downloads,
         summary: data.description,
         websiteUrl: `https://modrinth.com/mod/${data.slug}`,
      }
   }

   async fetchMods(ids: string[]): Promise<ModDataWithId[]> {
      console.log(`Fetching ${ids.length} mods from modrinth`)
      const encodedIds = ids.map(it => `"${it}"`).join(',')
      const { data } = await this.api.get<ModrinthMod[]>(`/projects?ids=[${encodedIds}]`)
      return data.map(it => this.resolveMod(it))
   }

   async fetchMod(id: string): Promise<ModData> {
      console.log(`Fetching ${id} from modrinth`)
      const { data } = await this.api.get<ModrinthMod>(`/project/${id}`)
      return this.resolveMod(data)
   }
}
