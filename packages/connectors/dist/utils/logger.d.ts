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
export declare const logger: any;
export interface LogContext {
    correlationId?: string;
    tenantId?: string;
    userId?: string;
    accountId?: string;
    operation?: string;
    [key: string]: unknown;
}
/**
 * Create a child logger with context
 */
export declare function createLogger(context: LogContext): pino.Logger;
export interface TimingResult {
    durationMs: number;
    durationFormatted: string;
}
/**
 * Measure execution time
 */
export declare function startTimer(): () => TimingResult;
import type { Request, Response, NextFunction } from 'express';
export declare function requestLogger(): (req: Request, res: Response, next: NextFunction) => void;
export declare function generateCorrelationId(): string;
//# sourceMappingURL=logger.d.ts.map