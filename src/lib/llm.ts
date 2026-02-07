
export interface AIProvider {
    chat(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]): Promise<string>;
    generateProtocol(context: any): Promise<any>;
}

export class OpenAIService implements AIProvider {
    private apiKey: string;
    private baseUrl: string = 'https://api.openai.com/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async chat(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o', // Defaulting to flagship as discussed
                    messages: messages,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI API Error: ${error}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('LLM Chat Error:', error);
            throw error;
        }
    }

    async generateProtocol(context: any): Promise<any> {
        // We'll implement the specific system prompt for protocols here
        // For now, it reuses the chat primitive but with a forced JSON mode
        try {
            const systemPrompt = `
You are an expert IBD-specialized athletic coach. 
Your goal is to generate a JSON run protocol based on the user's health context.
Output MUST be valid JSON matching the TimelinePlan schema.
`;

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: JSON.stringify(context) }
                    ],
                    response_format: { type: "json_object" }, // Crucial for protocol gen
                    temperature: 0.2
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate protocol');
            }

            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error('LLM Protocol Error:', error);
            throw error;
        }
    }
}

// Singleton instance wrapper
let instance: OpenAIService | null = null;

export const getLLM = () => {
    if (!instance) {
        const key = import.meta.env.VITE_OPENAI_API_KEY;
        if (!key) {
            console.warn("Missing VITE_OPENAI_API_KEY");
            // Return a dummy or throw, depending on preference. 
            // For now, we'll allow it to instantiate but it will fail calls.
            return new OpenAIService('');
        }
        instance = new OpenAIService(key);
    }
    return instance;
};
