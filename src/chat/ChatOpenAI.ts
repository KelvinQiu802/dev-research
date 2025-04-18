import OpenAI from 'openai';
import { BaseChat, ToolCall } from './BaseChat';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logLLMOutput } from '../utils/logger';

export interface ChatOpenAIOptions {
    apiKey: string;
    baseURL: string;
    model: string;
    mcpTools: Tool[];
    systemPrompt?: string;
}

export class ChatOpenAI extends BaseChat<OpenAI.ChatCompletionMessageParam> {
    private openai: OpenAI;
    private model: string;

    constructor(options: ChatOpenAIOptions) {
        super(options.mcpTools, options.systemPrompt);
        this.openai = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
        this.model = options.model;
    }

    async chat(prompt?: string): Promise<{ content: string, toolCalls: ToolCall[] | null }> {
        if (prompt) this.messages.push({ role: 'user', content: prompt });
        const params: any = {
            model: this.model,
            messages: this.messages,
            tools: this.getToolsDefinition(),
        };
        // Invoke LLM
        const res = await this.openai.chat.completions.create(params);
        const choice = res.choices[0];
        const response = choice.message?.content || '';
        if (response !== '') logLLMOutput(response);
        // Parse tool calls
        let toolCalls = null;
        if (choice.message?.tool_calls) {
            toolCalls = choice.message.tool_calls
            this.messages.push({ role: 'assistant', content: response, tool_calls: toolCalls });
            return {
                content: response,
                toolCalls: toolCalls.map(toolCall => ({
                    name: toolCall.function.name,
                    arguments: toolCall.function.arguments,
                    id: toolCall.id,
                }))
            };
        } else {
            this.messages.push({ role: 'assistant', content: response });
            return { content: response, toolCalls: null };
        }
    }

    protected addSystemPrompt(prompt: string): void {
        this.messages.unshift({ role: 'system', content: prompt });
    }

    private getToolsDefinition(): OpenAI.ChatCompletionTool[] {
        return this.mcpTools.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
            },
        }));
    }
} 