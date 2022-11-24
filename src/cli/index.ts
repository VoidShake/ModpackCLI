import chalk from 'chalk'
import CurseforgeService from '../curseforge.js'
import WebService from '../web.js'
import parseCliOptions, { Action, ReleaseOptions } from './options.js'

function validateRelease(options: Partial<ReleaseOptions>): asserts options is ReleaseOptions {
   if (!options.version) throw new Error('Version missing')
   if (!options.changelog) throw new Error('Changelog missing')
   if (!options.releaseType) throw new Error('Release-Type missing')
}

async function run() {
   const { params, ...options } = parseCliOptions()

   if (params.length === 0) {
      throw new Error('No action defined, valid actions are [web, curseforge]')
   }

   if (params.includes(Action.WEB)) {
      const web = new WebService(options)
      await web.updateWeb()

      if (options.version) {
         validateRelease(options)
         web.createRelease(options)
      }
   }

   if (params.includes(Action.CURSEFORGE)) {
      const curseforge = new CurseforgeService(options)
      validateRelease(options)

      curseforge.createRelease(options)
   }
}

run().catch(async e => {
   console.error(chalk.red(e.message))
})
