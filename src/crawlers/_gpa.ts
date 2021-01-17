import { fetch } from 'fetch-h2'

const NOT_FOUND = Symbol('NOT_FOUND')

type GpaBrand = 'pa' | 'ex'

type GpaResponse<T> = {
  status: string
  message: string
  code: number
  content?: T
}

type GpaStore = {
  freightDeliveryTypeId: number
  freightDeliveryAddressId: number
  id: number
  zip: string
  street: string
  city: string
  state: string
  neighborhood: string
  complement: string
  address_number: string
  store_name: string
  erp_code: string
  addressId: number
  latitude: number
  longitude: number
  typeid: string
  name: string
  text: string
  type: string
  validPoint: boolean
  store_id: string
  state_description: string
}

type GpaProduct = {
  id: number
  name: string
  sellInfos: Array<GpaSellInfo>
}

type GpaSellInfo = {
  storeId: number
  currentPrice: number
  sellPrice: number
  validOnStore: boolean
  stock: boolean
  stockQuantity: number
  productPromotions: Array<GpaProductPromotion>
}

type GpaProductPromotion = {
  startDate: string // '2021-01-14T00:00:00'
  endDate: string // '2021-01-17T23:59:00'
  unitPrice: number
  promotionPercentOffOnUnity: number // 1
  promotionPercentOff: number // 40
  appExclusive: boolean
}

type GpaStorePrettyOffer = {
  storeId: number
  validOnStore: boolean
  promotion: boolean
  appExclusive?: boolean
  startDate?: string
  endDate?: string
}

type GpaStoreBestPriceInfo = {
  name: string
  price: number
  offers: Array<GpaStorePrettyOffer>
}

type GpaFinalPrettyOffer = {
  store: { name: string; address: string }
  validOnStore: boolean
  promotion: boolean
  appExclusive?: boolean
  startDate?: string
  endDate?: string
}

type GpaBestPriceInfo = {
  price: number
  offers: Array<GpaFinalPrettyOffer>
}

const unwrap = <T>(json: GpaResponse<T>): T => {
  if (json.code !== 200) throw new Error(json.message)
  if (json.status !== 'success') throw new Error(json.message)
  if (typeof json.content === 'undefined') throw new Error('missing content')
  return json.content
}

const httpCache: Record<string, unknown> = {}

const fetchJsonWithCache = async <T>(url: string): Promise<GpaResponse<T>> => {
  if (httpCache[url]) return httpCache[url] as GpaResponse<T>
  const json: GpaResponse<T> = await (await fetch(url)).json()
  httpCache[url] = json
  if (['1', 'true'].includes(process.env.DEBUG || '')) {
    console.log('\nurl:', url)
    console.log(JSON.stringify(json, null, 2) + '\n')
  }
  return json
}

const fetchGpa = async <T>(options: {
  brand: GpaBrand
  path: string
}): Promise<T | typeof NOT_FOUND> => {
  const url = `https://api.gpa.digital/${options.brand}${options.path}`
  const json = await fetchJsonWithCache<T>(url)
  if (json.code === 404) return NOT_FOUND
  return unwrap(json)
}

const containAllKeywords = (str: string, keywords: string[]) => {
  return keywords.every((keyword) => {
    return str.toUpperCase().includes(keyword.toUpperCase())
  })
}

const listStores = async (options: {
  brand: GpaBrand
}): Promise<Array<GpaStore>> => {
  const stores = await fetchGpa<Array<GpaStore>>({
    brand: options.brand,
    path: `/v2/delivery/ecom/driveThru`,
  })
  return stores === NOT_FOUND ? [] : stores
}

const getStoreBestPriceInfo = async (options: {
  brand: GpaBrand
  storeId: number
  productId: number
}): Promise<GpaStoreBestPriceInfo> => {
  const response = await fetchGpa<GpaProduct>({
    brand: options.brand,
    path: `/v4/products/ecom/${options.productId}/bestPrices?storeId=${options.storeId}&sellType=&isClienteMais=true`,
  })
  if (response === NOT_FOUND) {
    return { name: 'out-of-stock', price: Infinity, offers: [] }
  }
  const { id, name, sellInfos } = response
  if (id !== options.productId) throw new Error('mismatch of product id')
  const { price, offers: rawOffers } = sellInfos.reduce<{
    price: number
    offers: Array<{ sellInfo: GpaSellInfo; promotion?: GpaProductPromotion }>
  }>(
    (accOffers, currentOffer) => {
      if (!currentOffer.stock) return accOffers
      if (currentOffer.stockQuantity === 0) return accOffers

      const promotion = currentOffer.productPromotions.reduce<
        GpaProductPromotion | undefined
      >((best, current) => {
        if (!best) return current
        return best.unitPrice > current.unitPrice ? current : best
      }, undefined)

      const currentOfferPrice =
        promotion?.unitPrice ??
        currentOffer.currentPrice ??
        currentOffer.sellPrice

      if (currentOfferPrice > accOffers.price) return accOffers

      const offer = { sellInfo: currentOffer, promotion }
      if (currentOfferPrice === accOffers.price) {
        accOffers.offers.push(offer)
        return accOffers
      }
      return { price: currentOfferPrice, offers: [offer] }
    },
    { price: Infinity, offers: [] },
  )

  const offers = rawOffers.map(
    ({ sellInfo, promotion }): GpaStorePrettyOffer => {
      const { validOnStore, storeId } = sellInfo
      if (!promotion) return { storeId, validOnStore, promotion: false }
      const { appExclusive, startDate, endDate } = promotion
      return {
        storeId,
        validOnStore,
        promotion: true,
        appExclusive,
        startDate,
        endDate,
      }
    },
  )

  return { name, price, offers }
}

export const getBestPriceInfo = async (options: {
  brand: GpaBrand
  productId: number
  keywords: Array<string>
  storeFilter: (store: GpaStore) => boolean
}): Promise<GpaBestPriceInfo> => {
  const { brand, productId, keywords, storeFilter } = options
  const stores = (await listStores({ brand })).filter(storeFilter)
  const priceByStore = await Promise.all(
    stores.map(({ store_id }) =>
      getStoreBestPriceInfo({ storeId: +store_id, productId, brand }),
    ),
  )

  const {
    price,
    offers: rawOffers,
  } = priceByStore.reduce<GpaStoreBestPriceInfo>(
    (acc, current) => {
      if (!containAllKeywords(current.name, keywords)) return acc
      if (current.price === acc.price) {
        acc.offers.concat(current.offers)
        return acc
      }
      return current.price > acc.price ? acc : current
    },
    { name: 'UNAVAILABLE', price: Infinity, offers: [] },
  )

  const offers = rawOffers.map(({ storeId, ...offer }) => {
    const store = stores.find((store) => +store.store_id === storeId)
    if (!store) throw new Error('missing store info')
    return {
      ...offer,
      store: {
        name: `${store.erp_code} – ${store.name}`,
        address: `${store.street}, ${store.address_number}, ${store.neighborhood}, ${store.city}, ${store.state}, ${store.zip}`,
      },
    }
  })

  return { price, offers }
}
