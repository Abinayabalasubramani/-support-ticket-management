const path = require('path');
const { execSync } = require('child_process');

// Runs once before all test files: make sure the "test" schema has the latest tables.
module.exports = async () => {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.test'), quiet: true });

  if (!/[?&]schema=test(&|$)/.test(process.env.DATABASE_URL || '')) {
    throw new Error('DATABASE_URL in .env.test must target the "test" schema (?schema=test). See .env.test.example');
  }

  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'pipe',
  });
};
