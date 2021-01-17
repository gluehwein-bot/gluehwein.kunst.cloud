import { CrawlerTargets } from './crawler'
export type FrontmatterEntry = {
  name: string
  keywords: string[]
} & Record<CrawlerTargets, number | string>
