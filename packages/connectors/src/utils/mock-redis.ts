import { EventEmitter } from 'events';

export class MockRedis extends EventEmitter {
    private store = new Map<string, string>();

    constructor() {
        super();
        // Simulate ready state
        setImmediate(() => {
            this.emit('connect');
            this.emit('ready');
        });
    }

    async get(key: string): Promise<string | null> {
        return this.store.get(key) || null;
    }

    async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
        this.store.set(key, value);

        // Handle basic TTL if EX arg provided (args[0] === 'EX', args[1] === seconds)
        if (args.length >= 2 && args[0] === 'EX') {
            const ttl = parseInt(args[1]);
            if (!isNaN(ttl)) {
                setTimeout(() => this.store.delete(key), ttl * 1000);
            }
        }

        return 'OK';
    }

    async setex(key: string, seconds: number, value: string): Promise<'OK'> {
        this.store.set(key, value);
        setTimeout(() => this.store.delete(key), seconds * 1000);
        return 'OK';
    }

    async del(key: string): Promise<number> {
        return this.store.delete(key) ? 1 : 0;
    }

    async quit(): Promise<'OK'> {
        return 'OK';
    }

    async pipeline() {
        return {
            exec: async () => []
        };
    }
}
