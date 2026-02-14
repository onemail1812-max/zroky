/**
 * Prisma Client Singleton
 *
 * Prevents multiple Prisma client instances in development.
 */
import { PrismaClient } from '../generated/prisma/index.js';
declare global {
    var prisma: PrismaClient | undefined;
}
export declare const prisma: PrismaClient<import("../generated/prisma/index.js").Prisma.PrismaClientOptions, never, import("@/generated/prisma/runtime/library.js").DefaultArgs>;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map