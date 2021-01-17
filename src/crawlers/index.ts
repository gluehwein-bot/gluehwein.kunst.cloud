import { CrawlersIndex } from '../types/crawler'
import { crawl as clubeextra_com_br } from './clubeextra.com.br'
import { crawl as paodeacucar_com } from './paodeacucar.com'

export const crawlers: CrawlersIndex = {
  'clubeextra.com.br': clubeextra_com_br,
  'paodeacucar.com': paodeacucar_com,
}
