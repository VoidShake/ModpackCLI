import { existsSync, readFileSync } from 'fs'
import { basename, dirname, extname, join } from 'path'
import TOML from 'toml'
import { CliOptions } from './cli/options.js'
import CurseforgeService, { validateCurseforgeOptions } from './curseforge.js'
import { IMod } from './models/index.js'
import ModrinthService, { validateModrinthOptions } from './modrinth.js'
import { ImportedPack } from './types.js'

export function validatePackwizOptions<T>(options: T & Partial<PackwizOptions>): asserts options is T & PackwizOptions {
   if (!options.packwizFile) options.packwizFile = 'pack.toml'
}

export interface PackwizOptions {
   packwizFile: string
}

interface PackwizDefintion {
   version: string
   index: {
      file: string
   }
}

interface PackwizIndex {
   files: Array<{
      file: string
   }>
}

interface FileMod {
   type: 'file'
   fileName: string
}

interface ModrinthUpdateData {
   type: 'modrinth'
   'mod-id': string
   version: string
}

interface CurseforgeUpdateData {
   type: 'curseforge'
   'project-id': number
   'file-id': number
}

interface GithubUpdateData {
   type: 'github'
   slug: string
   tag: string
}

type ResolvedMod = FileMod | ModrinthUpdateData | CurseforgeUpdateData | GithubUpdateData

interface PackwizMod {
   name: string
   filename: string
   download?: {
      url: string
   }
   update?: {
      modrinth?: Omit<ModrinthUpdateData, 'type'>
      curseforge?: Omit<CurseforgeUpdateData, 'type'>
      github?: Omit<GithubUpdateData, 'type'>
   }
}

function parseTOML<T>(file: string): T {
   return TOML.parse(readFileSync(file).toString())
}

export default class PackwizService {
   private cachedCurseforge: CurseforgeService | undefined
   private cachedModrinth: ModrinthService | undefined

   constructor(private readonly options: CliOptions & PackwizOptions) {}

   private get curseforge() {
      if (this.cachedCurseforge) return this.cachedCurseforge
      validateCurseforgeOptions(this.options)
      const service = new CurseforgeService(this.options)
      this.cachedCurseforge = service
      return service
   }

   private get modrinth() {
      if (this.cachedModrinth) return this.cachedModrinth
      validateModrinthOptions(this.options)
      const service = new ModrinthService(this.options)
      this.cachedModrinth = service
      return service
   }

   async parseMod(file: string): Promise<IMod> {
      if (extname(file) === '.toml') {
         const definition = parseTOML<PackwizMod>(file)

         if (definition.update?.modrinth) {
            const data = await this.modrinth.fetchMod(definition.update.modrinth['mod-id'])
            return {
               ...data,
               version: definition.update.modrinth.version,
               id: definition.update.modrinth['mod-id'],
            }
         } else if (definition.update?.curseforge) {
            const data = await this.curseforge.fetchMod(definition.update.curseforge['project-id'])
            return {
               ...data,
               version: definition.update.curseforge['file-id'].toString(),
               id: definition.update.curseforge['project-id'].toString(),
            }
         }

         return {
            id: definition.update?.modrinth?.['mod-id'] ?? file,
            name: definition.name,
            slug: definition.name,
            categories: [],
         }
      }

      const fileName = basename(file)

      return {
         categories: [],
         id: fileName,
         name: fileName,
         slug: fileName,
      }
   }

   private resolveMod(file: string): ResolvedMod {
      if (extname(file) === '.toml') {
         const definition = parseTOML<PackwizMod>(file)

         if (definition.update?.curseforge) {
            return {
               type: 'curseforge',
               ...definition.update.curseforge,
            }
         }

         if (definition.update?.modrinth) {
            return {
               type: 'modrinth',
               ...definition.update.modrinth,
            }
         }

         if (definition.update?.github) {
            return {
               type: 'github',
               ...definition.update.github,
            }
         }

         throw new Error(`File ${file} missing update information`)
      }

      return {
         type: 'file',
         fileName: basename(file),
      }
   }

   async importPackwizPack(): Promise<ImportedPack> {
      const file = this.options.packwizFile

      if (!existsSync(file)) throw new Error(`Could not find packwiz file at '${file}'`)

      const dir = dirname(file)

      const { version, index } = parseTOML<PackwizDefintion>(file)

      const { files } = parseTOML<PackwizIndex>(join(dir, index.file))

      const resolvedMods = files
         .filter(it => it.file.startsWith('mods/'))
         .map(it => this.resolveMod(join(dir, it.file)))

      const fileMods = resolvedMods.filter(it => it.type === 'file') as FileMod[]
      const mods: IMod[] = fileMods.map(({ fileName }) => ({
         categories: [],
         id: fileName,
         name: fileName,
         slug: fileName,
      }))

      const modrinthMods = resolvedMods.filter(it => it.type === 'modrinth') as ModrinthUpdateData[]
      if (modrinthMods.length > 0) {
         const ids = modrinthMods.map(it => it['mod-id'])
         const data = await this.modrinth.fetchMods(ids)
         mods.push(...data.map<IMod>(a => ({ ...a, version: modrinthMods.find(b => b['mod-id'] === a.id)?.version! })))
      }

      const curseforgeMods = resolvedMods.filter(it => it.type === 'curseforge') as CurseforgeUpdateData[]
      if (curseforgeMods.length > 0) {
         const ids = curseforgeMods.map(it => it['project-id'])
         const data = await this.curseforge.fetchMods(ids)
         mods.push(
            ...data.map<IMod>(a => ({
               ...a,
               id: a.id.toString(),
               version: curseforgeMods.find(b => b['project-id'] === a.id)?.['file-id']!.toString(),
            }))
         )
      }

      const githubMods = resolvedMods.filter(it => it.type === 'github') as GithubUpdateData[]
      if (githubMods.length > 0) {
         mods.push(
            ...githubMods.map<IMod>(a => ({
               id: a.slug,
               name: a.slug.split('/')[1],
               version: a.tag,
               categories: [],
               slug: a.slug,
               websiteUrl: `https://github.com/${a.slug}`,
            }))
         )
      }

      return { version, mods }
   }
}
