import { enhancePrompt } from './promptSrv.ts'
import { validateModel, getModelProvider } from '../utils/modelUtils.ts'
import { geminiGenerateText } from './gemini/generateTextSrv.ts'
import { openaiGenerateText } from './openai/generateTextSrv.ts'

export interface GenerateTextOptions {
    prompt: string
    shouldEnhance?: boolean
    model?: string
}

export interface GenerateTextResult {
    text: string
}

/**
 * Generate text using AI model
 * @param options.prompt - The text prompt to generate content from
 * @param options.shouldEnhance - Whether to enhance the prompt before generation
 * @param options.model - The model ID to use; falls back to the TEXT category default if omitted
 */
export const generateText = async (options: GenerateTextOptions): Promise<GenerateTextResult> => {
    const { prompt, shouldEnhance, model } = options

    let finalPrompt = prompt
    if (shouldEnhance) {
        finalPrompt = await enhancePrompt(prompt, 'TEXT', model)
    }

    if (!finalPrompt || !finalPrompt.trim()) {
        throw new Error('Please provide a prompt.')
    }

    const validatedModel = validateModel(model, 'TEXT')
    const provider = getModelProvider(validatedModel, 'TEXT')

    if (provider === 'openai') {
        const text = await openaiGenerateText(finalPrompt, validatedModel)
        return { text }
    } else if (provider === 'gemini') {
        const text = await geminiGenerateText(finalPrompt, validatedModel)
        return { text }
    } else {
        throw new Error(`Unknown provider: "${provider}"`)
    }
}
