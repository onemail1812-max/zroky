/**
 * Approval Service - Action Gating
 *
 * High-risk actions require explicit user approval before execution.
 * This prevents AI agents from performing destructive actions without consent.
 */
import { logger } from '../utils/logger.js';
// ============================================
// RISK ASSESSMENT
// ============================================
const ACTION_RISK_LEVELS = {
    SEND_EMAIL: 'HIGH',
    DELETE_EMAIL: 'CRITICAL',
    BULK_ARCHIVE: 'HIGH',
    CREATE_EVENT: 'MEDIUM',
    UPDATE_EVENT: 'MEDIUM',
    DELETE_EVENT: 'HIGH',
    INVITE_ATTENDEES: 'MEDIUM'
};
const ACTIONS_REQUIRING_APPROVAL = [
    'SEND_EMAIL',
    'DELETE_EMAIL',
    'BULK_ARCHIVE',
    'DELETE_EVENT'
];
// ============================================
// APPROVAL SERVICE CLASS
// ============================================
export class ApprovalService {
    prisma;
    defaultExpiryMinutes = 15;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Check if an action requires approval
     */
    requiresApproval(actionType) {
        return ACTIONS_REQUIRING_APPROVAL.includes(actionType);
    }
    /**
     * Get the risk level for an action
     */
    getRiskLevel(actionType) {
        return ACTION_RISK_LEVELS[actionType] || 'MEDIUM';
    }
    /**
     * Create a pending approval request
     */
    async createApproval(request) {
        const log = logger.child({
            tenantId: request.tenantId,
            userId: request.userId,
            actionType: request.actionType,
            correlationId: request.correlationId,
            operation: 'createApproval'
        });
        const riskLevel = this.getRiskLevel(request.actionType);
        const expiresAt = new Date(Date.now() + (request.expiryMinutes || this.defaultExpiryMinutes) * 60 * 1000);
        // Sanitize payload for storage (remove any sensitive data)
        const sanitizedPayload = this.sanitizePayload(request.actionPayload);
        const approval = await this.prisma.approval.create({
            data: {
                tenantId: request.tenantId,
                userId: request.userId,
                accountId: request.accountId,
                actionType: request.actionType,
                actionPayload: sanitizedPayload,
                riskLevel,
                riskReason: this.getRiskReason(request.actionType),
                expiresAt,
                correlationId: request.correlationId
            }
        });
        log.info({ approvalId: approval.id, riskLevel }, 'Approval created');
        return {
            approvalId: approval.id,
            status: approval.status,
            expiresAt: approval.expiresAt,
            riskLevel: approval.riskLevel
        };
    }
    /**
     * Approve a pending request
     */
    async approve(approvalId, tenantId, decidedBy) {
        const log = logger.child({
            approvalId,
            tenantId,
            decidedBy,
            operation: 'approve'
        });
        const approval = await this.prisma.approval.findFirst({
            where: {
                id: approvalId,
                tenantId, // Tenant isolation
                status: 'PENDING'
            }
        });
        if (!approval) {
            log.warn('Approval not found or not pending');
            throw new Error('Approval not found or already processed');
        }
        if (new Date() > approval.expiresAt) {
            log.warn('Approval expired');
            await this.prisma.approval.update({
                where: { id: approvalId },
                data: { status: 'EXPIRED' }
            });
            throw new Error('Approval has expired');
        }
        const updated = await this.prisma.approval.update({
            where: { id: approvalId },
            data: {
                status: 'APPROVED',
                decidedAt: new Date(),
                decidedBy
            }
        });
        log.info('Approval granted');
        return {
            approvalId: updated.id,
            status: updated.status,
            expiresAt: updated.expiresAt,
            riskLevel: updated.riskLevel
        };
    }
    /**
     * Reject a pending request
     */
    async reject(approvalId, tenantId, decidedBy) {
        const log = logger.child({
            approvalId,
            tenantId,
            decidedBy,
            operation: 'reject'
        });
        const approval = await this.prisma.approval.findFirst({
            where: {
                id: approvalId,
                tenantId,
                status: 'PENDING'
            }
        });
        if (!approval) {
            throw new Error('Approval not found or already processed');
        }
        const updated = await this.prisma.approval.update({
            where: { id: approvalId },
            data: {
                status: 'REJECTED',
                decidedAt: new Date(),
                decidedBy
            }
        });
        log.info('Approval rejected');
        return {
            approvalId: updated.id,
            status: updated.status,
            expiresAt: updated.expiresAt,
            riskLevel: updated.riskLevel
        };
    }
    /**
     * Validate an approval ID before executing an action
     */
    async validateApproval(approvalId, tenantId, userId, expectedActionType) {
        const log = logger.child({
            approvalId,
            tenantId,
            expectedActionType,
            operation: 'validateApproval'
        });
        const approval = await this.prisma.approval.findFirst({
            where: {
                id: approvalId,
                tenantId,
                userId // Must be same user who requested
            }
        });
        if (!approval) {
            log.warn('Approval not found');
            return { isValid: false, error: 'Approval not found' };
        }
        if (approval.status !== 'APPROVED') {
            log.warn({ status: approval.status }, 'Approval not in approved state');
            return { isValid: false, error: `Approval is ${approval.status.toLowerCase()}` };
        }
        if (new Date() > approval.expiresAt) {
            log.warn('Approval expired');
            // Mark as expired
            await this.prisma.approval.update({
                where: { id: approvalId },
                data: { status: 'EXPIRED' }
            });
            return { isValid: false, error: 'Approval has expired' };
        }
        if (approval.actionType !== expectedActionType) {
            log.warn({
                expected: expectedActionType,
                actual: approval.actionType
            }, 'Action type mismatch');
            return { isValid: false, error: 'Approval is for a different action' };
        }
        log.info('Approval validated');
        return {
            isValid: true,
            approval: {
                id: approval.id,
                actionType: approval.actionType,
                actionPayload: approval.actionPayload
            }
        };
    }
    /**
     * Mark an approval as executed (after successful action)
     */
    async markExecuted(approvalId) {
        await this.prisma.approval.update({
            where: { id: approvalId },
            data: { status: 'EXECUTED' }
        });
    }
    /**
     * List pending approvals for a user
     */
    async listPending(tenantId, userId) {
        const approvals = await this.prisma.approval.findMany({
            where: {
                tenantId,
                userId,
                status: 'PENDING',
                expiresAt: { gt: new Date() }
            },
            orderBy: { requestedAt: 'desc' }
        });
        return approvals.map(a => ({
            approvalId: a.id,
            status: a.status,
            expiresAt: a.expiresAt,
            riskLevel: a.riskLevel
        }));
    }
    /**
     * Expire old pending approvals (run periodically)
     */
    async expireStale() {
        const result = await this.prisma.approval.updateMany({
            where: {
                status: 'PENDING',
                expiresAt: { lt: new Date() }
            },
            data: { status: 'EXPIRED' }
        });
        if (result.count > 0) {
            logger.info({ count: result.count }, 'Expired stale approvals');
        }
        return result.count;
    }
    // ==========================================
    // PRIVATE METHODS
    // ==========================================
    /**
     * Sanitize payload to remove PII before storage
     */
    sanitizePayload(payload) {
        // Create a deep copy
        const sanitized = JSON.parse(JSON.stringify(payload));
        // Redact sensitive fields
        const sensitiveFields = ['bodyText', 'bodyHtml', 'body', 'content', 'attachments'];
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                if (typeof sanitized[field] === 'string') {
                    sanitized[field] = `[REDACTED: ${sanitized[field].length} chars]`;
                }
                else {
                    sanitized[field] = '[REDACTED]';
                }
            }
        }
        return sanitized;
    }
    /**
     * Get human-readable risk reason
     */
    getRiskReason(actionType) {
        switch (actionType) {
            case 'SEND_EMAIL':
                return 'Sending emails can have external impact and cannot be undone';
            case 'DELETE_EMAIL':
                return 'Permanently deleting emails cannot be recovered';
            case 'BULK_ARCHIVE':
                return 'Bulk operations affect multiple items at once';
            case 'DELETE_EVENT':
                return 'Deleting calendar events may affect other attendees';
            case 'INVITE_ATTENDEES':
                return 'Adding attendees sends notifications to external parties';
            default:
                return 'This action may have significant impact';
        }
    }
}
//# sourceMappingURL=approval.service.js.map