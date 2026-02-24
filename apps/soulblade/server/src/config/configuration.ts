export const configuration = () => {
  const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env: ${key}`);
    }
  }

  return {
    port: parseInt(process.env.PORT || '4003', 10),
    database: { url: process.env.DATABASE_URL },
    supabase: {
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:5175',
  };
};
