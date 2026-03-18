const configuration = () => ({
  port: parseInt(process.env.PORT || '4003', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  cors: {
    origins: process.env.CORS_ORIGINS || 'http://localhost:5175',
  },
})

export default configuration
