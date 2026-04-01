import { ai } from '../../utils/const.ts'

export const geminiExtractTextFromImage = async (images: string[], prompt: string, model: string): Promise<string> => {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []

    for (const img of images) {
        if (img) {
            const match = img.match(/^data:(.*?);base64,(.*)$/)
            if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
        }
    }
    parts.push({ text: prompt })

    const response = await ai.models.generateContent({
        model,
        contents: { parts }
    })

    return response.text || 'No response generated.'
}
