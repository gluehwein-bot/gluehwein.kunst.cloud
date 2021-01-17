import { createHash } from 'crypto'
import { read } from 'gray-matter'
import { crawlers } from './crawlers'
import { validateData } from './validation'
import { FrontmatterEntry } from './types/frontmatter'

const entries = <T>(object: T) => {
  return Object.entries(object) as [keyof T, T[keyof T]][]
}

const registry = {
  cache: {
    byId: {} as Record<string, string>,
    byName: {} as Record<string, string>,
  },
  hash(name: string) {
    if (this.cache.byName[name]) return this.cache.byName[name]

    const id = `id_${createHash('sha1').update(name, 'utf8').digest('hex')}`
    this.cache.byId[id] = name
    this.cache.byName[name] = id

    return id
  },
}

const noResult = { price: Infinity, link: 'none', stores: [] }
const { data } = read('./README.md')
validateData(data)

const findBestPrice = async ({
  name,
  keywords,
  ...crawl
}: FrontmatterEntry) => {
  return entries(crawl).map(async ([website, productId]) => {
    const result = await crawlers[website]?.({ productId, keywords })
    return { ...(result || noResult), id: registry.hash(name) }
  })
}

const tasks = data.map(findBestPrice).flat(3)

const main = async () => {
  const t = (await Promise.all(tasks)).flat()
  const results = await Promise.allSettled(t)
  const ok = results.every((result) => result.status === 'fulfilled')
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      console.log(JSON.stringify(result.value, null, 2))
    } else {
      console.error(result.reason)
    }
  })
  process.exitCode = process.exitCode || ok ? 0 : 1
}
main()
