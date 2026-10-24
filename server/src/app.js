const express = require('express');
const cors = require('cors');
const { corsOrigins } = require('./config/env');
const prisma = require('./config/prisma');

const app = express();

app.use(cors({ origin: corsOrigins }));
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

module.exports = app;
