import { describe, it, expect, vi, beforeEach } from 'vitest'
import { planGraph } from '../../server/services/plannerSrv'

// Mock config (model registry)
vi.mock('../../server/config', () => ({
    MODELS: {
        TEXT: [{ name: 'Flash Mock', provider: 'gemini', model: 'gemini-2.0-mock', options: {} }],
        IMAGE: [{ name: 'Imagen Mock', provider: 'gemini', model: 'imagen-3.0-mock', options: {} }],
        VISION: [{ name: 'Flash Mock', provider: 'gemini', model: 'gemini-2.0-mock', options: {} }],
        PLANNER: [{ name: 'Flash Mock', provider: 'gemini', model: 'gemini-2.0-mock', options: {} }]
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

describe('plannerSrv', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('planGraph', () => {
        it('should parse a valid graph JSON from AI response', async () => {
            const mockGraph = {
                nodes: [
                    {
                        id: '1',
                        type: 'TEXT_GEN',
                        position: { x: 0, y: 0 },
                        data: { prompt: 'Write a story about a cat.' }
                    },
                    {
                        id: '2',
                        type: 'IMAGE_GEN',
                        position: { x: 350, y: 0 },
                        data: { prompt: 'Generate an image of the cat.' }
                    }
                ],
                edges: [
                    {
                        id: 'e1-2',
                        source: '1',
                        target: '2',
                        sourceHandle: 'output',
                        targetHandle: 'prompt'
                    }
                ]
            }
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: JSON.stringify(mockGraph)
            } as any)

            const result = await planGraph('Write a story about a cat with an image')
            expect(result).toEqual(mockGraph)
            expect(vi.mocked(ai.models.generateContent)).toHaveBeenCalledWith({
                model: 'gemini-2.0-mock',
                contents: 'Write a story about a cat with an image',
                config: expect.objectContaining({
                    systemInstruction: expect.any(String),
                    responseMimeType: 'application/json'
                })
            })
        })

        it('should strip markdown code fences from AI response', async () => {
            const mockGraph = {
                nodes: [
                    { id: '1', type: 'IMAGE_SOURCE', position: { x: 0, y: 0 }, data: { prompt: 'Upload an image.' } },
                    { id: '2', type: 'IMAGE_TO_TEXT', position: { x: 350, y: 0 }, data: { prompt: 'Describe the image.' } }
                ],
                edges: [{ id: 'e1-2', source: '1', target: '2', sourceHandle: 'output', targetHandle: 'prompt' }]
            }
            vi.mocked(ai.models.generateContent).mockResolvedValue({
                text: '```json\n' + JSON.stringify(mockGraph) + '\n```'
            } as any)

            const result = await planGraph('Describe an uploaded image')
            expect(result).toEqual(mockGraph)
        })

        it('should throw error if AI returns empty text', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({ text: '' } as any)
            await expect(planGraph('Empty response')).rejects.toThrow('Empty response from planner.')
        })

        it('should throw error if AI returns undefined text', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({} as any)
            await expect(planGraph('No text')).rejects.toThrow('Empty response from planner.')
        })

        it('should throw error if AI returns invalid JSON', async () => {
            vi.mocked(ai.models.generateContent).mockResolvedValue({ text: 'not a json' } as any)
            await expect(planGraph('Invalid JSON')).rejects.toThrow()
        })
    })
})
