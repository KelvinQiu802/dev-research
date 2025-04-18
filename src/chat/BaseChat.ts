import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolCall {
    name: string;
    arguments: string;
    id: string;
}

export abstract class BaseChat<TMessage> {
    protected messages: TMessage[] = [];
    protected mcpTools: Tool[] = [];

    constructor(private systemPrompt: string = '') {
        if (systemPrompt) this.addSystemPrompt(systemPrompt);
    }

    protected abstract addSystemPrompt(systemPrompt: string): void;

    abstract chat(
        prompt?: string,
    ): Promise<{ content: string, toolCalls: ToolCall[] | null }>;

    abstract appendToolResult(result: string, toolCallId?: string): void;

    abstract setTools(tools: Tool[]): void;
} 