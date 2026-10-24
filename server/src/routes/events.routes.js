const { Router } = require('express');
const { subscribe } = require('../events/ticketEvents');

const router = Router();

// Proxies (and Render) close connections that stay silent for about a minute.
const HEARTBEAT_MS = 25000;

// GET /api/events: a Server-Sent Events stream. The connection stays open and the server
// writes a small message whenever a ticket changes.
router.get('/', (req, res) => {
  res.status(200).set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // tell nginx-style proxies not to buffer the stream
  });
  res.flushHeaders();

  res.write('retry: 3000\n\n'); // browser waits 3 s before reconnecting
  res.write('event: ready\ndata: {}\n\n'); // sent on every (re)connect

  const unsubscribe = subscribe((event) => {
    res.write(`id: ${event.id}\nevent: ticket\ndata: ${JSON.stringify(event)}\n\n`);
  });

  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
  heartbeat.unref();

  // The tab closed, the network dropped or the browser navigated away.
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

module.exports = router;
