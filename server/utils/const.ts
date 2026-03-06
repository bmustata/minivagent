import { GoogleGenAI } from '@google/genai'
import { logger } from './logger.ts'

const imagegen = true

// Model constants
export const MODELS = {
    TEXT: [
        { name: 'Gemini Flash 2.5', model: 'gemini-2.5-flash', options: {} },
        { name: 'Gemini Flash 3', model: 'gemini-3-flash-preview', options: {} }
    ],
    IMAGE: [
        { name: 'Nano Banana 1 (2.5 Flash)', model: 'gemini-2.5-flash-image', options: {} },
        {
            name: 'Nano Banana Pro (3 Pro)',
            model: 'gemini-3-pro-image-preview',
            options: {
                presets: ['1K', '2K', '4K']
            }
        },
        {
            name: 'Nano Banana 2 (3.1 Flash)',
            model: 'gemini-3.1-flash-image-preview',
            options: {
                presets: ['0.5K', '1K', '2K', '4K']
            }
        },
        { name: 'Imagen 4', model: 'imagen-4.0-generate-001', options: { imagegen, presets: ['1K', '2K'] } },
        { name: 'Imagen 4 Fast', model: 'imagen-4.0-fast-generate-001', options: { imagegen } },
        { name: 'Imagen 4 Ultra', model: 'imagen-4.0-ultra-generate-001', options: { imagegen, presets: ['1K', '2K'] } }
    ],
    VISION: [
        { name: 'Gemini Flash 2.5', model: 'gemini-2.5-flash', options: {} },
        { name: 'Gemini Flash 3', model: 'gemini-3-flash-preview', options: {} }
    ],
    PLANNER: [{ name: 'Gemini Flash 2.5', model: 'gemini-2.5-flash', options: {} }]
} as const

// Check and validate API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
    logger.error('❌ GEMINI_API_KEY is not set in environment variables')
    throw new Error('GEMINI_API_KEY is required')
}
logger.info(`✓ GEMINI_API_KEY found (length: ${GEMINI_API_KEY.length})`)

// Initialize Gemini AI
export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

// Valid aspect ratios for image generation
export const IMAGE_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
