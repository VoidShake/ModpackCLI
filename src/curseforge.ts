import archiver from 'archiver'
import axios, { AxiosInstance } from 'axios'
import FormData from 'form-data'
import { createReadStream, createWriteStream, existsSync, readdirSync, readFileSync, unlinkSync } from 'fs'
import fs from 'fs-extra'
import minimatch from 'minimatch'
import { join } from 'path'
import rimraf from 'rimraf'
import { ReleaseOptions } from './cli/options.js'
import type { MinecraftInstance } from './types'
import { getPackName, WebOptions } from './web.js'

export interface CurseforgeOptions {
   curseforgeToken: string
   curseforgeProject: number
   paths: string[]
}

export default class CurseforgeService {
   private readonly api: AxiosInstance

   constructor(private readonly options: Readonly<CurseforgeOptions & Partial<WebOptions>>) {
      this.api = axios.create({
         baseURL: 'https://minecraft.curseforge.com/api',
         headers: {
            'X-Api-Token': options.curseforgeToken,
         },
      })
   }

   async createRelease(release: ReleaseOptions) {
      console.group('Creating zip releases for CurseForge')

      const client = await this.zipAndUpload('client', release)

      this.removeClientContent()
      const server = await this.zipAndUpload('server', release)

      console.groupEnd()

      return { client, server }
   }

   private async zipAndUpload(name: string, release: ReleaseOptions) {
      const archive = archiver('zip')
      const file = name + '.zip'

      archive.pipe(createWriteStream(file))
      this.options.paths.forEach(dir => archive.directory(dir, join('overrides', dir)))

      const manifest = await this.createManifest(release)
      archive.append(manifest, { name: 'manifest.json' })

      await archive.finalize()

      await this.uploadToCurseforge(file, release)

      return file
   }

   private async createManifest(release: ReleaseOptions) {
      const instance = fs.readJsonSync('minecraftinstance.json') as MinecraftInstance

      const files = instance.installedAddons
         .filter(a => a.installedFile.categorySectionPackageType !== 3)
         .filter(a => existsSync(join('mods', a.installedFile.fileName)))
         .map(a => ({
            projectID: a.addonID,
            fileID: a.installedFile.id,
            required: true,
         }))

      console.log(`Found ${files.length} installed mods`)

      const manifest = {
         minecraft: {
            version: instance.baseModLoader.minecraftVersion,
            modLoaders: [
               {
                  id: instance.baseModLoader.name,
                  primary: true,
               },
            ],
         },
         files,
         manifestType: 'minecraftModpack',
         manifestVersion: 1,
         name: (await getPackName(this.options)) ?? instance.name,
         version: release.version,
         author: release.author,
         overrides: 'overrides',
      }

      return JSON.stringify(manifest, null, 2)
   }

   private async uploadToCurseforge(file: string, release: ReleaseOptions) {
      const data = new FormData()
      data.append('file', createReadStream(file))
      data.append(
         'metadata',
         JSON.stringify({
            changelogType: 'markdown',
            changelog: release.changelog,
            releaseType: release.releaseType,
         })
      )

      await this.api.post(`projects/${this.options.curseforgeProject}/upload-file`, { data })
   }

   private async removeClientContent(config = '.serverignore') {
      rimraf.sync('kubejs/assets')

      if (existsSync(config)) {
         const excludePatterns: string[] = readFileSync(config)
            .toString()
            .split('\n')
            .map(it => it.trim())
            .filter(it => !it.startsWith('#'))

         const matches = readdirSync('mods').filter(file => excludePatterns.some(pattern => minimatch(file, pattern)))

         matches.forEach(f => {
            unlinkSync(join('mods', f))
         })

         console.log(`Removed ${matches.length} files using ${excludePatterns.length} patterns`)
      }
   }
}
