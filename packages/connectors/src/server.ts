/**
 * Aaliyah Connectors - Main Entry Point
 * 
 * Enterprise-grade unified connector platform for Email & Calendar.
 */

import 'dotenv/config';

// Startup: Verify credential presence (never log secret values)
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Redis } from 'ioredis';
import { createRoutes } from './routes/index.js';
import { requestLogger, logger } from './utils/logger.js';
import { getSyncWorker, shutdownSyncWorker } from './workers/sync.worker.js';
import { prisma } from './lib/prisma.js';
import { MockRedis } from './utils/mock-redis.js';

// ============================================
// CONFIGURATION
// ============================================

const PORT = parseInt(process.env.CONNECTOR_PORT || '3001');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ============================================
// APP INITIALIZATION
// ============================================

async function createApp() {
    const app = express();

    // Security middleware
    app.use(helmet({
        contentSecurityPolicy: false // Allow API to be called from any origin
    }));

    // CORS
    app.use(cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-user-id', 'x-correlation-id']
    }));

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use(requestLogger());

    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0'
        });
    });

    // Initialize Redis (Real or Mock)
    let redis: Redis;

    if (process.env.USE_MOCK_QUEUE === 'true') {
        // Use in-memory mock Redis
        console.warn('⚠️  Using Mock Redis (In-Memory)');
        redis = new MockRedis() as unknown as Redis;
    } else {
        // Use real Redis with lazy connect and retry strategy
        redis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            lazyConnect: true,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                if (times > 5) return null; // stop retry after 5 times
                return delay;
            }
        });

        redis.on('error', (err) => {
            // Only log once or suppress if desired
            if (process.env.NODE_ENV !== 'test') {
                console.warn('⚠️  Redis connection failed:', err.message);
            }
        });
    }

    redis.on('connect', () => {
        logger.info('Redis connected');
    });

    // API routes
    app.use('/api/v1/connectors', createRoutes(redis));

    // Webhook endpoints (public, no tenant context)
    app.post('/webhooks/google', async (req, res) => {
        try {
            const worker = getSyncWorker();
            await worker.queueWebhook('google', req.body);
            res.status(200).send();
        } catch (error) {
            logger.error({ error }, 'Failed to queue Google webhook');
            res.status(500).send();
        }
    });

    app.post('/webhooks/microsoft', async (req, res) => {
        // Microsoft requires validation
        const validationToken = req.query.validationToken;
        if (validationToken) {
            return res.status(200).send(validationToken);
        }

        try {
            const worker = getSyncWorker();
            await worker.queueWebhook('microsoft', req.body);
            res.status(202).send();
        } catch (error) {
            logger.error({ error }, 'Failed to queue Microsoft webhook');
            res.status(500).send();
        }
    });

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            type: 'https://api.aaliyah.ai/errors/not-found',
            title: 'Not Found',
            status: 404,
            detail: `Cannot ${req.method} ${req.path}`
        });
    });

    // Error handler
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        logger.error({ error: err }, 'Unhandled error');

        res.status(500).json({
            type: 'https://api.aaliyah.ai/errors/internal',
            title: 'Internal Server Error',
            status: 500,
            detail: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
        });
    });

    return { app, redis };
}

// ============================================
// SERVER STARTUP
// ============================================

async function main() {
    try {
        // Verify database connection
        try {
            await prisma.$connect();
            logger.info('Database connected');
        } catch (dbError) {
            logger.warn({ error: dbError }, 'Database connection failed - running in limited mode');
            console.warn('⚠️  Database not available. Please ensure PostgreSQL is running.');
            console.warn('   Run: docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres');
            console.warn('   Then run: npm run db:migrate');
            console.warn('');
        }

        // Create Express app
        const { app, redis } = await createApp();

        // Start sync worker
        const syncWorker = getSyncWorker();
        logger.info('Sync worker started');

        // Start server
        const server = app.listen(PORT, () => {
            logger.info({ port: PORT }, 'Connector server started');
            console.log(`\n🚀 Aaliyah Connectors running on port ${PORT}`);
            console.log(`   Health: http://localhost:${PORT}/health`);
            console.log(`   API:    http://localhost:${PORT}/api/v1/connectors\n`);
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            logger.info({ signal }, 'Shutdown signal received');

            server.close(async () => {
                logger.info('HTTP server closed');

                await shutdownSyncWorker();
                await redis.quit();
                await prisma.$disconnect();

                logger.info('Graceful shutdown complete');
                process.exit(0);
            });

            // Force exit after 30 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        logger.fatal({ error }, 'Failed to start server');
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Run if this is the main module
main();

export { createApp };
