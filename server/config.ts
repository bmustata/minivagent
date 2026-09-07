const imagegen = true

// Model constants — the first entry in each category is the default model
// Comment out or remove any entry below to disable that provider / model across the app
// Supported providers: gemini, openai, black-forest-labs, bytedance
export const MODELS = {
    TEXT: [
        { name: 'Gemini Flash 3.8', provider: 'gemini', model: 'gemini-3.8-flash', options: {} },
        { name: 'Gemini Flash 3.7', provider: 'gemini', model: 'gemini-3.7-flash', options: {} },
        { name: 'Gemini Flash 3.5', provider: 'gemini', model: 'gemini-3.5-flash', options: {} },
        { name: 'Gemini Flash 3.1 Lite', provider: 'gemini', model: 'gemini-3.1-flash-lite', options: {} },
        { name: 'Gemini Flash 3', provider: 'gemini', model: 'gemini-3-flash-preview', options: {} },
        { name: 'Gemini Flash 2.5', provider: 'gemini', model: 'gemini-2.5-flash', options: {} },
        { name: 'GPT-5.6 Sol', provider: 'openai', model: 'gpt-5.6-sol', options: {} },
        { name: 'GPT-5.6 Terra', provider: 'openai', model: 'gpt-5.6-terra', options: {} },
        { name: 'GPT-5.6 Luna', provider: 'openai', model: 'gpt-5.6-luna', options: {} },
        { name: 'GPT-5.4', provider: 'openai', model: 'gpt-5.4', options: {} },
        { name: 'GPT-5.4 Mini', provider: 'openai', model: 'gpt-5.4-mini', options: {} },
        { name: 'GPT-5.4 Nano', provider: 'openai', model: 'gpt-5.4-nano', options: {} }
    ],
    IMAGE: [
        { name: 'Nano Banana 2 (gemini-3.1-flash)', provider: 'gemini', model: 'gemini-3.1-flash-image', options: { presets: ['512', '1K', '2K', '4K'] } },
        { name: 'Nano Banana 2 Lite (gemini-3.1-flash-lite)', provider: 'gemini', model: 'gemini-3.1-flash-lite-image', options: { imagegen } },
        { name: 'Nano Banana Pro (gemini-3-pro)', provider: 'gemini', model: 'gemini-3-pro-image', options: { presets: ['1K', '2K', '4K'] } },
        { name: 'Nano Banana (gemini-2.5-flash)', provider: 'gemini', model: 'gemini-2.5-flash-image', options: {} },
        { name: 'GPT Image 1', provider: 'openai', model: 'gpt-image-1-mini', options: { referenceImages: 16 } },
        { name: 'GPT Image 1.5', provider: 'openai', model: 'gpt-image-1.5', options: { referenceImages: 16 } },
        { name: 'GPT Image 2', provider: 'openai', model: 'gpt-image-2', options: { referenceImages: 16, presets: ['1K', '2K', '4K'] } },
        { name: 'Flux Schnell', provider: 'black-forest-labs', model: 'black-forest-labs/flux-schnell', options: {} },
        { name: 'Flux Dev', provider: 'black-forest-labs', model: 'black-forest-labs/flux-dev', options: { referenceImages: 1 } },
        { name: 'Flux 1.1 Pro', provider: 'black-forest-labs', model: 'black-forest-labs/flux-1.1-pro', options: { referenceImages: 1, safetyTolerance: 6 } },
        { name: 'Flux 2 Klein 4B', provider: 'black-forest-labs', model: 'black-forest-labs/flux-2-klein-4b', options: { referenceImages: 5 } },
        { name: 'Flux 2 Dev', provider: 'black-forest-labs', model: 'black-forest-labs/flux-2-dev', options: { referenceImages: 5 } },
        { name: 'Flux 2 Pro', provider: 'black-forest-labs', model: 'black-forest-labs/flux-2-pro', options: { referenceImages: 8, safetyTolerance: 5, presets: ['1K', '2K', '4K', '0.5K'] } },
        { name: 'Flux 2 Max', provider: 'black-forest-labs', model: 'black-forest-labs/flux-2-max', options: { referenceImages: 8, safetyTolerance: 5, presets: ['1K', '2K', '4K', '0.5K'] } },
        { name: 'Seedream 5 Lite', provider: 'bytedance', model: 'bytedance/seedream-5-lite', options: { referenceImages: 14, presets: ['2K', '3K'] } },
        { name: 'Seedream 4.5', provider: 'bytedance', model: 'bytedance/seedream-4.5', options: { referenceImages: 14, presets: ['2K', '4K'] } }
    ],
    VISION: [
        { name: 'Gemini Flash 3.8', provider: 'gemini', model: 'gemini-3.8-flash', options: {} },
        { name: 'Gemini Flash 3.7', provider: 'gemini', model: 'gemini-3.7-flash', options: {} },
        { name: 'Gemini Flash 3.5', provider: 'gemini', model: 'gemini-3.5-flash', options: {} },
        { name: 'Gemini Flash 3', provider: 'gemini', model: 'gemini-3-flash-preview', options: {} },
        { name: 'Gemini Flash 2.5', provider: 'gemini', model: 'gemini-2.5-flash', options: {} },
        { name: 'GPT-5.6 Sol', provider: 'openai', model: 'gpt-5.6-sol', options: {} },
        { name: 'GPT-5.6 Terra', provider: 'openai', model: 'gpt-5.6-terra', options: {} },
        { name: 'GPT-5.6 Luna', provider: 'openai', model: 'gpt-5.6-luna', options: {} },
        { name: 'GPT-5.4', provider: 'openai', model: 'gpt-5.4', options: {} },
        { name: 'GPT-5.4 Mini', provider: 'openai', model: 'gpt-5.4-mini', options: {} },
        { name: 'GPT-5.4 Nano', provider: 'openai', model: 'gpt-5.4-nano', options: {} }
    ],
    PLANNER: [
        { name: 'Gemini Flash 3.8', provider: 'gemini', model: 'gemini-3.8-flash', options: {} },
        { name: 'Gemini Flash 3.7', provider: 'gemini', model: 'gemini-3.7-flash', options: {} },
        { name: 'Gemini Flash 3.5', provider: 'gemini', model: 'gemini-3.5-flash', options: {} },
        { name: 'Gemini Flash 2.5', provider: 'gemini', model: 'gemini-2.5-flash', options: {} }
    ]
} as const
