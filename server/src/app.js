const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { corsOrigins, NODE_ENV } = require('./config/env');
const prisma = require('./config/prisma');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');
const { createLimiters } = require('./middleware/rateLimiter');

const app = express();

// Render (like most hosts) puts a proxy in front of the app. Trusting one hop makes req.ip
// the real client, which the rate limiter needs.
app.set('trust proxy', 1);

app.use(requestId);
// Security headers (no X-Powered-By, nosniff, frame protection, ...). This is an API that
// browsers call from another origin, so its responses must stay readable cross-origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// The browser may only read X-Request-Id if the server exposes it.
app.use(cors({ origin: corsOrigins, exposedHeaders: ['X-Request-Id'] }));
app.use(express.json());

// Liveness + database connectivity. Also used by the uptime pinger, so it is not rate limited.
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

// Automated tests make hundreds of rapid requests, and the live event stream is one long
// request: neither should be counted.
const { general, writes } = createLimiters({ skip: (req) => NODE_ENV === 'test' || req.path === '/events' });
app.use('/api', general, writes, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
