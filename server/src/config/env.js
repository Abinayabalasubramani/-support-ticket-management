const { z } = require('zod');

// Tests load .env.test (a separate schema); everything else loads .env.
// Variables already present in the environment always win.
require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  quiet: true,
});

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Signs login tokens. Anyone who knows it can forge a login, so it must be long and random.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters (generate a random one)'),
  JWT_EXPIRES_IN: z.string().default('8h'),
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

// Safety net: tests delete data, so refuse to run them against anything but the test schema.
if (env.NODE_ENV === 'test' && !/[?&]schema=test(&|$)/.test(env.DATABASE_URL)) {
  console.error('Refusing to run tests: DATABASE_URL must target the "test" schema (?schema=test).');
  process.exit(1);
}

module.exports = {
  ...env,
  corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
};
