/**
 * Prisma Client Singleton
 *
 * Prevents multiple Prisma client instances in development.
 */
import { PrismaClient } from '../generated/prisma/index.js';
export const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
        db: {
            url: process.env.CONNECTORS_DATABASE_URL || process.env.DATABASE_URL
        }
    }
});
if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}
export default prisma;
//# sourceMappingURL=prisma.js.map