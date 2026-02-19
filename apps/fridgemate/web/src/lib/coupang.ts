const COUPANG_SEARCH_URL = 'https://www.coupang.com/np/search'

export const buildCoupangLink = (ingredientName: string): string => {
  const params = new URLSearchParams({ q: ingredientName })
  return `${COUPANG_SEARCH_URL}?${params.toString()}`
}
