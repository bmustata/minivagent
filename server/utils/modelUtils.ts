import { MODELS } from '../config.ts'

type ModelCategory = 'TEXT' | 'IMAGE' | 'VISION' | 'PLANNER'

/**
 * Validate if a model identifier exists in a specific category
 */
export const validateModel = (modelId: string | undefined, category: ModelCategory): string => {
    // If no model specified, use default (first in array)
    if (!modelId) {
        return MODELS[category][0].model
    }

    // Check if model exists in the category
    const modelExists = MODELS[category].some((m) => m.model === modelId)

    if (!modelExists) {
        throw new Error(`Invalid model "${modelId}" for ${category}. Available models: ${MODELS[category].map((m) => m.model).join(', ')}`)
    }

    return modelId
}

/**
 * Get model configuration for a specific model identifier in a category
 */
export const getModelConfig = (modelId: string, category: ModelCategory) => {
    return MODELS[category].find((m) => m.model === modelId)
}

/**
 * Get the provider for a validated model identifier in a category
 */
export const getModelProvider = (modelId: string, category: ModelCategory): string => {
    const config = MODELS[category].find((m) => m.model === modelId)
    return config?.provider ?? 'gemini'
}
