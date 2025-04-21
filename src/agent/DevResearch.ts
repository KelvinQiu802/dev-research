import { BaseChat } from "../chat/BaseChat";
import { getPlannerPrompt } from "../prompt/planner";
import MCPClient from "../tools/MCPClient";
import { logError, logLLMOutput, logSystem, logToolCall } from "../utils/logger";
import readline from 'readline';
import { plannerResponseSchema } from "./schema";

export default class DevResearch<TMessage> {
    private initialized = false;

    constructor(private planner: BaseChat<TMessage>, private mcpClients: MCPClient[]) {
    }

    async init() {
        logSystem('Initializing MCP clients');
        for (const mcpClient of this.mcpClients) {
            await mcpClient.init();
        }
        // Add MCP tools to LLM
        this.planner.setTools(this.mcpClients.flatMap(mcpClient => mcpClient.getTools()));
        this.initialized = true;
    }

    async close() {
        logSystem('Closing MCP clients');
        for (const mcpClient of this.mcpClients) {
            await mcpClient.close();
        }
    }

    async research() {
        if (!this.initialized) {
            logError('DevResearch not initialized');
            return;
        }

        await this.filnalizeResearTopic()
    }

    private async filnalizeResearTopic() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        // Get the initial research topic from the user
        const userInputTopic = await new Promise<string>((resolve) => {
            rl.question('🔍 Please input the research topic: ', (answer: string) => {
                rl.close()
                resolve(answer);
            });
        });
        // HIL
        let finalTopic = null
        let isDone = false;
        let userFeedback = null;
        do {
            const { content, toolCalls } = await this.planner.chat(getPlannerPrompt(userInputTopic, userFeedback), plannerResponseSchema);
            // When calling tool, the content might be null
            if (content) {
                try {
                    const parsed = plannerResponseSchema.parse(JSON.parse(content));
                    finalTopic = parsed.topic;
                    isDone = parsed.done;
                    // If the topic is finalized, break the loop
                    if (isDone) break;
                    // Ask the user to give feedback
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                    userFeedback = await new Promise<string>((resolve) => {
                        rl.question('💬 Please give feedback: ', (answer: string) => {
                            rl.close()
                            resolve(answer);
                        });
                    });
                } catch (error) {
                    logError(`Failed to parse the response: ${error}`);
                }
            }
            // If there are tool calls, call the tool
            if (toolCalls) {
                for (const toolCall of toolCalls) {
                    logToolCall(toolCall.name, toolCall.arguments);
                    const targetMCPClient = this.mcpClients.find(mcpClient => mcpClient.getTools().find(tool => tool.name === toolCall.name));
                    if (targetMCPClient) {
                        const result = await targetMCPClient.callTool(toolCall.name, JSON.parse(toolCall.arguments));
                        this.planner.appendToolResult(JSON.stringify(result), toolCall.id);
                    }
                }
            }
        } while (true)
        logSystem(`Final topic: ${finalTopic}`);
        return finalTopic
    }
}