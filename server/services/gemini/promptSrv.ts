import { ai } from '../../utils/const.ts'

export const geminiEnhancePrompt = async (prompt: string, systemInstruction: string, model: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction }
    })
    return response.text?.trim() || prompt
}
