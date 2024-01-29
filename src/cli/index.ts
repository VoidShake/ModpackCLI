import { isAxiosError } from 'axios'
import chalk from 'chalk'
import { existsSync, readFileSync } from 'fs'
import CurseforgeService, { CurseforgeOptions, validateCurseforgeOptions } from '../curseforge.js'
import PackwizService, { PackwizOptions, validatePackwizOptions } from '../packwiz.js'
import WebService, { WebOptions } from '../web.js'
import parseCliOptions, { CliOptions, ReleaseOptions } from './options.js'

function validateRelease<T>(options: T & Partial<ReleaseOptions>): asserts options is T & ReleaseOptions {
   if (!options.version) throw new Error('Version missing')
   if (!options.changelog) throw new Error('Changelog missing')
   if (!options.releaseType) throw new Error('Release-Type missing')
}

function validateWebOptions<T>(options: T & Partial<WebOptions>): asserts options is T & WebOptions {
   if (!options.webToken) throw new Error('Web Token missing')
}

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

async function parsePack(options: CliOptions) {
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

const options = parseCliOptions()

async function run() {
   validateWebOptions(options)
   const web = new WebService(options)

   if (options.params.includes('update')) {
      await web.updateWeb()
   }

   if (options.params.includes('release')) {
      const { mods, version } = await parsePack(options)

      if (!options.version) options.version = version

      validateRelease(options)
      await web.createRelease(mods, options)
   }
}

run().catch(async (e: Error) => {
   if (options.debug) {
      if (isAxiosError(e) && e.response?.data) {
         console.error(e.response?.data)
      }

      console.error(chalk.red(e.stack ?? e.message))
   } else {
      console.error(chalk.red(e.message))
   }
})
