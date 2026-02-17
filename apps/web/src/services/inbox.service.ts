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
    draft?: {
        id: string;
        subject: string;
        body: string;
        status: 'pending' | 'ready' | 'sent' | 'failed' | 'pending_approval';
        reasoning?: string;
    };
}

export interface InboxResponse {
    data: EmailMessage[];
    meta: {
        total: number;
        skip: number;
        limit: number;
    };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
        const res = await fetch(`${API_URL}/api/v1/inbox?filter=${filter}&provider=${provider}&limit=${limit}`, {
            headers: this.getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch inbox');
        return res.json();
    }

    async syncInbox(): Promise<void> {
        const res = await fetch(`${API_URL}/api/v1/inbox/sync`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        if (!res.ok) throw new Error('Sync failed');
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
        const res = await fetch(`${API_URL}/api/v1/inbox/counts`, {
            headers: this.getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch counts');
        return res.json();
    }
}

export const inboxService = new InboxService();
