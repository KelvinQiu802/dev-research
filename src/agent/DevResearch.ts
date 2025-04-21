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

        const topic = await this.finalizeResearchTopic()
        logSystem(`Final research topic: ${topic}`);
    }

    private async finalizeResearchTopic() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        // Get the initial research topic from the user
        const userInputTopic = await new Promise<string>((resolve) => {
            rl.question('🔍 Please input the research topic: ', (answer: string) => {
                resolve(answer);
            });
        });
        let finalTopic = null;
        let isDone = false;
        let userFeedback = null;
        while (!isDone) {
            try {
                const { content, toolCalls } = await this.planner.chat(getPlannerPrompt(userInputTopic, userFeedback), plannerResponseSchema);
                // Call tools in parallel
                if (toolCalls && toolCalls.length > 0) {
                    await Promise.all(toolCalls.map(async (toolCall) => {
                        logToolCall(toolCall.name, toolCall.arguments);
                        const targetMCPClient = this.mcpClients.find(mcpClient => mcpClient.getTools().find(tool => tool.name === toolCall.name));
                        if (targetMCPClient) {
                            const result = await targetMCPClient.callTool(toolCall.name, JSON.parse(toolCall.arguments));
                            this.planner.appendToolResult(JSON.stringify(result), toolCall.id);
                        }
                    }));
                }
                // Parse the response
                if (content) {
                    const parsed = plannerResponseSchema.parse(JSON.parse(content));
                    finalTopic = parsed.topic;
                    isDone = parsed.done;
                    if (!isDone) {
                        userFeedback = await new Promise<string>((resolve) => {
                            rl.question('💬 Please give feedback: ', (answer: string) => {
                                resolve(answer);
                            });
                        });
                    }
                }
            } catch (error) {
                logError(`Error in research topic planning loop: ${error}`);
                rl.close();
                throw error;
            }
        }
        rl.close();
        return finalTopic;
    }
}