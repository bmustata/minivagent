const imagegen = true

// Model constants — the first entry in each category is the default model
// Comment out or remove any entry below to disable that provider / model across the app
export const MODELS = {
    TEXT: [
        { name: 'Gemini Flash 2.5', provider: 'gemini', model: 'gemini-2.5-flash', options: {} },
        { name: 'Gemini Flash 3', provider: 'gemini', model: 'gemini-3-flash-preview', options: {} },
        { name: 'Gemini Flash 3.1 Lite', provider: 'gemini', model: 'gemini-3.1-flash-lite-preview', options: {} },
        { name: 'GPT-5.4', provider: 'openai', model: 'gpt-5.4', options: {} },
        { name: 'GPT-5.4 Mini', provider: 'openai', model: 'gpt-5.4-mini', options: {} },
        { name: 'GPT-5.4 Nano', provider: 'openai', model: 'gpt-5.4-nano', options: {} }
    ],
    IMAGE: [
        { name: 'Nano Banana 1 (2.5 Flash)', provider: 'gemini', model: 'gemini-2.5-flash-image', options: {} },
        {
            name: 'Nano Banana Pro (3 Pro)',
            provider: 'gemini',
            model: 'gemini-3-pro-image-preview',
            options: {
                presets: ['1K', '2K', '4K']
            }
        },
        {
            name: 'Nano Banana 2 (3.1 Flash)',
            provider: 'gemini',
            model: 'gemini-3.1-flash-image-preview',
            options: {
                presets: ['512', '1K', '2K', '4K']
            }
        },
        { name: 'Imagen 4', provider: 'gemini', model: 'imagen-4.0-generate-001', options: { imagegen, presets: ['1K', '2K'] } },
        { name: 'Imagen 4 Fast', provider: 'gemini', model: 'imagen-4.0-fast-generate-001', options: { imagegen } },
        { name: 'Imagen 4 Ultra', provider: 'gemini', model: 'imagen-4.0-ultra-generate-001', options: { imagegen, presets: ['1K', '2K'] } },
        { name: 'GPT Image 1', provider: 'openai', model: 'gpt-image-1-mini', options: {} },
        { name: 'GPT Image 1.5', provider: 'openai', model: 'gpt-image-1.5', options: {} },
        { name: 'Flux Schnell', provider: 'black-forest-labs', model: 'black-forest-labs/flux-schnell', options: {} },
        { name: 'Flux Dev', provider: 'black-forest-labs', model: 'black-forest-labs/flux-dev', options: { referenceImages: 1 } },
        { name: 'Flux 1.1 Pro', provider: 'black-forest-labs', model: 'black-forest-labs/flux-1.1-pro', options: { referenceImages: 1 } },
        { name: 'Flux 2 Dev', provider: 'black-forest-labs', model: 'black-forest-labs/flux-2-dev', options: { referenceImages: 5 } },
        { name: 'Flux 2 Pro', provider: 'black-forest-labs', model: 'black-forest-labs/flux-2-pro', options: { referenceImages: 8 } },
        { name: 'Flux 2 Klein 4B', provider: 'black-forest-labs', model: 'black-forest-labs/flux-2-klein-4b', options: { referenceImages: 5 } },
        { name: 'Flux 2 Max', provider: 'black-forest-labs', model: 'black-forest-labs/flux-2-max', options: { referenceImages: 8 } }
    ],
    VISION: [
        { name: 'Gemini Flash 2.5', provider: 'gemini', model: 'gemini-2.5-flash', options: {} },
        { name: 'Gemini Flash 3', provider: 'gemini', model: 'gemini-3-flash-preview', options: {} },
        { name: 'GPT-5.4', provider: 'openai', model: 'gpt-5.4', options: {} },
        { name: 'GPT-5.4 Mini', provider: 'openai', model: 'gpt-5.4-mini', options: {} },
        { name: 'GPT-5.4 Nano', provider: 'openai', model: 'gpt-5.4-nano', options: {} }
    ],
    PLANNER: [{ name: 'Gemini Flash 2.5', provider: 'gemini', model: 'gemini-2.5-flash', options: {} }]
} as const
