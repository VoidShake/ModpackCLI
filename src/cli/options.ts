import arg from 'arg'
import commandLineUsage, { OptionDefinition, Section } from 'command-line-usage'
import dotenv from 'dotenv'
import { CurseforgeOptions } from '../curseforge.js'
import { ModrinthOptions } from '../modrinth.js'
import { PackwizOptions } from '../packwiz.js'
import { WebOptions, defaultApiUrl, defaultWebDir, readPackData } from '../web.js'

const optionDefinitions: OptionDefinition[] = [
   {
      name: 'api-url',
      defaultValue: defaultApiUrl,
      typeLabel: '{underline url}',
      description: 'URL of the web API',
   },
   {
      name: 'web-token',
      description: 'API Token of the web API',
   },
   {
      name: 'web-dir',
      defaultValue: defaultWebDir,
      typeLabel: '{underline file}',
      description: 'Directory of the web assets',
   },
   {
      name: 'curseforge-token',
      description: 'Curseforge API Token',
   },
   {
      name: 'name',
      defaultValue: 'If the Web Token is specified, it will be fetched from the API',
      description: 'Name of the Modpack',
   },
   {
      name: 'version',
      description: 'Version of the Release',
   },
   {
      name: 'changelog',
      description: 'The changelog of the Release',
   },
   {
      name: 'release-type',
      description: 'Release-Type, should be one of [alpha, beta, release]',
   },
   {
      name: 'help',
      alias: 'h',
      type: Boolean,
      description: 'Print this usage guide.',
   },
]

const sections: Section[] = [
   {
      header: 'Modpack CLI',
      content: 'CLI to release modpacks',
   },
   {
      header: 'Actions',
      optionList: optionDefinitions,
      group: 'actions',
   },
   {
      header: 'Options',
      optionList: optionDefinitions,
      group: '_none',
   },
]

export interface ReleaseOptions {
   author?: string
   changelog: string
   version: string
   releaseType?: string
   url?: string
   date?: string
   name?: string
}

export interface CliOptions
   extends Partial<ReleaseOptions & WebOptions & CurseforgeOptions & PackwizOptions & ModrinthOptions> {
   params: string[]
   name?: string
   debug?: boolean
}

export default function parseCliOptions(): CliOptions {
   dotenv.config()

   const args = arg({
      '--web': Boolean,
      '--api-url': String,
      '--web-token': String,
      '--web-dir': String,
      '--curseforge-token': String,
      '--curseforge-pack-file': String,
      '--modrinth-token': String,
      '--packwiz-file': String,
      '--name': String,
      '--version': String,
      '--changelog': String,
      '--release-type': String,
      '--help': Boolean,
      '--debug': Boolean,
      '-h': '--help',
   })

   if (args['--help']) {
      const usage = commandLineUsage(sections)
      console.log(usage)
      process.exit(0)
   }

   const webDir = args['--web-dir'] ?? 'web'
   const config = readPackData(webDir)

   return {
      apiUrl: args['--api-url'] ?? config?.apiUrl,
      webToken: args['--web-token'] ?? process.env.WEB_TOKEN,
      webDir,
      changelog: args['--changelog'],
      curseforgeToken: args['--curseforge-token'] ?? process.env.CURSEFORGE_TOKEN,
      modrinthToken: args['--modrinth-token'] ?? process.env.MODRINTH_TOKEN,
      packwizFile: args['--packwiz-file'],
      curseforgePackFile: args['--curseforge-pack-file'],
      name: args['--name'],
      version: args['--version'],
      releaseType: args['--release-type'],
      debug: args['--debug'],
      params: args._,
   }
}
