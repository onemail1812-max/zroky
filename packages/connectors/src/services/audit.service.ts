/**
 * Audit Service - Append-Only Logging
 * 
 * All connector actions are logged for compliance and debugging.
 * PII is redacted before storage.
 */

import { PrismaClient } from '../generated/prisma/index.js';
import { logger } from '../utils/logger.js';
import { redactPII } from '../utils/redaction.js';

// ============================================
// TYPES
// ============================================

export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'PENDING_APPROVAL';

export interface AuditEntry {
    tenantId: string;
    userId: string;
    accountId?: string;

    action: string;
    resourceType: string;
    resourceId?: string;

    correlationId: string;

    ipAddress?: string;
    userAgent?: string;

    status: AuditStatus;
    errorCode?: string;

    metadata?: Record<string, unknown>;
    durationMs?: number;
}

export interface AuditQuery {
    tenantId: string;
    userId?: string;
    accountId?: string;
    action?: string;
    resourceType?: string;
    status?: AuditStatus;

    startDate?: Date;
    endDate?: Date;

    limit?: number;
    offset?: number;
}

// ============================================
// AUDIT SERVICE CLASS
// ============================================

export class AuditService {
    private readonly prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Log an action to the audit trail
     */
    async log(entry: AuditEntry): Promise<string> {
        const logEntry = logger.child({
            correlationId: entry.correlationId,
            action: entry.action,
            operation: 'audit.log'
        });

        try {
            // Redact any PII from metadata
            const redactedMetadata = entry.metadata
                ? redactPII(entry.metadata)
                : undefined;

            const audit = await this.prisma.auditLog.create({
                data: {
                    tenantId: entry.tenantId,
                    userId: entry.userId,
                    accountId: entry.accountId,
                    action: entry.action,
                    resourceType: entry.resourceType,
                    resourceId: entry.resourceId,
                    correlationId: entry.correlationId,
                    ipAddress: entry.ipAddress,
                    userAgent: entry.userAgent ? entry.userAgent.substring(0, 500) : undefined,
                    status: entry.status,
                    errorCode: entry.errorCode,
                    metadata: redactedMetadata ? JSON.stringify(redactedMetadata) : undefined,
                    durationMs: entry.durationMs
                }
            });

            logEntry.debug({ auditId: audit.id }, 'Audit entry created');

            return audit.id;
        } catch (error) {
            // Audit logging should never fail silently
            logEntry.error({ error }, 'Failed to create audit entry');
            throw error;
        }
    }

    /**
     * Log a successful action
     */
    async logSuccess(
        entry: Omit<AuditEntry, 'status'>
    ): Promise<string> {
        return this.log({ ...entry, status: 'SUCCESS' });
    }

    /**
     * Log a failed action
     */
    async logFailure(
        entry: Omit<AuditEntry, 'status'>,
        errorCode?: string
    ): Promise<string> {
        return this.log({ ...entry, status: 'FAILURE', errorCode });
    }

    /**
     * Log an action pending approval
     */
    async logPendingApproval(
        entry: Omit<AuditEntry, 'status'>
    ): Promise<string> {
        return this.log({ ...entry, status: 'PENDING_APPROVAL' });
    }

    /**
     * Query audit logs
     */
    async query(query: AuditQuery): Promise<{
        entries: Array<{
            id: string;
            action: string;
            resourceType: string;
            resourceId: string | null;
            status: AuditStatus;
            createdAt: Date;
            durationMs: number | null;
            metadata: unknown;
        }>;
        total: number;
    }> {
        const where = {
            tenantId: query.tenantId,
            ...(query.userId && { userId: query.userId }),
            ...(query.accountId && { accountId: query.accountId }),
            ...(query.action && { action: query.action }),
            ...(query.resourceType && { resourceType: query.resourceType }),
            ...(query.status && { status: query.status }),
            ...(query.startDate || query.endDate ? {
                createdAt: {
                    ...(query.startDate && { gte: query.startDate }),
                    ...(query.endDate && { lte: query.endDate })
                }
            } : {})
        };

        const [entries, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: query.limit || 50,
                skip: query.offset || 0,
                select: {
                    id: true,
                    action: true,
                    resourceType: true,
                    resourceId: true,
                    status: true,
                    createdAt: true,
                    durationMs: true,
                    metadata: true
                }
            }),
            this.prisma.auditLog.count({ where })
        ]);

        return {
            entries: entries.map(e => ({
                ...e,
                status: e.status as AuditStatus,
                metadata: e.metadata ? JSON.parse(e.metadata) : undefined
            })),
            total
        };
    }

    /**
     * Get a specific audit entry by ID
     */
    async getById(
        id: string,
        tenantId: string
    ): Promise<AuditEntry | null> {
        const entry = await this.prisma.auditLog.findFirst({
            where: { id, tenantId }
        });

        if (!entry) return null;

        return {
            tenantId: entry.tenantId,
            userId: entry.userId,
            accountId: entry.accountId || undefined,
            action: entry.action,
            resourceType: entry.resourceType,
            resourceId: entry.resourceId || undefined,
            correlationId: entry.correlationId,
            ipAddress: entry.ipAddress || undefined,
            userAgent: entry.userAgent || undefined,
            status: entry.status as AuditStatus,
            errorCode: entry.errorCode || undefined,
            metadata: entry.metadata ? JSON.parse(entry.metadata) : undefined,
            durationMs: entry.durationMs || undefined
        };
    }

    /**
     * Get audit entries by correlation ID
     */
    async getByCorrelationId(
        correlationId: string,
        tenantId: string
    ): Promise<AuditEntry[]> {
        const entries = await this.prisma.auditLog.findMany({
            where: { correlationId, tenantId },
            orderBy: { createdAt: 'asc' }
        });

        return entries.map(e => ({
            tenantId: e.tenantId,
            userId: e.userId,
            accountId: e.accountId || undefined,
            action: e.action,
            resourceType: e.resourceType,
            resourceId: e.resourceId || undefined,
            correlationId: e.correlationId,
            ipAddress: e.ipAddress || undefined,
            userAgent: e.userAgent || undefined,
            status: e.status as AuditStatus,
            errorCode: e.errorCode || undefined,
            metadata: e.metadata ? JSON.parse(e.metadata) : undefined,
            durationMs: e.durationMs || undefined
        }));
    }

    /**
     * Export audit logs for compliance (date range)
     */
    async export(
        tenantId: string,
        startDate: Date,
        endDate: Date
    ): Promise<AuditEntry[]> {
        const entries = await this.prisma.auditLog.findMany({
            where: {
                tenantId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        return entries.map(e => ({
            tenantId: e.tenantId,
            userId: e.userId,
            accountId: e.accountId || undefined,
            action: e.action,
            resourceType: e.resourceType,
            resourceId: e.resourceId || undefined,
            correlationId: e.correlationId,
            ipAddress: e.ipAddress || undefined,
            userAgent: e.userAgent || undefined,
            status: e.status as AuditStatus,
            errorCode: e.errorCode || undefined,
            metadata: e.metadata ? JSON.parse(e.metadata) : undefined,
            durationMs: e.durationMs || undefined
        }));
    }
}

// ============================================
// TIMING HELPER
// ============================================

export class AuditTimer {
    private readonly startTime: number;
    private readonly auditService: AuditService;
    private readonly baseEntry: Omit<AuditEntry, 'status' | 'durationMs'>;

    constructor(
        auditService: AuditService,
        entry: Omit<AuditEntry, 'status' | 'durationMs'>
    ) {
        this.startTime = Date.now();
        this.auditService = auditService;
        this.baseEntry = entry;
    }

    async success(metadata?: Record<string, unknown>): Promise<string> {
        return this.auditService.logSuccess({
            ...this.baseEntry,
            durationMs: Date.now() - this.startTime,
            metadata: { ...this.baseEntry.metadata, ...metadata }
        });
    }

    async failure(errorCode: string, metadata?: Record<string, unknown>): Promise<string> {
        return this.auditService.logFailure(
            {
                ...this.baseEntry,
                durationMs: Date.now() - this.startTime,
                metadata: { ...this.baseEntry.metadata, ...metadata }
            },
            errorCode
        );
    }
}
