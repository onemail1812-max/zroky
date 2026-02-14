/**
 * Logger Utility - Structured Logging with Pino
 *
 * Features:
 * - Structured JSON logging
 * - Correlation ID support
 * - PII redaction in production
 * - Performance tracking
 */
import pino from 'pino';
const isDev = process.env.NODE_ENV === 'development';
export const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    // Pretty print in development
    transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname'
            }
        }
        : undefined,
    // Base fields included in every log
    base: {
        service: 'aaliyah-connectors',
        version: process.env.npm_package_version || '1.0.0'
    },
    // Redact sensitive fields
    redact: {
        paths: [
            'accessToken',
            'refreshToken',
            'password',
            'secret',
            'authorization',
            'cookie',
            'req.headers.authorization',
            'req.headers.cookie',
            '*.accessToken',
            '*.refreshToken',
            '*.password',
            '*.secret'
        ],
        censor: '[REDACTED]'
    },
    // Format options
    formatters: {
        level: (label) => ({ level: label }),
        bindings: (bindings) => ({
            pid: bindings.pid,
            host: bindings.hostname
        })
    },
    // Timestamp format
    timestamp: pino.stdTimeFunctions.isoTime
});
/**
 * Create a child logger with context
 */
export function createLogger(context) {
    return logger.child(context);
}
/**
 * Measure execution time
 */
export function startTimer() {
    const start = process.hrtime.bigint();
    return () => {
        const end = process.hrtime.bigint();
        const durationNs = Number(end - start);
        const durationMs = Math.round(durationNs / 1_000_000);
        let durationFormatted;
        if (durationMs < 1000) {
            durationFormatted = `${durationMs}ms`;
        }
        else if (durationMs < 60000) {
            durationFormatted = `${(durationMs / 1000).toFixed(2)}s`;
        }
        else {
            durationFormatted = `${(durationMs / 60000).toFixed(2)}m`;
        }
        return { durationMs, durationFormatted };
    };
}
export function requestLogger() {
    return (req, res, next) => {
        const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
        const timer = startTimer();
        // Attach to request for use in handlers
        req.correlationId = correlationId;
        // Log request start
        const requestLog = logger.child({
            correlationId,
            method: req.method,
            path: req.path,
            query: req.query,
            ip: req.ip
        });
        requestLog.info('Request started');
        // Log response on finish
        res.on('finish', () => {
            const { durationMs, durationFormatted } = timer();
            const level = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                    : 'info';
            requestLog[level]({
                statusCode: res.statusCode,
                durationMs,
                durationFormatted
            }, 'Request completed');
        });
        // Add correlation ID to response headers
        res.setHeader('x-correlation-id', correlationId);
        next();
    };
}
// ============================================
// CORRELATION ID
// ============================================
import { nanoid } from 'nanoid';
export function generateCorrelationId() {
    return `cid_${nanoid(16)}`;
}
//# sourceMappingURL=logger.js.map