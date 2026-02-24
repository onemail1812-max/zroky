
import { HealthServiceStatus } from "@/services/connector.service";

export interface ConnectionMessage {
    title: string;
    description: string;
    badge: "success" | "warning" | "error" | "neutral";
    ctaLabel?: string;
    ctaAction?: string; // Identifier for the action to take
}

export function getConnectionMessage(service: HealthServiceStatus, serviceName: "Email" | "Calendar"): ConnectionMessage {
    if (!service) {
        return {
            title: "Unknown Status",
            description: "Unable to determine connection health.",
            badge: "neutral"
        };
    }

    const { status, error_code, connected } = service;

    // 1. HAPPY PATH
    if (status === "OK" || (connected && error_code === "HEALTHY")) {
        return {
            title: "Morning Check Complete",
            description: "Connected. Syncing inbox and today's schedule now.",
            badge: "success",
        };
    }

    // 2. DISCONNECTED
    if (status === "NOT_CONNECTED" || error_code === "NO_TOKEN") {
        return {
            title: "Morning Check",
            description: "Email/Calendar aren't connected yet. Set them up in the Brain Hub to start syncing.",
            badge: "neutral",
            ctaLabel: "Configure in Brain",
            ctaAction: "connect"
        };
    }

    // 3. EXPIRED / REVOKED
    if (status === "EXPIRED" || status === "REVOKED" || status === "NEEDS_RECONNECT" || error_code === "REFRESH_FAILED" || error_code === "TOKEN_EXPIRED") {
        return {
            title: "Connection Lost",
            description: "Your access expired or was revoked. Re-authorize via Brain Hub to continue.",
            badge: "error",
            ctaLabel: "Go to Brain",
            ctaAction: "reconnect"
        };
    }

    // 4. SCOPE MISSING
    if (status === "SCOPE_MISSING" || error_code === "MISSING_REQUIRED_SCOPES") {
        return {
            title: "Permissions Update Needed",
            description: "I'm missing required permissions to draft/schedule. Update access to continue.",
            badge: "warning",
            ctaLabel: "Update Permissions",
            ctaAction: "update_scopes"
        };
    }

    // 5. RETRYABLE ERRORS (RATE LIMIT, NETWORK)
    if (status === "RATE_LIMIT" || status === "NETWORK_ERROR" || (status === "ERROR" && (error_code === "RATE_LIMIT_EXCEEDED" || error_code === "NETWORK_TIMEOUT"))) {
        return {
            title: "Temporary Issue",
            description: error_code === "RATE_LIMIT_EXCEEDED"
                ? "Provider limits reached. Pausing sync - try again in a few minutes."
                : "Network unstable. Retrying connection...",
            badge: "warning",
            ctaLabel: "Retry Now",
            ctaAction: "retry"
        };
    }

    // 6. GENERIC ERROR
    return {
        title: "Connection Error",
        description: `API Error: ${error_code || "Unknown"}.`,
        badge: "error",
        ctaLabel: "Retry",
        ctaAction: "retry"
    };
}
