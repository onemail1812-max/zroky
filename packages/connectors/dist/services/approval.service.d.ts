/**
 * Approval Service - Action Gating
 *
 * High-risk actions require explicit user approval before execution.
 * This prevents AI agents from performing destructive actions without consent.
 */
import { PrismaClient, ActionType, ApprovalStatus, RiskLevel } from '../generated/prisma/index.js';
export interface ApprovalRequest {
    tenantId: string;
    userId: string;
    accountId: string;
    actionType: ActionType;
    actionPayload: Record<string, unknown>;
    correlationId: string;
    expiryMinutes?: number;
}
export interface ApprovalResult {
    approvalId: string;
    status: ApprovalStatus;
    expiresAt: Date;
    riskLevel: RiskLevel;
}
export interface ApprovalValidation {
    isValid: boolean;
    error?: string;
    approval?: {
        id: string;
        actionType: ActionType;
        actionPayload: Record<string, unknown>;
    };
}
export declare class ApprovalService {
    private readonly prisma;
    private readonly defaultExpiryMinutes;
    constructor(prisma: PrismaClient);
    /**
     * Check if an action requires approval
     */
    requiresApproval(actionType: ActionType): boolean;
    /**
     * Get the risk level for an action
     */
    getRiskLevel(actionType: ActionType): RiskLevel;
    /**
     * Create a pending approval request
     */
    createApproval(request: ApprovalRequest): Promise<ApprovalResult>;
    /**
     * Approve a pending request
     */
    approve(approvalId: string, tenantId: string, decidedBy: string): Promise<ApprovalResult>;
    /**
     * Reject a pending request
     */
    reject(approvalId: string, tenantId: string, decidedBy: string): Promise<ApprovalResult>;
    /**
     * Validate an approval ID before executing an action
     */
    validateApproval(approvalId: string, tenantId: string, userId: string, expectedActionType: ActionType): Promise<ApprovalValidation>;
    /**
     * Mark an approval as executed (after successful action)
     */
    markExecuted(approvalId: string): Promise<void>;
    /**
     * List pending approvals for a user
     */
    listPending(tenantId: string, userId: string): Promise<ApprovalResult[]>;
    /**
     * Expire old pending approvals (run periodically)
     */
    expireStale(): Promise<number>;
    /**
     * Sanitize payload to remove PII before storage
     */
    private sanitizePayload;
    /**
     * Get human-readable risk reason
     */
    private getRiskReason;
}
//# sourceMappingURL=approval.service.d.ts.map