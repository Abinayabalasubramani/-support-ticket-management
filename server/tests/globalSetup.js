const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOCK_FILE = path.join(__dirname, '.jest-running');

const isAlive = (pid) => {
  try {
    process.kill(pid, 0); // signal 0 only checks that the process exists
    return true;
  } catch {
    return false;
  }
};

// Every test file wipes the shared "test" schema, so two runs at once would delete each
// other's data and fail in confusing ways. Refuse to start a second run instead.
function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const pid = Number(fs.readFileSync(LOCK_FILE, 'utf8'));
    if (pid && isAlive(pid)) {
      throw new Error(`Another test run is in progress (process ${pid}). Wait for it to finish, or stop it, then try again.`);
    }
    // otherwise the lock is left over from a run that crashed: take it over
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
}

// Runs once before all test files: make sure the "test" schema has the latest tables.
module.exports = async () => {
  acquireLock();

  require('dotenv').config({ path: path.join(__dirname, '..', '.env.test'), quiet: true });

  if (!/[?&]schema=test(&|$)/.test(process.env.DATABASE_URL || '')) {
    fs.rmSync(LOCK_FILE, { force: true });
    throw new Error('DATABASE_URL in .env.test must target the "test" schema (?schema=test). See .env.test.example');
  }

  try {
    execSync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'pipe',
    });
  } catch (err) {
    fs.rmSync(LOCK_FILE, { force: true });
    throw err;
  }
};
