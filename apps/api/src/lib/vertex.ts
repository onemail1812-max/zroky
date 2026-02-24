import { VertexAI, GenerativeModel, Content, Part } from '@google-cloud/vertexai';
import { z } from 'zod';

// Agent Model Configuration
const AGENT_MODELS = {
    'chief-of-staff': 'gemini-2.0-flash-thinking-exp-01-21',
    'aaliyah': 'gemini-2.0-flash-exp',
    'perry': 'claude-3-5-sonnet-20241022', // Via proxy
    'shlok': 'gemini-2.0-flash-exp',
    'david': 'gemini-2.0-flash-exp',
    'megan': 'gemini-2.0-flash-exp',
    'reya': 'gemini-1.5-pro-002',
    'rico': 'gemini-2.0-flash-exp',
} as const;

type AgentName = keyof typeof AGENT_MODELS;

// Initialize Vertex AI
const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id';
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

const vertexAI = new VertexAI({
    project: projectId,
    location: location,
});

// Context Caching Configuration for Chief of Staff
const CHIEF_SYSTEM_PROMPT = `You are the Executive Assistant for an enterprise AI operating system called "Zroky".

Your role is to:
1. Understand user requests and classify intent
2. Delegate tasks to specialized AI employees
3. Coordinate multi-step workflows
4. Ensure quality and consistency

Available AI Employees:
- Aaliyah (Ops/EA): Email drafting, calendar management, task coordination
- Perry (Recruiter): LinkedIn research, resume review, candidate screening
- Shlok (Social Media): Content creation, trend analysis, social engagement
- David (SEO): Content writing, SEO optimization, blog posts
- Megan (Receptionist): Voice handling, inbound queries, call routing
- Reya (Legal): Contract review, compliance checks, legal research
- Rico (Sales): Outreach, lead generation, CRM management

Decision Framework:
- RESPOND: Answer directly if it's a simple query or status check
- DELEGATE: Route to specific employee if it requires specialized work
- COORDINATE: Orchestrate multiple employees for complex workflows

Always be professional, efficient, and context-aware.`;

/**
 * Get the appropriate Gemini model for an agent
 */
export function getAgentModel(agentName: AgentName): GenerativeModel {
    const modelName = AGENT_MODELS[agentName];

    // Special handling for Chief of Staff with context caching
    if (agentName === 'chief-of-staff') {
        return vertexAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            },
            systemInstruction: {
                role: 'system',
                parts: [{ text: CHIEF_SYSTEM_PROMPT }],
            },
            // Enable context caching for system prompt
            cachedContent: {
                model: modelName,
                systemInstruction: {
                    role: 'system',
                    parts: [{ text: CHIEF_SYSTEM_PROMPT }],
                },
                ttl: '3600s', // Cache for 1 hour
            },
        });
    }

    // Standard configuration for other agents
    return vertexAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 4096,
        },
    });
}

/**
 * Generate structured output using Zod schema
 */
export async function generateStructured<T>(
    agentName: AgentName,
    prompt: string,
    schema: z.ZodType<T>,
    context?: Content[]
): Promise<T> {
    const model = getAgentModel(agentName);

    try {
        const chat = model.startChat({
            history: context || [],
        });

        const result = await chat.sendMessage([
            {
                text: `${prompt}\n\nRespond with valid JSON matching this schema:\n${JSON.stringify(schema.shape, null, 2)}`,
            },
        ]);

        const response = result.response;
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        // Extract JSON from markdown code blocks if present
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        const jsonText = jsonMatch ? jsonMatch[1] : text;

        const parsed = JSON.parse(jsonText);
        return schema.parse(parsed);
    } catch (error) {
        console.error(`[Vertex AI Error] Agent: ${agentName}`, error);
        throw new Error(`Failed to generate structured output: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generate streaming response
 */
export async function generateStream(
    agentName: AgentName,
    prompt: string,
    context?: Content[]
): Promise<AsyncGenerator<string>> {
    const model = getAgentModel(agentName);

    try {
        const chat = model.startChat({
            history: context || [],
        });

        const result = await chat.sendMessageStream([{ text: prompt }]);

        async function* streamGenerator() {
            for await (const chunk of result.stream) {
                const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    yield text;
                }
            }
        }

        return streamGenerator();
    } catch (error) {
        console.error(`[Vertex AI Stream Error] Agent: ${agentName}`, error);
        throw new Error(`Failed to generate stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Simple text generation
 */
export async function generateText(
    agentName: AgentName,
    prompt: string,
    context?: Content[]
): Promise<string> {
    const model = getAgentModel(agentName);

    try {
        const chat = model.startChat({
            history: context || [],
        });

        const result = await chat.sendMessage([{ text: prompt }]);
        return result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
        console.error(`[Vertex AI Error] Agent: ${agentName}`, error);

        // Fallback error message
        return `I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.`;
    }
}

/**
 * Intent Classification Schema
 */
export const IntentSchema = z.object({
    action: z.enum(['RESPOND', 'DELEGATE', 'COORDINATE']),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    delegateTo: z.array(z.enum(['aaliyah', 'perry', 'shlok', 'david', 'megan', 'reya', 'rico'])).optional(),
    response: z.string().optional(),
});

export type Intent = z.infer<typeof IntentSchema>;

/**
 * Classify user intent using Chief of Staff
 */
export async function classifyIntent(userMessage: string, userId: string): Promise<Intent> {
    const prompt = `Analyze this user request and determine the appropriate action:

User Message: "${userMessage}"

Consider:
1. Is this a simple question I can answer directly? (RESPOND)
2. Does this require a specific employee's expertise? (DELEGATE)
3. Does this need multiple employees working together? (COORDINATE)

Provide your classification with reasoning.`;

    return generateStructured('chief-of-staff', prompt, IntentSchema);
}

export { AGENT_MODELS, type AgentName };
