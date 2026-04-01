import type { Request, Response } from 'express'

export interface NodeData {
    prompt: string
    output?: string
    enhancedOutput?: string
    images?: string[]
    imageCount?: number
    aspectRatio?: string
    outputFormat?: string
    enhancePrompt?: boolean
    model?: string // Selected model identifier
    preset?: string // Image size preset ('0.5K', '1K', '2K', '4K')
    isLoading: boolean
    error?: string
    imageInput?: string
    imageInputType?: 'UPLOAD' | 'URL'
    imageResources?: string[] // UUID references to data/resources/
    splitSeparator?: string // For SPLIT_TEXT node
    splitOutputs?: string[] // For SPLIT_TEXT node
    splitPage?: number // Currently selected page index for SPLIT_TEXT
    includeSplitSeparator?: boolean // For TEXT_GEN: append ==== separator instruction to prompt
}

export interface GraphNode {
    id: string
    type: 'TEXT_GEN' | 'IMAGE_GEN' | 'IMAGE_SOURCE' | 'NOTE' | 'IMAGE_TO_TEXT' | 'SPLIT_TEXT'
    position: { x: number; y: number }
    data: NodeData
}

export interface GraphEdge {
    id: string
    source: string
    sourceHandle?: string
    target: string
    targetHandle?: string
}

export interface GraphData {
    name?: string
    nodes: GraphNode[]
    edges: GraphEdge[]
}

export interface ImageMetadata {
    size: number
    sizeStr: string
    type: string
}

export interface ImageMetadataResult {
    totalSize: number
    totalSizeStr: string
    imageDetails: ImageMetadata[]
}

export interface OutputImage {
    index: number
    filename: string
    path: string
    mimeType: string
    size: number
    sizeStr: string
}

export interface ResourceItem {
    id: string // UUID v4 (filename without extension)
    mimeType: string // image/png | image/jpeg | image/webp
    size: number // bytes
    sizeStr: string // human-readable e.g. "1.2 MB"
    createdAt: string // ISO timestamp from fs.statSync().birthtime
}

export interface RenderResult {
    status: string
    graphPath: string
    outputPath: string
    graphName: string
    nodeCount: number
    edgeCount: number
    executedNodes: number
    imagesSaved: number
    resultsFile: string
    outputImages: OutputImage[]
}

export type ExpressHandler = (req: Request, res: Response) => Promise<void> | void
