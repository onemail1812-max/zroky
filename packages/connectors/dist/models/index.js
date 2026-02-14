/**
 * Aaliyah Connector Platform - Provider Agnostic Models
 *
 * These models represent the unified data structures returned by all providers.
 * They abstract away provider-specific differences.
 */
export class ConnectorApiError extends Error {
    code;
    statusCode;
    retryable;
    details;
    constructor(code, message, statusCode = 500, retryable = false, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.retryable = retryable;
        this.details = details;
        this.name = 'ConnectorApiError';
    }
}
//# sourceMappingURL=index.js.map