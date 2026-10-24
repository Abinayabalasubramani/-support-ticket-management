require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${problems}\nSee server/.env.example`);
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  ...env,
  corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
};
