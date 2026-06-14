/**
 * Aura-Gateway — API Entry Point.
 * Telegram webhook handler, auth, rate limiting, forwarding to Brain.
 * Gateway is the ONLY service that sends messages to Telegram.
 */

'use strict';

const express = require('express');
const cors = require('cors');
const { createLogger } = require('@aura/shared-logger');
const { loadGatewayConfig } = require('@aura/shared-config');

const telegramRoute = require('./routes/telegram');
const replyRoute = require('./routes/reply');
const healthRoute = require('./routes/health');
const servicesRoute = require('./routes/services');

const logger = createLogger('gateway');

async function main() {
  try {
    const config = loadGatewayConfig();
    const app = express();

    app.use(cors());
    app.use(express.json());

    // Attach config and logger
    app.locals.config = config;
    app.locals.logger = logger;

    // ─── Routes ───
    app.get('/', (req, res) => {
      res.json({ status: 'ok', service: 'aura-gateway', version: '1.0.0' });
    });

    app.use('/telegram', telegramRoute);
    app.use('/telegram/reply', replyRoute);
    app.use('/health', healthRoute);
    app.use('/services', servicesRoute);

    // ─── Start server ───
    app.listen(config.port, '0.0.0.0', () => {
      logger.info({ port: config.port }, `Aura-Gateway started on port ${config.port}`);
    });

  } catch (error) {
    logger.fatal({ error: error.message }, 'Gateway failed to start');
    process.exit(1);
  }
}

main();
