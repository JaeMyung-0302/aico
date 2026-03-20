const configuration = () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  kamis: {
    apiKey: process.env.KAMIS_API_KEY,
    apiId: process.env.KAMIS_API_ID,
  },
  coupang: {
    accessKey: process.env.COUPANG_ACCESS_KEY,
    secretKey: process.env.COUPANG_SECRET_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  },
  kakao: {
    clientId: process.env.KAKAO_CLIENT_ID || '',
    clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  app: {
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5177',
  },
  portone: {
    storeId: process.env.PORTONE_STORE_ID || '',
    apiSecret: process.env.PORTONE_API_SECRET || '',
    channelKey: process.env.PORTONE_CHANNEL_KEY || '',
    webhookSecret: process.env.PORTONE_WEBHOOK_SECRET || '',
  },
  billing: {
    encryptKey: process.env.BILLING_ENCRYPT_KEY || '',
  },
  admin: {
    emails: process.env.ADMIN_EMAILS,
  },
})

export default configuration
