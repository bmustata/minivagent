import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateText } from '../../server/services/generateTextDispatcher'

// Mock config (model registry)
vi.mock('../../server/config', () => ({
    MODELS: {
        TEXT: [{ name: 'Flash Mock', provider: 'gemini', model: 'gemini-2.0-mock', options: {} }],
        IMAGE: [{ name: 'Imagen Mock', provider: 'gemini', model: 'imagen-3.0-mock', options: {} }],
        VISION: [{ name: 'Flash Mock', provider: 'gemini', model: 'gemini-2.0-mock', options: {} }]
    }
}))

// Mock the AI module
vi.mock('../../server/utils/const', () => ({
    ai: {
        models: {
            generateContent: vi.fn()
        }
    },
    MODELS: undefined
}))

// Mock the prompt service
vi.mock('../../server/services/promptDispatcher', () => ({
    enhancePrompt: vi.fn()
}))

import { ai } from '../../server/utils/const'
import { enhancePrompt } from '../../server/services/promptDispatcher'

describe('generateTextDispatcher', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('generateText', () => {
        it('should generate text from prompt', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: 'This is a generated response about the topic.'
            } as any)

            const result = await generateText({
                prompt: 'Write about AI'
            })

            expect(result.text).toBe('This is a generated response about the topic.')
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'gemini-2.0-mock',
                contents: 'Write about AI'
            })
        })

        it('should enhance prompt when shouldEnhance is true', async () => {
            vi.mocked(enhancePrompt).mockResolvedValue('An enhanced detailed prompt about AI and machine learning')
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: 'AI is transforming the world...'
            } as any)

            const result = await generateText({
                prompt: 'AI',
                shouldEnhance: true
            })

            expect(enhancePrompt).toHaveBeenCalledWith('AI', 'TEXT', undefined)
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'gemini-2.0-mock',
                contents: 'An enhanced detailed prompt about AI and machine learning'
            })
            expect(result.text).toBe('AI is transforming the world...')
        })

        it('should not enhance prompt when shouldEnhance is false', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: 'A simple response'
            } as any)

            await generateText({
                prompt: 'Simple prompt',
                shouldEnhance: false
            })

            expect(enhancePrompt).not.toHaveBeenCalled()
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'gemini-2.0-mock',
                contents: 'Simple prompt'
            })
        })

        it('should not enhance prompt by default when shouldEnhance is not specified', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: 'Default behavior response'
            } as any)

            await generateText({
                prompt: 'Default test'
            })

            expect(enhancePrompt).not.toHaveBeenCalled()
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'gemini-2.0-mock',
                contents: 'Default test'
            })
        })

        it('should throw error when prompt is empty', async () => {
            await expect(
                generateText({
                    prompt: ''
                })
            ).rejects.toThrow('Please provide a prompt.')
        })

        it('should throw error when prompt is only whitespace', async () => {
            await expect(
                generateText({
                    prompt: '   '
                })
            ).rejects.toThrow('Please provide a prompt.')
        })

        it('should return default message when AI returns no text', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: ''
            } as any)

            const result = await generateText({
                prompt: 'Test prompt'
            })

            expect(result.text).toBe('No response generated.')
        })
    })
})
