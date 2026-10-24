const { PORT } = require('./config/env');
const app = require('./app');
const prisma = require('./config/prisma');

const server = app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});

// Hosting platforms stop the process with SIGTERM on every deploy/restart.
// Finish in-flight requests and close the database connection instead of cutting them off.
function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
