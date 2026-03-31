import { ai } from '../utils/const.ts'
import { MODELS } from '../config.ts'
import { validateModel } from '../utils/modelUtils.ts'

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
 */
export const enhancePrompt = async (prompt: string, type: PromptType = 'TEXT', model?: string): Promise<string> => {
    const systemInstruction = type === 'IMAGE' ? SYSTEM_INSTRUCTION_IMAGE : SYSTEM_INSTRUCTION_TEXT

    const validatedModel = validateModel(model, 'TEXT')

    const response = await ai.models.generateContent({
        model: validatedModel,
        contents: prompt,
        config: { systemInstruction }
    })

    return response.text?.trim() || prompt
}
