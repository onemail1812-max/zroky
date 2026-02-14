/**
 * Aaliyah Connectors - Main Entry Point
 *
 * Enterprise-grade unified connector platform for Email & Calendar.
 */
declare function createApp(): Promise<{
    app: import("express-serve-static-core").Express;
    redis: any;
}>;
export { createApp };
//# sourceMappingURL=server.d.ts.map