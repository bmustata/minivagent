import { ai } from '../../utils/const.ts'

export const geminiGenerateText = async (prompt: string, model: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model,
        contents: prompt
    })
    return response.text || 'No response generated.'
}
