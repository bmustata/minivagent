export enum NodeType {
    TEXT_GEN = 'TEXT_GEN',
    IMAGE_GEN = 'IMAGE_GEN',
    IMAGE_SOURCE = 'IMAGE_SOURCE',
    NOTE = 'NOTE',
    IMAGE_TO_TEXT = 'IMAGE_TO_TEXT',
    COMPARE = 'COMPARE',
    SPLIT_TEXT = 'SPLIT_TEXT'
}

export interface ImageMetadata {
    size: number
    sizeStr: string
    type: string
}

export interface NodeData {
    prompt: string
    output?: string // For text nodes
    enhancedOutput?: string // For enhanced prompts
    imageResources?: string[] // Generated image resources (UUID or full URL)
    imageCount?: number // Number of images to generate (1-4)
    aspectRatio?: string // '1:1', '16:9', '9:16', '4:3', '3:4'
    outputFormat?: string // 'PNG', 'JPEG'
    enhancePrompt?: boolean // Toggle for prompt enhancement
    model?: string // Selected model name
    preset?: string // Image preset ('1K', '2K', '4K')
    isLoading: boolean
    error?: string

    // For Image to Text and Image Source
    imageInput?: string // Base64 or URL
    imageInputType?: 'UPLOAD' | 'URL'

    // For Compare node
    compareMode?: 'slider' | 'toggle'

    // For Split Text node
    splitSeparator?: string // Default: '===='
    splitOutputs?: string[] // Array of split result parts
    splitPage?: number // Currently selected page index
    includeSplitSeparator?: boolean // For TEXT_GEN: append ==== separator instruction to prompt
}

export interface Node {
    id: string
    type: NodeType
    position: { x: number; y: number }
    data: NodeData
}

export interface Edge {
    id: string
    source: string
    sourceHandle?: string // 'prompt' | 'output' | 'default'
    target: string
    targetHandle?: string // 'prompt' | 'image'
}

export interface ThemeContextType {
    isDark: boolean
    toggleTheme: () => void
}
