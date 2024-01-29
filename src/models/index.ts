export interface ModData {
   name: string
   library?: boolean
   websiteUrl?: string
   summary?: string
   slug: string
   icon?: string
   popularityScore?: number
   categories: string[]
}

export interface IMod extends ModData {
   id: string
   version?: string
}

export interface IRelease {
   name?: string
   version: string
   date: string
   url: string
   changelog: string
   mods: IMod[]
}
