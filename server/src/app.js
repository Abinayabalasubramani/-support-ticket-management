const express = require('express');
const cors = require('cors');
const { corsOrigins } = require('./config/env');
const prisma = require('./config/prisma');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');

const app = express();

app.use(requestId);
// The browser may only read X-Request-Id if the server exposes it.
app.use(cors({ origin: corsOrigins, exposedHeaders: ['X-Request-Id'] }));
app.use(express.json());

// Liveness + database connectivity. Also used by the uptime pinger.
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
