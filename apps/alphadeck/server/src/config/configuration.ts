export default () => ({
  port: parseInt(process.env.PORT || '4004', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY,
  },
  yahoo: {
    timeout: parseInt(process.env.YAHOO_FINANCE_TIMEOUT || '10000', 10),
  },
  app: {
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5179',
  },
});
