import { describe, it, expect, vi } from 'vitest'
import { enhancePrompt } from '../../server/services/promptDispatcher'

// Mock the AI module
vi.mock('../../server/utils/const', () => ({
    ai: {
        models: {
            generateContent: vi.fn()
        }
    },
    MODELS: {
        TEXT: 'gemini-2.0-mock',
        IMAGE: 'imagen-3.0-mock'
    }
}))

import { ai } from '../../server/utils/const'

describe('promptDispatcher', () => {
    describe('enhancePrompt', () => {
        it('should enhance text prompt and return a string', async () => {
            // Mock the AI response
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: 'Compose a prompt that is concise, unambiguous, and straightforward, designed to elicit a direct and easily manageable response.'
            } as any)

            const result = await enhancePrompt('simple prompt', 'TEXT')

            expect(result).toBe('Compose a prompt that is concise, unambiguous, and straightforward, designed to elicit a direct and easily manageable response.')
            expect(typeof result).toBe('string')
            expect(result.length).toBeGreaterThan(0)
        })

        it('should enhance image prompt with IMAGE type', async () => {
            // Mock the AI response for IMAGE type
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: 'A photorealistic image of a fluffy orange tabby cat with vibrant green eyes, soft natural lighting, shallow depth of field, warm tones.'
            } as any)

            const result = await enhancePrompt('cat image', 'IMAGE')

            expect(result).toBe('A photorealistic image of a fluffy orange tabby cat with vibrant green eyes, soft natural lighting, shallow depth of field, warm tones.')
            expect(typeof result).toBe('string')
            expect(result.length).toBeGreaterThan(0)
        })

        it('should default to TEXT type when type is not specified', async () => {
            // Mock the AI response for default TEXT type
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: 'Create a well-structured and detailed test prompt that clearly communicates the desired outcome.'
            } as any)

            const result = await enhancePrompt('test prompt')

            expect(result).toBe('Create a well-structured and detailed test prompt that clearly communicates the desired outcome.')
            expect(typeof result).toBe('string')
            expect(result.length).toBeGreaterThan(0)
        })
    })
})
