export type CrawlerTargets = 'clubeextra.com.br' | 'paodeacucar.com'
export type CrawlersIndex = Record<CrawlerTargets, CrawlFunction>

type CrawlResult = {
  price: number
  link: string
  stores: Array<{ name: string; address: string; meta?: unknown }>
}

export type CrawlFunction = (options: {
  productId: string | number
  keywords: string[]
}) => Promise<CrawlResult>
