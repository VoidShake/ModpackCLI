import chalk from 'chalk'
import CurseforgeService, { CurseforgeOptions } from '../curseforge.js'
import WebService, { WebOptions } from '../web.js'
import parseCliOptions, { Action, ReleaseOptions } from './options.js'

function validateRelease<T>(options: T & Partial<ReleaseOptions>): asserts options is T & ReleaseOptions {
   if (!options.version) throw new Error('Version missing')
   if (!options.changelog) throw new Error('Changelog missing')
   if (!options.releaseType) throw new Error('Release-Type missing')
}

function validateWebOptions<T>(options: T & Partial<WebOptions>): asserts options is T & WebOptions {
   if (!options.webToken) throw new Error('Web Token missing')
}

function validateCurseforgeOptions<T>(
   options: T & Partial<CurseforgeOptions>
): asserts options is T & CurseforgeOptions {
   if (!options.curseforgeProject) throw new Error('CurseForge Project-ID missing')
   if (!options.curseforgeToken) throw new Error('CurseForge Token missing')
   if (!options.paths) throw new Error('Pack path are missing')
}

async function run() {
   const { params, ...options } = parseCliOptions()

   if (params.length === 0) {
      throw new Error('No action defined, valid actions are [web, curseforge]')
   }

   if (params.includes(Action.WEB)) {
      validateWebOptions(options)
      const web = new WebService(options)
      await web.updateWeb()

      if (options.version) {
         validateRelease(options)
         web.createRelease(options)
      }
   }

   if (params.includes(Action.CURSEFORGE)) {
      validateCurseforgeOptions(options)
      const curseforge = new CurseforgeService(options)
      validateRelease(options)

      curseforge.createRelease(options)
   }
}

run().catch(async e => {
   console.error(chalk.red(e.message))
})
