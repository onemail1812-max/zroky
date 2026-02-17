/**
 * Aaliyah Connector Service
 * 
 * Handles OAuth flows for Gmail, Outlook, Google Calendar, and Outlook Calendar.
 */

// Connector API base URL.
// Prefer env so dev/prod can swap between Python API / connector service cleanly.
const CONNECTOR_API_URL =
    process.env.NEXT_PUBLIC_CONNECTOR_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000';

export type Provider = 'google' | 'microsoft';
export type ServiceType = 'email' | 'calendar' | 'both';

export interface ConnectedAccount {
    id: string;
    provider: Provider;
    email: string;
    name?: string;
    scopes: string[];
    hasEmailAccess: boolean;
    hasCalendarAccess: boolean;
    status: 'active' | 'expired' | 'revoked';
    connectedAt: string;
    lastSyncAt?: string;
    isPrimary?: boolean;
}

export interface OAuthConfig {
    provider: Provider;
    serviceType: ServiceType;
    redirectUri?: string;
}

class ConnectorService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = CONNECTOR_API_URL;
    }

    private getAuthHeaders(): Record<string, string> {
        const token =
            localStorage.getItem('auth_token') ||
            localStorage.getItem('clerk_token') ||
            localStorage.getItem('__session') ||
            '';

        const headers: Record<string, string> = {
            'x-tenant-id': this.getTenantId(),
            'x-workspace-id': this.getTenantId(),
            'x-user-id': this.getUserId(),
        };

        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    }

    /**
     * Gets the OAuth authorization URL for the given provider
     */
    async getAuthUrl(config: OAuthConfig): Promise<{ authUrl: string; state?: string }> {
        const { provider, serviceType, redirectUri } = config;

        // Build scopes based on service type
        const scopes: string[] = [];

        if (provider === 'google') {
            if (serviceType === 'email' || serviceType === 'both') {
                scopes.push(
                    'https://www.googleapis.com/auth/gmail.readonly',
                    'https://www.googleapis.com/auth/gmail.modify',
                    'https://www.googleapis.com/auth/gmail.send'
                );
            }
            if (serviceType === 'calendar' || serviceType === 'both') {
                scopes.push(
                    'https://www.googleapis.com/auth/calendar.readonly',
                    'https://www.googleapis.com/auth/calendar.events'
                );
            }
        } else if (provider === 'microsoft') {
            if (serviceType === 'email' || serviceType === 'both') {
                scopes.push(
                    'Mail.Read',
                    'Mail.ReadWrite',
                    'Mail.Send'
                );
            }
            if (serviceType === 'calendar' || serviceType === 'both') {
                scopes.push(
                    'Calendars.Read',
                    'Calendars.ReadWrite'
                );
            }
            // Add OpenID scopes for Microsoft
            scopes.unshift('openid', 'profile', 'email', 'offline_access');
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/v1/connectors/connect/${provider}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders(),
                },
                body: JSON.stringify({
                    returnUrl: redirectUri || `${window.location.origin}/oauth/callback`,
                    scopes,
                    serviceType,
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to initiate OAuth');
            }

            const data = await response.json();
            return { authUrl: data.authUrl, state: data.state };
        } catch (error) {
            console.error('Failed to get auth URL:', error);
            throw error;
        }
    }

    /**
     * Initiates OAuth flow by opening authorization URL
     */
    /**
     * Initiates OAuth flow by redirecting the full page (Robust Flow)
     * This avoids all popup blocker, cross-origin, and opener-reference issues.
     */
    async connect(config: OAuthConfig): Promise<void> {
        // 1. Store context for the return trip
        sessionStorage.setItem('oauth_return_path', window.location.pathname);
        sessionStorage.setItem('oauth_provider', config.provider);
        sessionStorage.setItem('oauth_service_type', config.serviceType);

        const { authUrl, state } = await this.getAuthUrl(config);
        if (state) sessionStorage.setItem('oauth_state', state);

        // 2. Full Page Redirect
        console.log("Initiating robust redirect flow to:", authUrl);
        window.location.href = authUrl;

        // 3. Return a pending promise to prevent UI state updates while page unloads
        return new Promise(() => { });
    }

    /**
     * Exchange authorization code for tokens (called from callback page)
     */
    async handleCallback(code: string, state: string): Promise<{ success: boolean; account?: ConnectedAccount; error?: string }> {
        const storedState = sessionStorage.getItem('oauth_state');
        if (state !== storedState) {
            return { success: false, error: 'Invalid state parameter' };
        }

        const provider = sessionStorage.getItem('oauth_provider') as Provider;
        const serviceType = sessionStorage.getItem('oauth_service_type') as ServiceType;

        try {
            const response = await fetch(`${this.baseUrl}/api/v1/connectors/oauth/${provider}/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders(),
                },
                body: JSON.stringify({
                    code,
                    redirectUri: `${window.location.origin}/oauth/callback`,
                    serviceType
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.detail || 'OAuth failed' };
            }

            const account = await response.json();

            sessionStorage.removeItem('oauth_state');
            sessionStorage.removeItem('oauth_provider');
            sessionStorage.removeItem('oauth_service_type');

            return { success: true, account };
        } catch (error) {
            console.error('OAuth callback error:', error);
            return { success: false, error: 'Failed to complete OAuth' };
        }
    }

    /**
     * List connected accounts
     */
    async listAccounts(): Promise<ConnectedAccount[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/connectors/accounts`, {
                headers: this.getAuthHeaders(),
                cache: 'no-store'
            });

            if (response.status === 401) {
                console.warn("Auth token invalid (401), clearing and retrying accounts fetch...");
                localStorage.removeItem('auth_token');
                localStorage.removeItem('clerk_token');
                localStorage.removeItem('__session');

                // Retry once without token
                const retry = await fetch(`${this.baseUrl}/api/v1/connectors/accounts`, {
                    headers: this.getAuthHeaders(),
                    cache: 'no-store'
                });
                if (retry.ok) {
                    const data = await retry.json();
                    return Array.isArray(data) ? data : (data.accounts || []);
                }
            }

            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            return Array.isArray(data) ? data : (data.accounts || []);
        } catch (error) {
            console.error('Failed to list accounts:', error);
            return [];
        }
    }

    /**
     * Revoke a connected account
     */
    async revokeAccount(accountId: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/connectors/accounts/${accountId}/revoke`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            return response.ok;
        } catch (error) {
            console.error('Failed to revoke account:', error);
            return false;
        }
    }

    /**
     * Check if a specific service is connected
     */
    async isConnected(provider: Provider, serviceType: ServiceType): Promise<boolean> {
        const accounts = await this.listAccounts();
        return accounts.some(account => {
            if (account.provider !== provider || account.status !== 'active') return false;
            if (serviceType === 'email') return account.hasEmailAccess;
            if (serviceType === 'calendar') return account.hasCalendarAccess;
            return account.hasEmailAccess && account.hasCalendarAccess;
        });
    }

    private getTenantId(): string {
        return localStorage.getItem('tenant_id') || 'default';
    }

    /**
     * Set a provider as primary for email
     */
    async setPrimaryAccount(provider: 'google' | 'microsoft' | 'none'): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/connectors/primary/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({ provider })
            });

            if (!response.ok) {
                console.error("Failed to set primary:", await response.text());
                return false;
            }
            return true;
        } catch (error) {
            console.error('Failed to set primary account:', error);
            return false;
        }
    }

    private getUserId(): string {
        return localStorage.getItem('user_id') || 'default';
    }
}

// Export singleton instance
export const connectorService = new ConnectorService();

// Export hook for React components
export function useConnector() {
    return connectorService;
}
