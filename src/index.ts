import 'dotenv/config';
import { ChatOpenAI } from './chat/ChatOpenAI';
import { logError } from './utils/logger';
import MCPClient from './tools/MCPClient';
import DevResearch from './agent/DevResearch';

const plannerAPIKey = process.env.PLANNER_API_KEY;
const plannerBaseURL = process.env.PLANNER_BASE_URL;
const plannerModelName = 'openai/gpt-4.1-mini';

async function main() {
    // ENV Check
    if (!plannerAPIKey || !plannerBaseURL) {
        logError('PLANNER_API and PLANNER_URL must be set');
        return;
    }
    if (!process.env.TAVILY_API_KEY) {
        logError('TAVILY_API_KEY must be set');
        return;
    }

    const tavily = new MCPClient('Tavily Search', 'npx', ['-y', 'tavily-mcp']);

    const planner = new ChatOpenAI({
        apiKey: plannerAPIKey,
        baseURL: plannerBaseURL,
        model: plannerModelName,
    });

    const devResearch = new DevResearch(planner, [tavily]);
    await devResearch.init();
    await devResearch.research('MCP');
    await devResearch.close();
}

main().catch(logError);