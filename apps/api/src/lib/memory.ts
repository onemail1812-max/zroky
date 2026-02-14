import { MemoryClient } from 'mem0ai';
import axios from 'axios';

// Mem0 Client for User Preferences
const mem0Client = new MemoryClient({
    apiKey: process.env.MEM0_API_KEY || '',
});

// LightRAG API Configuration
const LIGHTRAG_API_URL = process.env.LIGHTRAG_API_URL || 'http://lightrag:8001';

/**
 * User Memory Interface
 */
export interface UserMemory {
    userId: string;
    memories: Array<{
        id: string;
        content: string;
        metadata?: Record<string, any>;
        createdAt: string;
    }>;
}

/**
 * Knowledge Graph Result
 */
export interface KnowledgeGraphResult {
    entities: Array<{
        name: string;
        type: string;
        properties: Record<string, any>;
    }>;
    relationships: Array<{
        source: string;
        target: string;
        type: string;
    }>;
    context: string;
}

/**
 * Merged Context
 */
export interface MergedContext {
    userPreferences: string[];
    companyKnowledge: string;
    entities: string[];
    relevanceScore: number;
}

/**
 * Store user memory in Mem0
 */
export async function storeUserMemory(
    userId: string,
    content: string,
    metadata?: Record<string, any>
): Promise<void> {
    try {
        await mem0Client.add({
            messages: [{ role: 'user', content }],
            userId,
            metadata,
        });
    } catch (error) {
        console.error('[Mem0 Error] Failed to store memory:', error);
        throw error;
    }
}

/**
 * Retrieve user memories from Mem0
 */
export async function getUserMemories(userId: string, query?: string): Promise<UserMemory> {
    try {
        const memories = await mem0Client.search({
            query: query || '',
            userId,
            limit: 10,
        });

        return {
            userId,
            memories: memories.map((m: any) => ({
                id: m.id,
                content: m.memory || m.content,
                metadata: m.metadata,
                createdAt: m.created_at || new Date().toISOString(),
            })),
        };
    } catch (error) {
        console.error('[Mem0 Error] Failed to retrieve memories:', error);
        return { userId, memories: [] };
    }
}

/**
 * Query LightRAG Knowledge Graph
 */
export async function queryKnowledgeGraph(query: string): Promise<KnowledgeGraphResult> {
    try {
        const response = await axios.post(`${LIGHTRAG_API_URL}/query`, {
            query,
            mode: 'hybrid', // Use hybrid search (vector + graph)
            top_k: 5,
        });

        const data = response.data;

        return {
            entities: data.entities || [],
            relationships: data.relationships || [],
            context: data.context || '',
        };
    } catch (error) {
        console.error('[LightRAG Error] Failed to query knowledge graph:', error);
        return {
            entities: [],
            relationships: [],
            context: '',
        };
    }
}

/**
 * Insert document into LightRAG
 */
export async function insertKnowledge(
    content: string,
    metadata?: Record<string, any>
): Promise<void> {
    try {
        await axios.post(`${LIGHTRAG_API_URL}/insert`, {
            content,
            metadata,
        });
    } catch (error) {
        console.error('[LightRAG Error] Failed to insert knowledge:', error);
        throw error;
    }
}

/**
 * Recall context by merging Mem0 (user) + LightRAG (company)
 */
export async function recallContext(userId: string, query: string): Promise<MergedContext> {
    try {
        // Parallel fetch from both sources
        const [userMemory, knowledgeGraph] = await Promise.all([
            getUserMemories(userId, query),
            queryKnowledgeGraph(query),
        ]);

        // Extract user preferences
        const userPreferences = userMemory.memories.map((m) => m.content);

        // Extract company knowledge
        const companyKnowledge = knowledgeGraph.context;

        // Extract entities
        const entities = knowledgeGraph.entities.map((e) => e.name);

        // Calculate relevance score (simple heuristic)
        const relevanceScore = Math.min(
            (userPreferences.length * 0.3 + entities.length * 0.7) / 10,
            1.0
        );

        return {
            userPreferences,
            companyKnowledge,
            entities,
            relevanceScore,
        };
    } catch (error) {
        console.error('[Memory Error] Failed to recall context:', error);
        return {
            userPreferences: [],
            companyKnowledge: '',
            entities: [],
            relevanceScore: 0,
        };
    }
}

/**
 * Format context for LLM prompt
 */
export function formatContextForPrompt(context: MergedContext): string {
    const parts: string[] = [];

    if (context.userPreferences.length > 0) {
        parts.push('**User Preferences:**');
        parts.push(context.userPreferences.map((p) => `- ${p}`).join('\n'));
    }

    if (context.companyKnowledge) {
        parts.push('\n**Company Knowledge:**');
        parts.push(context.companyKnowledge);
    }

    if (context.entities.length > 0) {
        parts.push('\n**Relevant Entities:**');
        parts.push(context.entities.join(', '));
    }

    return parts.join('\n');
}

/**
 * Update user profile based on interaction
 */
export async function updateUserProfile(
    userId: string,
    interaction: {
        query: string;
        response: string;
        feedback?: 'positive' | 'negative';
    }
): Promise<void> {
    try {
        const memoryContent = `User asked: "${interaction.query}". ${interaction.feedback === 'positive'
                ? 'They found the response helpful.'
                : interaction.feedback === 'negative'
                    ? 'They were not satisfied with the response.'
                    : ''
            }`;

        await storeUserMemory(userId, memoryContent, {
            type: 'interaction',
            feedback: interaction.feedback,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Memory Error] Failed to update user profile:', error);
    }
}

export { mem0Client };
