const API_BASE = '/api'

interface ModelInfo {
    name: string
    model: string
    provider: string
    options: Record<string, unknown>
}

interface ModelsResponse {
    success: boolean
    models: {
        TEXT: ModelInfo[]
        IMAGE: ModelInfo[]
        VISION: ModelInfo[]
    }
    providers: {
        TEXT: string[]
        IMAGE: string[]
        VISION: string[]
        PLANNER: string[]
    }
}

export interface ResourceItem {
    id: string
    mimeType: string
    size: number
    sizeStr: string
    createdAt: string
}

// Module-level cache so repeated gallery opens never re-fetch
const resourceInfoCache = new Map<string, ResourceItem>()

// Module-level cache for /api/models — valid for 1 hour
const MODELS_CACHE_TTL_MS = 60 * 60 * 1000
let modelsCacheValue: ModelsResponse | null = null
let modelsCacheExpiry = 0
// In-flight promise — shared by concurrent callers so only one request is made
let modelsInflightPromise: Promise<ModelsResponse> | null = null

/**
 * Fetches metadata for a resource by ID via GET /api/resources/:id/info.
 * Results are cached in memory for the lifetime of the page.
 */
export const getResourceInfo = async (resourceId: string): Promise<ResourceItem> => {
    if (resourceInfoCache.has(resourceId)) {
        return resourceInfoCache.get(resourceId)!
    }
    const response = await fetch(`${API_BASE}/resources/${resourceId}/info`)
    if (!response.ok) {
        throw new Error(`Failed to fetch resource info for ${resourceId}`)
    }
    const info: ResourceItem = await response.json()
    resourceInfoCache.set(resourceId, info)
    return info
}

/**
 * Fetches all available models from the server.
 * Results are cached in memory for 1 hour. Concurrent callers share the same
 * in-flight request so only one HTTP call is made even if invoked simultaneously.
 */
export const getModels = async (): Promise<ModelsResponse> => {
    if (modelsCacheValue && Date.now() < modelsCacheExpiry) {
        return modelsCacheValue
    }
    if (modelsInflightPromise) {
        return modelsInflightPromise
    }
    modelsInflightPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE}/models`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })

            if (!response.ok) {
                throw new Error('Failed to fetch models')
            }

            const data: ModelsResponse = await response.json()
            modelsCacheValue = data
            modelsCacheExpiry = Date.now() + MODELS_CACHE_TTL_MS
            return data
        } catch (error) {
            console.error('Failed to fetch models:', error)
            throw error
        } finally {
            modelsInflightPromise = null
        }
    })()
    return modelsInflightPromise
}

/**
 * Generates text from a text prompt (text-only generation)
 */
export const generateText = async (prompt: string, shouldEnhance: boolean = false, model?: string): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE}/generate-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, shouldEnhance, model })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Text generation failed')
        }

        const data = await response.json()
        return data.text
    } catch (error) {
        console.error('Text generation error:', error)
        throw new Error('Failed to generate text. Please check your connection.')
    }
}

/**
 * Extracts text from images using vision model (OCR/image analysis)
 */
export const extractTextFromImage = async (prompt: string, images: string[], model?: string): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE}/extract-text-from-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, images, model })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Text extraction failed')
        }

        const data = await response.json()
        return data.text
    } catch (error) {
        console.error('Text extraction error:', error)
        throw new Error('Failed to extract text from image. Please check your connection.')
    }
}

/**
 * Generates images from text and/or reference images.
 * Saves each result as a resource. Returns resource IDs per image.
 */
export const generateImages = async (
    prompt: string,
    count: number = 1,
    referenceImages: string[] = [],
    aspectRatio?: string,
    outputFormat?: string,
    shouldEnhance: boolean = false,
    model?: string,
    preset?: string
): Promise<{ imageResources: string[]; enhancedPrompt?: string }> => {
    try {
        const response = await fetch(`${API_BASE}/generate-images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                count,
                referenceImages,
                aspectRatio,
                outputFormat,
                shouldEnhance,
                model,
                preset
            })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Image generation failed')
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Image generation error:', error)
        throw new Error(error instanceof Error ? error.message : 'Failed to generate images.')
    }
}

/**
 * Plans a node graph based on user instructions.
 * Returns a JSON structure compatible with the application's Node/Edge types.
 */
export const planGraphFromPrompt = async (userPrompt: string): Promise<{ nodes: any[]; edges: any[] }> => {
    try {
        const response = await fetch(`${API_BASE}/plan-graph`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userPrompt })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Graph planning failed')
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Graph planning error:', error)
        throw new Error('Failed to plan flow. Please try a more specific request.')
    }
}
