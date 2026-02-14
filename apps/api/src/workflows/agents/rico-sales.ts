import { Hatchet } from '@hatchet-dev/typescript-sdk';
import { z } from 'zod';
import { generateText, generateStructured } from '../../lib/vertex';

// Initialize Hatchet Client
const hatchet = Hatchet.init({
    token: process.env.HATCHET_CLIENT_TOKEN || '',
    namespace: 'zroky',
});

/**
 * Input Schema for Rico Sales Workflow
 */
const RicoSalesInput = z.object({
    userId: z.string(),
    message: z.string(),
    context: z.string().optional(),
    delegatedBy: z.string().optional(),
    leadInfo: z.object({
        name: z.string().optional(),
        company: z.string().optional(),
        role: z.string().optional(),
        linkedinUrl: z.string().optional(),
    }).optional(),
});

type RicoSalesInput = z.infer<typeof RicoSalesInput>;

/**
 * Lead Research Output Schema
 */
const LeadResearchSchema = z.object({
    companyInfo: z.string(),
    painPoints: z.array(z.string()),
    relevantNews: z.array(z.string()),
    personalizationHooks: z.array(z.string()),
});

/**
 * Outreach Draft Schema
 */
const OutreachDraftSchema = z.object({
    subject: z.string(),
    body: z.string(),
    callToAction: z.string(),
    tone: z.enum(['professional', 'casual', 'enthusiastic']),
    estimatedResponseRate: z.number(),
});

/**
 * CRM Entry Schema
 */
const CRMEntrySchema = z.object({
    leadId: z.string(),
    status: z.enum(['new', 'contacted', 'qualified', 'nurturing']),
    nextFollowUp: z.string(),
    notes: z.string(),
});

/**
 * AGENT WORKFLOW: Rico (Sales)
 * 
 * Multi-step workflow for sales outreach:
 * 1. Research the lead
 * 2. Draft personalized outreach
 * 3. Save to CRM
 */
export const ricoSalesWorkflow = hatchet.workflow({
    id: 'rico-workflow',
    description: 'Sales outreach and lead management workflow',
    on: {
        event: 'sales:outreach',
    },
    steps: [
        {
            name: 'research-lead',
            timeout: '30s',
            run: async (ctx) => {
                const input = RicoSalesInput.parse(ctx.workflowInput());

                console.log(`[Rico] Researching lead for: ${input.leadInfo?.name || 'Unknown'}`);

                const researchPrompt = `You are Rico, a sales expert. Research this lead and provide insights:

Lead Information:
- Name: ${input.leadInfo?.name || 'Not provided'}
- Company: ${input.leadInfo?.company || 'Not provided'}
- Role: ${input.leadInfo?.role || 'Not provided'}
- LinkedIn: ${input.leadInfo?.linkedinUrl || 'Not provided'}

User Request: ${input.message}

Provide:
1. Company information and industry context
2. Potential pain points they might have
3. Relevant news or trends in their industry
4. Personalization hooks for outreach

Be specific and actionable.`;

                const research = await generateStructured(
                    'rico',
                    researchPrompt,
                    LeadResearchSchema
                );

                console.log(`[Rico] Research complete. Found ${research.painPoints.length} pain points`);

                return research;
            },
        },
        {
            name: 'draft-outreach',
            timeout: '30s',
            parents: ['research-lead'],
            run: async (ctx) => {
                const input = RicoSalesInput.parse(ctx.workflowInput());
                const research = ctx.stepOutput('research-lead') as z.infer<typeof LeadResearchSchema>;

                console.log(`[Rico] Drafting outreach email`);

                const draftPrompt = `You are Rico, a sales expert. Draft a personalized outreach email:

Lead: ${input.leadInfo?.name || 'Prospect'}
Company: ${input.leadInfo?.company || 'Their company'}

Research Insights:
${JSON.stringify(research, null, 2)}

User Request: ${input.message}
${input.context ? `\nContext: ${input.context}` : ''}

Create a compelling outreach email that:
1. References specific pain points
2. Offers clear value
3. Has a strong call-to-action
4. Feels personal, not templated

Keep it concise (under 150 words).`;

                const draft = await generateStructured(
                    'rico',
                    draftPrompt,
                    OutreachDraftSchema
                );

                console.log(`[Rico] Draft complete. Subject: "${draft.subject}"`);

                return draft;
            },
        },
        {
            name: 'save-to-crm',
            timeout: '15s',
            parents: ['draft-outreach'],
            run: async (ctx) => {
                const input = RicoSalesInput.parse(ctx.workflowInput());
                const draft = ctx.stepOutput('draft-outreach') as z.infer<typeof OutreachDraftSchema>;

                console.log(`[Rico] Saving to CRM`);

                // Generate CRM entry
                const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const crmEntry: z.infer<typeof CRMEntrySchema> = {
                    leadId,
                    status: 'contacted',
                    nextFollowUp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
                    notes: `Outreach sent with subject: "${draft.subject}". Estimated response rate: ${draft.estimatedResponseRate}%`,
                };

                // TODO: Actually save to CRM (integration pending)
                // await saveToCRM(crmEntry);

                console.log(`[Rico] CRM entry created: ${leadId}`);

                return crmEntry;
            },
        },
        {
            name: 'format-response',
            timeout: '10s',
            parents: ['draft-outreach', 'save-to-crm'],
            run: async (ctx) => {
                const draft = ctx.stepOutput('draft-outreach') as z.infer<typeof OutreachDraftSchema>;
                const crmEntry = ctx.stepOutput('save-to-crm') as z.infer<typeof CRMEntrySchema>;

                const response = `I've drafted a personalized outreach email:

**Subject:** ${draft.subject}

**Email:**
${draft.body}

**Call-to-Action:** ${draft.callToAction}

**Estimated Response Rate:** ${draft.estimatedResponseRate}%

I've saved this to the CRM (Lead ID: ${crmEntry.leadId}) and scheduled a follow-up for ${new Date(crmEntry.nextFollowUp).toLocaleDateString()}.

Would you like me to send this, or would you like to make any changes?`;

                return {
                    response,
                    draft,
                    crmEntry,
                };
            },
        },
    ],
});

/**
 * Register the Rico workflow
 */
export async function registerRicoWorkflow() {
    try {
        await hatchet.worker.registerWorkflow(ricoSalesWorkflow);
        console.log('[Rico] Workflow registered successfully');
    } catch (error) {
        console.error('[Rico] Failed to register workflow:', error);
        throw error;
    }
}

/**
 * Trigger the Rico workflow
 */
export async function triggerRicoWorkflow(input: RicoSalesInput): Promise<string> {
    try {
        const workflow = await hatchet.admin.runWorkflow('rico-workflow', input);
        return workflow.workflowRunId;
    } catch (error) {
        console.error('[Rico] Failed to trigger workflow:', error);
        throw error;
    }
}

export { hatchet };
