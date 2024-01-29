import { existsSync, readFileSync } from 'fs'
import { CliOptions } from './cli/options.js'
import CurseforgeService, { CurseforgeOptions, validateCurseforgeOptions } from './curseforge.js'
import PackwizService, { PackwizOptions, validatePackwizOptions } from './packwiz.js'

function fromMinecraftInstance(options: CurseforgeOptions) {
   const file = options.curseforgePackFile ?? 'minecraftinstance.json'
   if (!existsSync(file)) throw new Error(`curseforge manifest file '${file}' does not exist`)

   const curseforge = new CurseforgeService(options)

   const parsed = JSON.parse(readFileSync(file).toString())

   return curseforge.importCurseforgePack(parsed)
}

function fromPackwiz(options: CliOptions & PackwizOptions) {
   const service = new PackwizService(options)
   return service.importPackwizPack()
}

export async function parsePack(options: CliOptions) {
   if (options.curseforgePackFile || existsSync('minecraftinstance.json')) {
      validateCurseforgeOptions(options)
      return fromMinecraftInstance(options)
   }

   if (options.packwizFile || existsSync('pack.toml')) {
      validatePackwizOptions(options)
      return fromPackwiz(options)
   }

   throw new Error('No pack metadata file auto-detected')
}
