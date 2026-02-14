/**
 * PII Redaction Utility
 *
 * Removes personally identifiable information from objects before logging.
 * Uses aggressive pattern matching to catch email addresses, subjects, etc.
 */
/**
 * Redact an email address
 * Example: john.doe@example.com -> j***e@e***.com
 */
export declare function redactEmail(email: string): string;
/**
 * Truncate a string and indicate length
 */
export declare function truncateString(str: string, maxLength?: number): string;
/**
 * Deep redact an object
 */
export declare function redactPII(obj: unknown, depth?: number): unknown;
/**
 * Create a safe copy of an error for logging
 */
export declare function redactError(error: unknown): Record<string, unknown>;
/**
 * Check if a string contains potential PII
 */
export declare function containsPII(str: string): boolean;
//# sourceMappingURL=redaction.d.ts.map