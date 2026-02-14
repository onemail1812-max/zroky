/**
 * PII Redaction Utility
 *
 * Removes personally identifiable information from objects before logging.
 * Uses aggressive pattern matching to catch email addresses, subjects, etc.
 */
// ============================================
// CONFIGURATION
// ============================================
// Fields that contain PII and should be fully redacted
const REDACT_FIELDS = new Set([
    'password',
    'secret',
    'accessToken',
    'refreshToken',
    'access_token',
    'refresh_token',
    'authorization',
    'cookie',
    'ssn',
    'social_security',
    'creditCard',
    'credit_card',
    'apiKey',
    'api_key',
    'privateKey',
    'private_key'
]);
// Fields that should be truncated (show partial content)
const TRUNCATE_FIELDS = new Set([
    'subject',
    'snippet',
    'body',
    'bodyText',
    'bodyHtml',
    'body_text',
    'body_html',
    'content',
    'description',
    'message',
    'name',
    'displayName',
    'display_name',
    'title',
    'location'
]);
// Fields containing email addresses
const EMAIL_FIELDS = new Set([
    'email',
    'from',
    'to',
    'cc',
    'bcc',
    'sender',
    'recipient',
    'replyTo',
    'reply_to',
    'emailAddress',
    'email_address',
    'organizer',
    'attendees'
]);
// ============================================
// REDACTION FUNCTIONS
// ============================================
/**
 * Redact an email address
 * Example: john.doe@example.com -> j***e@e***.com
 */
export function redactEmail(email) {
    if (!email || typeof email !== 'string')
        return email;
    const atIndex = email.indexOf('@');
    if (atIndex === -1)
        return '***@***';
    const local = email.substring(0, atIndex);
    const domain = email.substring(atIndex + 1);
    const redactedLocal = local.length <= 2
        ? '*'.repeat(local.length)
        : `${local[0]}***${local[local.length - 1]}`;
    const dotIndex = domain.lastIndexOf('.');
    if (dotIndex === -1)
        return `${redactedLocal}@***`;
    const domainName = domain.substring(0, dotIndex);
    const tld = domain.substring(dotIndex);
    const redactedDomain = domainName.length <= 2
        ? '*'.repeat(domainName.length)
        : `${domainName[0]}***`;
    return `${redactedLocal}@${redactedDomain}${tld}`;
}
/**
 * Truncate a string and indicate length
 */
export function truncateString(str, maxLength = 20) {
    if (!str || typeof str !== 'string')
        return str;
    if (str.length <= maxLength) {
        return `[${str.length} chars]`;
    }
    return `[${str.length} chars: "${str.substring(0, maxLength)}..."]`;
}
/**
 * Deep redact an object
 */
export function redactPII(obj, depth = 0) {
    // Prevent infinite recursion
    if (depth > 10)
        return '[MAX_DEPTH]';
    // Handle null/undefined
    if (obj === null || obj === undefined)
        return obj;
    // Handle primitives
    if (typeof obj !== 'object') {
        // Check if it looks like an email
        if (typeof obj === 'string' && obj.includes('@') && obj.includes('.')) {
            return redactEmail(obj);
        }
        return obj;
    }
    // Handle arrays
    if (Array.isArray(obj)) {
        // For participant arrays, just show count
        if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
            const firstItem = obj[0];
            if ('email' in firstItem || 'address' in firstItem) {
                return `[${obj.length} participants]`;
            }
        }
        return obj.map(item => redactPII(item, depth + 1));
    }
    // Handle objects
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        // Fully redact sensitive fields
        if (REDACT_FIELDS.has(key) || REDACT_FIELDS.has(lowerKey)) {
            result[key] = '[REDACTED]';
            continue;
        }
        // Truncate content fields
        if (TRUNCATE_FIELDS.has(key) || TRUNCATE_FIELDS.has(lowerKey)) {
            if (typeof value === 'string') {
                result[key] = truncateString(value);
            }
            else {
                result[key] = '[REDACTED]';
            }
            continue;
        }
        // Redact email fields
        if (EMAIL_FIELDS.has(key) || EMAIL_FIELDS.has(lowerKey)) {
            if (typeof value === 'string') {
                result[key] = redactEmail(value);
            }
            else if (Array.isArray(value)) {
                result[key] = `[${value.length} addresses]`;
            }
            else if (typeof value === 'object' && value !== null) {
                const participant = value;
                if ('email' in participant && typeof participant.email === 'string') {
                    result[key] = { email: redactEmail(participant.email) };
                }
                else {
                    result[key] = '[REDACTED]';
                }
            }
            else {
                result[key] = value;
            }
            continue;
        }
        // Recursively redact nested objects
        result[key] = redactPII(value, depth + 1);
    }
    return result;
}
/**
 * Create a safe copy of an error for logging
 */
export function redactError(error) {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: redactPII(error.message),
            stack: error.stack?.split('\n').slice(0, 5).join('\n'),
            ...redactPII(error.details || {})
        };
    }
    if (typeof error === 'object' && error !== null) {
        return redactPII(error);
    }
    return { message: String(error) };
}
// ============================================
// VALIDATION
// ============================================
/**
 * Check if a string contains potential PII
 */
export function containsPII(str) {
    // Email pattern
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    // Phone pattern (basic)
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
    // SSN pattern
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
    return emailPattern.test(str) || phonePattern.test(str) || ssnPattern.test(str);
}
//# sourceMappingURL=redaction.js.map