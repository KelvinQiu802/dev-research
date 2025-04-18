import 'dotenv/config';
import { ChatOpenAI } from './chat/ChatOpenAI';
import { logError } from './utils/logger';

const plannerAPIKey = process.env.PLANNER_API_KEY;
const plannerBaseURL = process.env.PLANNER_BASE_URL;
const plannerModelName = 'openai/gpt-4o-mini';

// ENV Check
if (!plannerAPIKey || !plannerBaseURL) {
    logError('PLANNER_API and PLANNER_URL must be set');
    process.exit(1);
}

const llm = new ChatOpenAI({
    apiKey: plannerAPIKey,
    baseURL: plannerBaseURL,
    model: plannerModelName,
    mcpTools: [],
});

async function main() {
    const res = await llm.chat('What is the capital of the moon?');
}

main()