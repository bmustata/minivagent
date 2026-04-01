import { openai } from '../../utils/const.ts'

export const openaiExtractTextFromImage = async (images: string[], prompt: string, model: string): Promise<string> => {
    if (!openai) throw new Error('OPENAI_API_KEY is not configured.')

    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = []

    for (const img of images) {
        if (img) {
            content.push({ type: 'image_url', image_url: { url: img } })
        }
    }
    content.push({ type: 'text', text: prompt })

    const response = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: content as never }]
    })

    return response.choices[0]?.message?.content || 'No response generated.'
}
