import arg from 'arg'
import commandLineUsage, { OptionDefinition, Section } from 'command-line-usage'
import { CurseforgeOptions } from '../curseforge.js'
import { defaultApiUrl, defaultWebDir, readPackData, WebOptions } from '../web.js'

export const defaultPaths = ['config', 'mods', 'kubejs', 'defaultconfigs']

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
      name: 'curseforge-project',
      description: 'Curseforge Project ID',
   },
   {
      name: 'path',
      multiple: true,
      defaultValue: defaultPaths.join(', '),
      typeLabel: '{underline file} ...',
      description: 'Folder paths to include in the release',
   },
   {
      name: 'exclude',
      multiple: true,
      typeLabel: '{underline file} ...',
      description: 'Folder paths to exclude in the release',
   },
   {
      name: 'help',
      alias: 'h',
      type: Boolean,
      description: 'Print this usage guide.',
   },
   {
      name: 'no-default-paths',
      type: Boolean,
      description: 'Exclude the default paths',
   },
   {
      name: 'name',
      defaultValue: 'If the Web Token is specified, it will be fetched from the API',
      description: 'Name of the Modpack',
   },
   {
      name: 'author',
      description: 'Author of the Modpack',
   },
   {
      name: 'version',
      description: 'Version of the Release',
   },
   {
      name: 'release-type',
      description: 'Release-Type, should be one of [alpha, beta, release]',
   },
   {
      name: 'web',
      type: Boolean,
      description: 'Notifies the external web api about changes & releases',
      group: 'actions',
   },
   {
      name: 'curseforge',
      type: Boolean,
      description: 'Creates a release on CurseForge',
      group: 'actions',
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

export const enum Action {
   WEB = 'web',
   CURSEFORGE = 'curseforge',
}

export interface ReleaseOptions {
   author?: string
   changelog: string
   version: string
   releaseType?: string
   url?: string
   date?: string
   name?: string
}

interface CliOptions extends Partial<ReleaseOptions & WebOptions & CurseforgeOptions> {
   params: string[]
   name?: string
}

export default function parseCliOptions(): CliOptions {
   const args = arg({
      '--web': Boolean,
      '--api-url': String,
      '--web-token': String,
      '--web-dir': String,
      '--curseforge': Boolean,
      '--curseforge-token': String,
      '--curseforge-project': Number,
      '--path': [String],
      '--exclude': [String],
      '--no-default-paths': Boolean,
      '--name': String,
      '--author': String,
      '--version': String,
      '--release-type': String,
      '--help': Boolean,
      '-h': '--help',
   })

   if (args['--help']) {
      const usage = commandLineUsage(sections)
      console.log(usage)
      process.exit(0)
   }

   const webDir = args['--web-dir'] ?? 'web'
   const config = readPackData(webDir)

   const paths: string[] = []
   if (!args['--no-default-paths']) paths.push(...defaultPaths)
   if (args['--path']) paths.push(...args['--path'])

   return {
      apiUrl: args['--api-url'] ?? config?.apiUrl ?? defaultApiUrl,
      webToken: args['--web-token'],
      webDir,
      curseforgeToken: args['--curseforge-token'],
      curseforgeProject: args['--curseforge-project'] ?? config?.curseforgeProject,
      paths: paths.filter(it => !args['--exclude']?.includes(it)),
      name: args['--name'],
      author: args['--author'],
      version: args['--version'],
      releaseType: args['--release-type'],
      params: args._,
   }
}
