import { FrontmatterEntry } from './types/frontmatter'

export const isObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false
  return Object.prototype.toString.call(value) === '[object Object]'
}

const isEntry = (entry: unknown): entry is FrontmatterEntry => {
  if (Array.isArray(entry)) return false
  if (!isObject(entry)) return false
  if (typeof entry.name !== 'string') return false
  if (!Array.isArray(entry.keywords)) return false
  if (!entry.keywords.every((a) => typeof a === 'string')) return false
  return true
}

export function validateData(
  data: unknown,
): asserts data is Array<FrontmatterEntry> {
  console.log(JSON.stringify(data, null, 2))
  if (!Array.isArray(data)) throw new Error('missing frontmatter array')
  if (!data.every(isEntry)) throw new Error('incorrect format')
}
