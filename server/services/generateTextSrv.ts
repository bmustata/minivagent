import { ai } from '../utils/const.ts'
import { MODELS } from '../config.ts'
import { enhancePrompt } from './promptSrv.ts'
import { validateModel } from '../utils/modelUtils.ts'

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

    const response = await ai.models.generateContent({
        model: validatedModel,
        contents: finalPrompt
    })

    return { text: response.text || 'No response generated.' }
}
