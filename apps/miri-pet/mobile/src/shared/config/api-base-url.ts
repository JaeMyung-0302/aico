import Constants from 'expo-constants'

const DEFAULT_API_BASE_URL = 'http://localhost:4008/api/v1'

const readApiBaseUrl = (): string => {
  const value: unknown = Constants.expoConfig?.extra?.apiBaseUrl
  return typeof value === 'string' && value.length > 0 ? value : DEFAULT_API_BASE_URL
}

export const API_BASE_URL = readApiBaseUrl()
