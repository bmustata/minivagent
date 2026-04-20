import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateImagesBase64 } from '../../server/services/generateImagesDispatcher'
import { Modality } from '@google/genai'

// Mock config (model registry)
vi.mock('../../server/config', () => ({
    MODELS: {
        TEXT: [{ name: 'Flash Mock', provider: 'gemini', model: 'gemini-2.0-mock', options: {} }],
        IMAGE: [
            { name: 'Imagen Mock', provider: 'gemini', model: 'imagen-3.0-mock', options: {} },
            { name: 'Imagen Pro Mock', provider: 'gemini', model: 'imagen-3.0-pro-mock', options: { presets: ['1K', '2K', '4K'] } }
        ],
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
    MODELS: undefined,
    IMAGE_ASPECT_RATIOS: ['1:1', '16:9', '9:16', '4:3', '3:4']
}))

// Mock the prompt service
vi.mock('../../server/services/promptDispatcher', () => ({
    enhancePrompt: vi.fn()
}))

import { ai } from '../../server/utils/const'
import { enhancePrompt } from '../../server/services/promptDispatcher'

// Sample base64 image data
const SAMPLE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const SAMPLE_JPEG_BASE64 =
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AH//2Q=='

const SAMPLE_REFERENCE_IMAGE = `data:image/png;base64,${SAMPLE_PNG_BASE64}`

const createMockImageResponse = (mimeType = 'image/png', data = SAMPLE_PNG_BASE64) => ({
    candidates: [
        {
            content: {
                parts: [
                    {
                        inlineData: {
                            mimeType,
                            data
                        }
                    }
                ]
            }
        }
    ]
})

describe('generateImagesDispatcher', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('generateImagesBase64', () => {
        it('should generate a single image from prompt', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse() as any)

            const result = await generateImagesBase64({
                prompt: 'A red apple'
            })

            expect(result.images).toHaveLength(1)
            expect(result.images[0]).toMatch(/^data:image\/png;base64,/)
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'imagen-3.0-mock',
                contents: {
                    parts: [{ text: 'A red apple' }]
                },
                config: {
                    responseModalities: [Modality.IMAGE]
                }
            })
        })

        it('should generate multiple images', async () => {
            vi.mocked(ai.models.generateContent)
                .mockResolvedValueOnce(createMockImageResponse() as any)
                .mockResolvedValueOnce(createMockImageResponse() as any)
                .mockResolvedValueOnce(createMockImageResponse() as any)

            const result = await generateImagesBase64({
                prompt: 'A landscape',
                count: 3
            })

            expect(result.images).toHaveLength(3)
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledTimes(3)
        })

        it('should include reference images in request', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse() as any)

            const result = await generateImagesBase64({
                prompt: 'Create similar image',
                referenceImages: [SAMPLE_REFERENCE_IMAGE]
            })

            expect(result.images).toHaveLength(1)
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'imagen-3.0-mock',
                contents: {
                    parts: [{ inlineData: { mimeType: 'image/png', data: SAMPLE_PNG_BASE64 } }, { text: 'Create similar image' }]
                },
                config: {
                    responseModalities: [Modality.IMAGE]
                }
            })
        })

        it('should include aspect ratio in prompt modifiers', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse() as any)

            await generateImagesBase64({
                prompt: 'A sunset',
                aspectRatio: '16:9'
            })

            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'imagen-3.0-mock',
                contents: {
                    parts: [{ text: 'A sunset' }]
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                    imageConfig: {
                        aspectRatio: '16:9'
                    }
                }
            })
        })

        it('should include output format in prompt modifiers', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse() as any)

            await generateImagesBase64({
                prompt: 'A mountain',
                outputFormat: 'jpeg'
            })

            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'imagen-3.0-mock',
                contents: {
                    parts: [{ text: 'A mountain (format jpeg)' }]
                },
                config: {
                    responseModalities: [Modality.IMAGE]
                }
            })
        })

        it('should enhance prompt when shouldEnhance is true', async () => {
            vi.mocked(enhancePrompt).mockResolvedValue('An enhanced detailed description of a cat')
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse() as any)

            const result = await generateImagesBase64({
                prompt: 'cat',
                shouldEnhance: true
            })

            expect(enhancePrompt).toHaveBeenCalledWith('cat', 'IMAGE')
            expect(result.enhancedPrompt).toBe('An enhanced detailed description of a cat')
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'imagen-3.0-mock',
                contents: {
                    parts: [{ text: 'An enhanced detailed description of a cat' }]
                },
                config: {
                    responseModalities: [Modality.IMAGE]
                }
            })
        })

        it('should handle JPEG output format', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse('image/jpeg', SAMPLE_JPEG_BASE64) as any)

            const result = await generateImagesBase64({
                prompt: 'A photo',
                outputFormat: 'jpeg'
            })

            expect(result.images).toHaveLength(1)
            expect(result.images[0]).toMatch(/^data:image\/jpeg;base64,/)
        })

        it('should throw error when no prompt or reference images provided', async () => {
            await expect(
                generateImagesBase64({
                    prompt: '',
                    referenceImages: []
                })
            ).rejects.toThrow('Prompt or Reference Image is required.')
        })

        it('should throw error when no image data in response', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                candidates: [{ content: { parts: [] } }]
            } as any)

            await expect(
                generateImagesBase64({
                    prompt: 'test'
                })
            ).rejects.toThrow('No image data found in response.')
        })

        it('should work with only reference images and no prompt', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse() as any)

            const result = await generateImagesBase64({
                referenceImages: [SAMPLE_REFERENCE_IMAGE]
            })

            expect(result.images).toHaveLength(1)
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'imagen-3.0-mock',
                contents: {
                    parts: [{ inlineData: { mimeType: 'image/png', data: SAMPLE_PNG_BASE64 } }]
                },
                config: {
                    responseModalities: [Modality.IMAGE]
                }
            })
        })

        it('should combine aspect ratio and output format in modifiers', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse() as any)

            await generateImagesBase64({
                prompt: 'A scene',
                aspectRatio: '4:3',
                outputFormat: 'png'
            })

            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'imagen-3.0-mock',
                contents: {
                    parts: [{ text: 'A scene (format png)' }]
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                    imageConfig: {
                        aspectRatio: '4:3'
                    }
                }
            })
        })

        it('should include preset in imageConfig when model supports it', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse() as any)

            await generateImagesBase64({
                prompt: 'A landscape',
                model: 'imagen-3.0-pro-mock',
                preset: '2K'
            })

            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'imagen-3.0-pro-mock',
                contents: {
                    parts: [{ text: 'A landscape' }]
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                    imageConfig: {
                        imageSize: '2K'
                    }
                }
            })
        })

        it('should not include preset when model does not support it', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse() as any)

            await generateImagesBase64({
                prompt: 'A landscape',
                model: 'imagen-3.0-mock',
                preset: '2K'
            })

            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'imagen-3.0-mock',
                contents: {
                    parts: [{ text: 'A landscape' }]
                },
                config: {
                    responseModalities: [Modality.IMAGE]
                }
            })
        })

        it('should not include preset when preset is undefined', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse() as any)

            await generateImagesBase64({
                prompt: 'A landscape',
                model: 'imagen-3.0-pro-mock'
            })

            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'imagen-3.0-pro-mock',
                contents: {
                    parts: [{ text: 'A landscape' }]
                },
                config: {
                    responseModalities: [Modality.IMAGE]
                }
            })
        })

        it('should combine preset with aspect ratio', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue(createMockImageResponse() as any)

            await generateImagesBase64({
                prompt: 'A scene',
                model: 'imagen-3.0-pro-mock',
                preset: '4K',
                aspectRatio: '16:9'
            })

            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'imagen-3.0-pro-mock',
                contents: {
                    parts: [{ text: 'A scene' }]
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                    imageConfig: {
                        aspectRatio: '16:9',
                        imageSize: '4K'
                    }
                }
            })
        })
    })
})
