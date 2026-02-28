export interface EmailMessage {
    id: string;
    provider: 'google' | 'microsoft';
    subject: string;
    sender: { name: string; email: string };
    snippet: string;
    bodyCleaned: string; // The "read" view for user/LLM
    receivedAt: string;
    isRead: boolean;
    isPrimaryAccount: boolean;
    labels: string[];
    needsClarity?: boolean; // Added for Intelligence Workflow
    canDraft?: boolean;     // Added for Intelligence Workflow
    draft?: {
        id: string;
        subject: string;
        body: string;
        status: 'pending' | 'ready' | 'sent' | 'failed' | 'pending_approval';
        reasoning?: string;
        risk_labels?: string[];
        sources_used?: string[];
        tone_tags?: string[];
    };
    attachments?: {
        id: string;
        filename: string;
        mimeType: string;
        size: number;
        url?: string;
    }[];
}

export interface InboxResponse {
    data: EmailMessage[];
    meta: {
        total: number;
        skip: number;
        limit: number;
    };
}

// Use empty string to route through Next.js proxy (avoids CORS).
const API_URL = '';

export class InboxService {
    private getHeaders() {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('__session') || '';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-workspace-id': localStorage.getItem('tenant_id') || 'default',
        };
    }

    async getInbox(filter: string = 'all', provider: string = 'all', limit: number = 20): Promise<InboxResponse> {
        const params = new URLSearchParams({
            limit: String(limit),
            provider: provider === 'all' ? 'all' : provider,
        });

        if (filter && filter !== 'all') {
            params.append('queue', filter);
        }

        const res = await fetch(`${API_URL}/api/v1/inbox/threads?${params.toString()}`, {
            headers: this.getHeaders(),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Fetch inbox failed:', res.status, errorText);
            throw new Error(`Failed to fetch inbox: ${res.status}`);
        }

        const data = await res.json();

        // Map backend response to frontend interface
        const items = (data.items || []).map((item: any) => {
            // Parse sender "Name <email>" or "email" — handle null/undefined sender
            let name = item.sender || '(Unknown)';
            let email = item.sender || '';

            if (item.sender) {
                const senderMatch = item.sender.match(/^(.*?) <(.*?)>$/);
                if (senderMatch) {
                    name = senderMatch[1].replace(/^"|"$/g, '');
                    email = senderMatch[2];
                } else if (item.sender.includes('@')) {
                    name = item.sender.split('@')[0];
                }
            }

            // Map priority to labels
            const labels = [];
            if (item.priority?.toLowerCase() === 'high' || item.priority?.toLowerCase() === 'urgent') labels.push('priority');
            if (item.category) labels.push(item.category);

            return {
                id: item.id,
                provider: item.provider,
                subject: item.subject,
                sender: { name, email },
                snippet: item.snippet,
                bodyCleaned: item.draft_preview || item.snippet,
                receivedAt: item.received_at || new Date().toISOString(),
                isRead: item.is_read,
                isPrimaryAccount: true, // simplified assumption
                labels: labels,
                needsClarity: item.needs_clarity || false,
                canDraft: item.can_draft || false,
                draft: item.draft ? {
                    id: 'draft-' + item.id,
                    subject: item.draft.subject || item.subject,
                    body: item.draft.body || '',
                    status: 'ready', // valid assumption if draft exists
                    reasoning: item.draft.rationale || item.reasoning,
                    intent: item.draft.intent,
                    risk_labels: item.draft.risk_labels,
                    sources_used: item.draft.sources_used,
                    tone_tags: item.draft.tone_tags
                } : undefined,
                attachments: item.attachments || []
            };
        });

        return {
            data: items,
            meta: {
                total: data.count || 0,
                skip: 0,
                limit: limit
            }
        };
    }

    async syncInbox(): Promise<void> {
        const res = await fetch(`${API_URL}/api/v1/inbox/sync`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        if (!res.ok) throw new Error('Sync failed');
    }

    async archiveEmail(messageId: string): Promise<void> {
        const res = await fetch(`${API_URL}/api/v1/inbox/${messageId}/archive`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to archive email');
    }

    async deleteEmail(messageId: string): Promise<void> {
        const res = await fetch(`${API_URL}/api/v1/inbox/${messageId}/trash`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to delete email');
    }

    async getEmailBody(messageId: string): Promise<string> {
        const res = await fetch(`${API_URL}/api/v1/inbox/${messageId}/body`, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            // Don't throw — fall back to snippet gracefully
            console.warn(`Body fetch failed for ${messageId}: ${res.status}`);
            return '';
        }
        const data = await res.json();
        return data.body || '';
    }

    async getSummary(emailId: string): Promise<string[]> {
        const res = await fetch(`${API_URL}/api/v1/inbox/${emailId}/summary`, {
            headers: this.getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch summary');
        const data = await res.json();
        return data.summary || [];
    }

    async checkProviders(): Promise<Record<string, string>> {
        const res = await fetch(`${API_URL}/health/providers`, {
            headers: this.getHeaders(),
        });
        if (!res.ok) throw new Error('Health check failed');
        const data = await res.json();
        return data.providers || {};
    }

    async getCounts(): Promise<Record<string, number>> {
        try {
            const res = await fetch(`${API_URL}/api/v1/inbox/counts`, {
                headers: this.getHeaders(),
            });
            if (!res.ok) return { priority: 0, fyi: 0, needs_reply: 0, total: 0 };
            return res.json();
        } catch {
            return { priority: 0, fyi: 0, needs_reply: 0, total: 0 };
        }
    }
}

export const inboxService = new InboxService();
