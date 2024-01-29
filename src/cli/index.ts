import { isAxiosError } from 'axios'
import chalk from 'chalk'
import WebService, { WebOptions } from '../web.js'
import parseCliOptions from './options.js'

function validateWebOptions<T>(options: T & Partial<WebOptions>): asserts options is T & WebOptions {
   if (!options.webToken) throw new Error('Web Token missing')
}

const options = parseCliOptions()

async function run() {
   validateWebOptions(options)
   const web = new WebService(options)

   if (options.params.includes('update')) {
      await web.updateWeb()
   }

   if (options.params.includes('release')) {
      await web.parseAndCreateRelease()
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
