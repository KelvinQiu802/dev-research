import OpenAI from 'openai';
import { BaseChat, ToolCall } from './BaseChat';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logError, logLLMOutput } from '../utils/logger';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

export interface ChatOpenAIOptions {
    apiKey: string;
    baseURL: string;
    model: string;
    systemPrompt?: string;
}

export class ChatOpenAI extends BaseChat<OpenAI.ChatCompletionMessageParam> {
    private openai: OpenAI;
    private model: string;

    constructor(options: ChatOpenAIOptions) {
        super(options.systemPrompt);
        this.openai = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
        this.model = options.model;
    }

    async chat(prompt?: string, outputSchema?: z.ZodSchema): Promise<{ content: string, toolCalls: ToolCall[] | null }> {
        if (prompt) this.messages.push({ role: 'user', content: prompt });
        const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
            model: this.model,
            messages: this.messages,
            tools: this.getToolsDefinition(),
            response_format: outputSchema ? zodResponseFormat(outputSchema, 'json_schema') : undefined,
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
            // If no tool calls, return null
            return { content: response, toolCalls: null };
        }
    }

    public appendToolResult(result: string, toolCallId?: string): void {
        if (!toolCallId) {
            logError('Tool call ID is required');
            throw new Error('Tool call ID is required');
        }
        this.messages.push({ role: 'tool', content: result, tool_call_id: toolCallId });
    }

    public setTools(tools: Tool[]): void {
        this.mcpTools = tools;
    }

    protected addSystemPrompt(prompt: string): void {
        this.messages.unshift({ role: 'system', content: prompt });
    }

    // Get tools definition for OpenAI
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