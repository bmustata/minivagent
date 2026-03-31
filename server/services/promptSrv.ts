import { validateModel, getModelProvider } from '../utils/modelUtils.ts'
import { geminiEnhancePrompt } from './gemini/promptSrv.ts'
import { openaiEnhancePrompt } from './openai/promptSrv.ts'

export type PromptType = 'TEXT' | 'IMAGE'

const SYSTEM_INSTRUCTION_IMAGE = `You are an expert prompt engineer for image generation models. 
Enhance the given prompt to be more descriptive and visually detailed.
Add artistic style, lighting, composition, and mood details.
Keep it concise but impactful. Return ONLY the enhanced prompt, nothing else.`

const SYSTEM_INSTRUCTION_TEXT = `You are an expert prompt engineer.
Enhance the given prompt to be clearer and more detailed.
Maintain the original intent while improving clarity.
Return ONLY the enhanced prompt, nothing else.`

/**
 * Enhance a prompt using AI
 * @param prompt - The prompt text to enhance
 * @param type - Enhancement mode: 'TEXT' or 'IMAGE'
 * @param model - Model ID to use; falls back to TEXT default if omitted
 */
export const enhancePrompt = async (prompt: string, type: PromptType = 'TEXT', model?: string): Promise<string> => {
    const systemInstruction = type === 'IMAGE' ? SYSTEM_INSTRUCTION_IMAGE : SYSTEM_INSTRUCTION_TEXT

    const validatedModel = validateModel(model, 'TEXT')
    const provider = getModelProvider(validatedModel, 'TEXT')

    if (provider === 'openai') {
        return openaiEnhancePrompt(prompt, systemInstruction, validatedModel)
    } else if (provider === 'gemini') {
        return geminiEnhancePrompt(prompt, systemInstruction, validatedModel)
    } else {
        throw new Error(`Unknown provider: "${provider}"`)
    }
}
