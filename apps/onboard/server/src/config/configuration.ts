const configuration = () => ({
  port: parseInt(process.env.PORT || '4004', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: (() => {
      const secret = process.env.JWT_SECRET
      if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production')
      }
      return secret || 'dev-secret-change-in-production'
    })(),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  notion: {
    apiKey: process.env.NOTION_API_KEY || '',
  },
  github: {
    appId: process.env.GITHUB_APP_ID || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
  },
  app: {
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5179',
  },
})

export default configuration
