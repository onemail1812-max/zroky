import { registerChiefRouter } from '../workflows/chief-router';
import { registerRicoWorkflow } from '../workflows/agents/rico-sales';

/**
 * Main Hatchet Worker Entry Point
 * 
 * Registers all workflows and starts the worker
 */
async function main() {
    console.log('[Worker] Starting Hatchet worker...');

    try {
        // Register all workflows
        await Promise.all([
            registerChiefRouter(),
            registerRicoWorkflow(),
            // Add more agent workflows here
        ]);

        console.log('[Worker] All workflows registered successfully');
        console.log('[Worker] Worker is ready to process jobs');

        // Keep the process alive
        process.on('SIGINT', () => {
            console.log('[Worker] Shutting down gracefully...');
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('[Worker] Shutting down gracefully...');
            process.exit(0);
        });
    } catch (error) {
        console.error('[Worker] Fatal error:', error);
        process.exit(1);
    }
}

main();
