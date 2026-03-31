import { openai } from '../../utils/const.ts'

export const openaiEnhancePrompt = async (prompt: string, systemInstruction: string, model: string): Promise<string> => {
    if (!openai) throw new Error('OPENAI_API_KEY is not configured.')
    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
        ]
    })
    return response.choices[0]?.message?.content?.trim() || prompt
}
