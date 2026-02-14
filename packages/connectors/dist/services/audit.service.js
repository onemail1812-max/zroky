/**
 * Audit Service - Append-Only Logging
 *
 * All connector actions are logged for compliance and debugging.
 * PII is redacted before storage.
 */
import { logger } from '../utils/logger.js';
import { redactPII } from '../utils/redaction.js';
// ============================================
// AUDIT SERVICE CLASS
// ============================================
export class AuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Log an action to the audit trail
     */
    async log(entry) {
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
                    metadata: redactedMetadata,
                    durationMs: entry.durationMs
                }
            });
            logEntry.debug({ auditId: audit.id }, 'Audit entry created');
            return audit.id;
        }
        catch (error) {
            // Audit logging should never fail silently
            logEntry.error({ error }, 'Failed to create audit entry');
            throw error;
        }
    }
    /**
     * Log a successful action
     */
    async logSuccess(entry) {
        return this.log({ ...entry, status: 'SUCCESS' });
    }
    /**
     * Log a failed action
     */
    async logFailure(entry, errorCode) {
        return this.log({ ...entry, status: 'FAILURE', errorCode });
    }
    /**
     * Log an action pending approval
     */
    async logPendingApproval(entry) {
        return this.log({ ...entry, status: 'PENDING_APPROVAL' });
    }
    /**
     * Query audit logs
     */
    async query(query) {
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
        return { entries, total };
    }
    /**
     * Get a specific audit entry by ID
     */
    async getById(id, tenantId) {
        const entry = await this.prisma.auditLog.findFirst({
            where: { id, tenantId }
        });
        if (!entry)
            return null;
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
            status: entry.status,
            errorCode: entry.errorCode || undefined,
            metadata: entry.metadata || undefined,
            durationMs: entry.durationMs || undefined
        };
    }
    /**
     * Get audit entries by correlation ID
     */
    async getByCorrelationId(correlationId, tenantId) {
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
            status: e.status,
            errorCode: e.errorCode || undefined,
            metadata: e.metadata || undefined,
            durationMs: e.durationMs || undefined
        }));
    }
    /**
     * Export audit logs for compliance (date range)
     */
    async export(tenantId, startDate, endDate) {
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
            status: e.status,
            errorCode: e.errorCode || undefined,
            metadata: e.metadata || undefined,
            durationMs: e.durationMs || undefined
        }));
    }
}
// ============================================
// TIMING HELPER
// ============================================
export class AuditTimer {
    startTime;
    auditService;
    baseEntry;
    constructor(auditService, entry) {
        this.startTime = Date.now();
        this.auditService = auditService;
        this.baseEntry = entry;
    }
    async success(metadata) {
        return this.auditService.logSuccess({
            ...this.baseEntry,
            durationMs: Date.now() - this.startTime,
            metadata: { ...this.baseEntry.metadata, ...metadata }
        });
    }
    async failure(errorCode, metadata) {
        return this.auditService.logFailure({
            ...this.baseEntry,
            durationMs: Date.now() - this.startTime,
            metadata: { ...this.baseEntry.metadata, ...metadata }
        }, errorCode);
    }
}
//# sourceMappingURL=audit.service.js.map