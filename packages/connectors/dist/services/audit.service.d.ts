/**
 * Audit Service - Append-Only Logging
 *
 * All connector actions are logged for compliance and debugging.
 * PII is redacted before storage.
 */
import { PrismaClient, AuditStatus } from '../generated/prisma/index.js';
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
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    /**
     * Log an action to the audit trail
     */
    log(entry: AuditEntry): Promise<string>;
    /**
     * Log a successful action
     */
    logSuccess(entry: Omit<AuditEntry, 'status'>): Promise<string>;
    /**
     * Log a failed action
     */
    logFailure(entry: Omit<AuditEntry, 'status'>, errorCode?: string): Promise<string>;
    /**
     * Log an action pending approval
     */
    logPendingApproval(entry: Omit<AuditEntry, 'status'>): Promise<string>;
    /**
     * Query audit logs
     */
    query(query: AuditQuery): Promise<{
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
    }>;
    /**
     * Get a specific audit entry by ID
     */
    getById(id: string, tenantId: string): Promise<AuditEntry | null>;
    /**
     * Get audit entries by correlation ID
     */
    getByCorrelationId(correlationId: string, tenantId: string): Promise<AuditEntry[]>;
    /**
     * Export audit logs for compliance (date range)
     */
    export(tenantId: string, startDate: Date, endDate: Date): Promise<AuditEntry[]>;
}
export declare class AuditTimer {
    private readonly startTime;
    private readonly auditService;
    private readonly baseEntry;
    constructor(auditService: AuditService, entry: Omit<AuditEntry, 'status' | 'durationMs'>);
    success(metadata?: Record<string, unknown>): Promise<string>;
    failure(errorCode: string, metadata?: Record<string, unknown>): Promise<string>;
}
//# sourceMappingURL=audit.service.d.ts.map