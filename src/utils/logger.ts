import chalk from 'chalk';

export function logMCPConnection(message: string) {
    console.log(
        `${chalk.blue('🔌 [MCP]')} ${chalk.bold.blueBright(message)}`
    );
}

export function logToolCall(toolName: string, message: string) {
    console.log(
        `${chalk.green('🛠️ [Tool]')} ${chalk.bold.green(toolName)}: ${chalk.white(message)}`
    );
}

export function logLLMOutput(message: string) {
    console.log(
        `${chalk.magenta('🧠 [LLM]')} ${chalk.bold.magentaBright(message)}`
    );
}

export function logError(message: string, error?: Error) {
    console.error(
        `${chalk.red('❌ [ERROR]')} ${chalk.bold.red(message)}`
    );
    if (error) {
        console.error(chalk.redBright(error.stack || error.message));
    }
}

