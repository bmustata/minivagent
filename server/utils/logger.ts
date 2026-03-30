import pino from 'pino'

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname'
        }
    }
})

const PROMPT_LOG_LINES = 10

export function truncatePromptForLog(prompt: string): string {
    const lines = prompt.split('\n')
    if (lines.length <= PROMPT_LOG_LINES) return prompt
    const skipped = lines.length - PROMPT_LOG_LINES
    return lines.slice(0, PROMPT_LOG_LINES).join('\n') + `\n... (${skipped} line${skipped === 1 ? '' : 's'} omitted)`
}
