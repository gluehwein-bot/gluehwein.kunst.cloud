import * as gpa from './_gpa'
import { CrawlFunction } from '../types/crawler'

export const crawl: CrawlFunction = async ({ productId, keywords }) => {
  const { price, offers } = await gpa.getBestPriceInfo({
    productId: +productId,
    keywords,
    brand: 'ex',
    storeFilter: (store) => store.state === 'DF',
  })
  return {
    price,
    link: `https://www.clubeextra.com.br/produto/${productId}`,
    stores: offers.map(({ store, ...offer }) => ({ ...store, meta: offer })),
  }
}
