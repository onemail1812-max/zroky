import { Hatchet } from '@hatchet-dev/typescript-sdk';
import { z } from 'zod';
import { classifyIntent, generateText, IntentSchema } from '../lib/vertex';
import { recallContext, formatContextForPrompt, updateUserProfile } from '../lib/memory';

// Initialize Hatchet Client
const hatchet = Hatchet.init({
    token: process.env.HATCHET_CLIENT_TOKEN || '',
    namespace: 'zroky',
});

/**
 * Input Schema for Chief Router
 */
const ChiefRouterInput = z.object({
    userId: z.string(),
    message: z.string(),
    conversationId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

type ChiefRouterInput = z.infer<typeof ChiefRouterInput>;

/**
 * Output Schema for Chief Router
 */
const ChiefRouterOutput = z.object({
    action: z.enum(['RESPOND', 'DELEGATE', 'COORDINATE']),
    response: z.string().optional(),
    delegatedTo: z.array(z.string()).optional(),
    workflowIds: z.array(z.string()).optional(),
    confidence: z.number(),
});

type ChiefRouterOutput = z.infer<typeof ChiefRouterOutput>;

/**
 * MAIN WORKFLOW: Chief of Staff Router
 * 
 * This is the entry point for all user requests.
 * It classifies intent and either responds directly or delegates to agents.
 */
export const chiefRouterWorkflow = hatchet.workflow({
    id: 'chief-router',
    description: 'Main orchestrator that routes requests to appropriate agents',
    on: {
        event: 'user:message',
    },
    steps: [
        {
            name: 'recall-context',
            timeout: '10s',
            run: async (ctx) => {
                const input = ChiefRouterInput.parse(ctx.workflowInput());

                console.log(`[Chief Router] Recalling context for user: ${input.userId}`);

                const context = await recallContext(input.userId, input.message);

                return {
                    context,
                    formattedContext: formatContextForPrompt(context),
                };
            },
        },
        {
            name: 'classify-intent',
            timeout: '15s',
            parents: ['recall-context'],
            run: async (ctx) => {
                const input = ChiefRouterInput.parse(ctx.workflowInput());
                const { formattedContext } = ctx.stepOutput('recall-context');

                console.log(`[Chief Router] Classifying intent for: "${input.message}"`);

                const intent = await classifyIntent(input.message, input.userId);

                console.log(`[Chief Router] Intent: ${intent.action} (confidence: ${intent.confidence})`);

                return intent;
            },
        },
        {
            name: 'execute-action',
            timeout: '30s',
            parents: ['classify-intent'],
            run: async (ctx) => {
                const input = ChiefRouterInput.parse(ctx.workflowInput());
                const intent = ctx.stepOutput('classify-intent') as z.infer<typeof IntentSchema>;
                const { formattedContext } = ctx.stepOutput('recall-context');

                console.log(`[Chief Router] Executing action: ${intent.action}`);

                // RESPOND: Answer directly
                if (intent.action === 'RESPOND') {
                    const response = intent.response || await generateText(
                        'chief-of-staff',
                        `${formattedContext}\n\nUser: ${input.message}\n\nProvide a helpful, professional response.`
                    );

                    // Update user profile
                    await updateUserProfile(input.userId, {
                        query: input.message,
                        response,
                    });

                    return {
                        action: 'RESPOND',
                        response,
                        confidence: intent.confidence,
                    } as ChiefRouterOutput;
                }

                // DELEGATE: Route to specific agent
                if (intent.action === 'DELEGATE' && intent.delegateTo && intent.delegateTo.length > 0) {
                    const workflowIds: string[] = [];

                    for (const agent of intent.delegateTo) {
                        const workflowName = `${agent}-workflow`;

                        console.log(`[Chief Router] Delegating to ${agent}`);

                        try {
                            const workflow = await hatchet.admin.runWorkflow(workflowName, {
                                userId: input.userId,
                                message: input.message,
                                context: formattedContext,
                                delegatedBy: 'chief-of-staff',
                            });

                            workflowIds.push(workflow.workflowRunId);
                        } catch (error) {
                            console.error(`[Chief Router] Failed to delegate to ${agent}:`, error);
                        }
                    }

                    return {
                        action: 'DELEGATE',
                        delegatedTo: intent.delegateTo,
                        workflowIds,
                        response: `I've delegated your request to ${intent.delegateTo.join(', ')}. They'll handle it shortly.`,
                        confidence: intent.confidence,
                    } as ChiefRouterOutput;
                }

                // COORDINATE: Multi-agent workflow
                if (intent.action === 'COORDINATE') {
                    // For now, return a placeholder
                    // TODO: Implement coordination logic
                    return {
                        action: 'COORDINATE',
                        response: 'This requires coordination between multiple team members. I\'m working on it.',
                        confidence: intent.confidence,
                    } as ChiefRouterOutput;
                }

                // Fallback
                return {
                    action: 'RESPOND',
                    response: 'I\'m not sure how to handle that request. Could you rephrase it?',
                    confidence: 0.5,
                } as ChiefRouterOutput;
            },
        },
    ],
});

/**
 * Register the workflow with Hatchet
 */
export async function registerChiefRouter() {
    try {
        await hatchet.worker.registerWorkflow(chiefRouterWorkflow);
        console.log('[Chief Router] Workflow registered successfully');
    } catch (error) {
        console.error('[Chief Router] Failed to register workflow:', error);
        throw error;
    }
}

/**
 * Trigger the Chief Router workflow
 */
export async function triggerChiefRouter(input: ChiefRouterInput): Promise<string> {
    try {
        const workflow = await hatchet.admin.runWorkflow('chief-router', input);
        return workflow.workflowRunId;
    } catch (error) {
        console.error('[Chief Router] Failed to trigger workflow:', error);
        throw error;
    }
}

/**
 * Get workflow result
 */
export async function getWorkflowResult(workflowRunId: string): Promise<ChiefRouterOutput | null> {
    try {
        const result = await hatchet.admin.getWorkflowRun(workflowRunId);

        if (result.status === 'SUCCEEDED') {
            return result.output as ChiefRouterOutput;
        }

        return null;
    } catch (error) {
        console.error('[Chief Router] Failed to get workflow result:', error);
        return null;
    }
}

export { hatchet };
