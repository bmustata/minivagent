import { describe, it, expect, vi } from 'vitest'
import { extractTextFromImage } from '../../server/services/visionSrv'

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

import { ai } from '../../server/utils/const'

// Sample base64 image (1x1 red pixel PNG)
const SAMPLE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const SAMPLE_JPEG_IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

describe('visionSrv', () => {
    describe('extractTextFromImage', () => {
        it('should extract text from a single image with default prompt', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: 'A small red square on a white background.'
            } as any)

            const result = await extractTextFromImage({
                images: [SAMPLE_IMAGE]
            })

            expect(result.text).toBe('A small red square on a white background.')
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'gemini-2.0-mock',
                contents: {
                    parts: [{ inlineData: { mimeType: 'image/png', data: expect.any(String) } }, { text: 'Describe this image in detail' }]
                }
            })
        })

        it('should extract text from an image with custom prompt', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: 'The image shows a cat sitting on a windowsill.'
            } as any)

            const result = await extractTextFromImage({
                images: [SAMPLE_IMAGE],
                prompt: 'What animal is in this image?'
            })

            expect(result.text).toBe('The image shows a cat sitting on a windowsill.')
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'gemini-2.0-mock',
                contents: {
                    parts: [{ inlineData: { mimeType: 'image/png', data: expect.any(String) } }, { text: 'What animal is in this image?' }]
                }
            })
        })

        it('should handle multiple images', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: 'Both images show similar red squares.'
            } as any)

            const result = await extractTextFromImage({
                images: [SAMPLE_IMAGE, SAMPLE_IMAGE],
                prompt: 'Compare these images'
            })

            expect(result.text).toBe('Both images show similar red squares.')
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'gemini-2.0-mock',
                contents: {
                    parts: [{ inlineData: { mimeType: 'image/png', data: expect.any(String) } }, { inlineData: { mimeType: 'image/png', data: expect.any(String) } }, { text: 'Compare these images' }]
                }
            })
        })

        it('should throw error when no images provided', async () => {
            await expect(extractTextFromImage({ images: [] })).rejects.toThrow('At least one image is required.')
        })

        it('should return default message when AI returns no text', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: ''
            } as any)

            const result = await extractTextFromImage({
                images: [SAMPLE_IMAGE]
            })

            expect(result.text).toBe('No response generated.')
        })

        it('should handle JPEG images', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: 'A JPEG image.'
            } as any)

            const result = await extractTextFromImage({
                images: [SAMPLE_JPEG_IMAGE]
            })

            expect(result.text).toBe('A JPEG image.')
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'gemini-2.0-mock',
                contents: {
                    parts: [{ inlineData: { mimeType: 'image/jpeg', data: '/9j/4AAQSkZJRg==' } }, { text: 'Describe this image in detail' }]
                }
            })
        })
    })
})
