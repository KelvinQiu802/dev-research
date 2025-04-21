import { BaseChat } from "../chat/BaseChat";
import MCPClient from "../tools/MCPClient";
import { logError, logLLMOutput, logSystem } from "../utils/logger";

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

    async research(topic: string) {
        if (!this.initialized) {
            logError('DevResearch not initialized');
            return;
        }
    }
}