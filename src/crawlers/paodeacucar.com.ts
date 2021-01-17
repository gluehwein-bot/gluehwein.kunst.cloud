import * as gpa from './_gpa'
import { CrawlFunction } from '../types/crawler'

export const crawl: CrawlFunction = async ({ productId, keywords }) => {
  const { price, offers } = await gpa.getBestPriceInfo({
    productId: +productId,
    keywords,
    brand: 'pa',
    storeFilter: (store) => store.state === 'DF',
  })
  return {
    price,
    link: `https://www.paodeacucar.com/produto/${productId}`,
    stores: offers.map(({ store, ...offer }) => ({ ...store, meta: offer })),
  }
}
