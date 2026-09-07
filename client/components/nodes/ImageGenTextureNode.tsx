import React, { useState, useEffect } from 'react'
import { Play, Loader2, Maximize2, ImageOff, Grid3X3, Box } from 'lucide-react'
import { Node, NodeData } from '../../types'
import { getModels } from '../../services/generateService'
import { resourceToUrl } from '../../utils/imageUtils'
import { ProviderIcon } from '../../assets/ProviderIcon'
import { TexturePreviewModal } from './TexturePreviewModal'

interface ImageGenTextureNodeProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    connectedInputText?: string
    onExpand: (imageUrl: string) => void
    onRun: () => void
}

export const ImageGenTextureNode: React.FC<ImageGenTextureNodeProps> = ({
    node,
    connectedInputText,
    onExpand,
    onRun,
}) => {
    const { prompt, imageResources, isLoading, error, model, imageCount = 1, textureSize = 64, texturePixelate = false, textureResolution = 512, outputFormat = 'PNG' } = node.data
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
    const [availableModels, setAvailableModels] = useState<Array<{ name: string; model: string; provider: string }>>([])
    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewTab, setPreviewTab] = useState<'2d' | '3d'>('2d')

    const previewImageUrl = imageResources && imageResources.length > 0 ? resourceToUrl(imageResources[0]) : null

    useEffect(() => {
        getModels()
            .then((r) => setAvailableModels(r.models.IMAGE))
            .catch(() => {})
    }, [])

    const modelEntry = model ? availableModels.find((m) => m.model === model) : availableModels[0]
    const modelLabel = model
        ? (availableModels.find((m) => m.model === model)?.name ?? model)
        : availableModels[0] ? `Default (${availableModels[0].name})` : 'Default'
    const modelProvider = modelEntry?.provider ?? 'gemini'

    const canRun = !!prompt?.trim() || !!connectedInputText

    return (
        <div className="flex flex-col gap-3">
            {/* Model row */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Model</span>
                <div className="flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 font-medium min-w-0 max-w-[140px]">
                    <ProviderIcon provider={modelProvider} />
                    <span className="truncate min-w-0" title={modelLabel}>{modelLabel}</span>
                </div>
            </div>

            {/* Param badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-mono">
                    seamless
                </span>
                {texturePixelate && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-mono">
                        {textureSize}px
                    </span>
                )}
            </div>

            {error && (
                <div className="text-xs p-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-md">{error}</div>
            )}

            {/* Output image grid */}
            {imageResources && imageResources.length > 0 && !isLoading && (
                <div className={`grid gap-2 ${imageResources.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {imageResources.map((item, idx) => {
                        const imgUrl = resourceToUrl(item)
                        const hasError = imgErrors[item]
                        return (
                            <div
                                key={item}
                                className={`relative group w-full ${imageResources.length === 1 ? 'h-48' : 'h-28'} bg-slate-100 dark:bg-zinc-950 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 flex items-center justify-center`}
                            >
                                {hasError ? (
                                    <div className="flex flex-col items-center justify-center gap-1 text-slate-300 dark:text-zinc-600">
                                        <ImageOff size={20} />
                                        <span className="text-[9px]">Not available</span>
                                    </div>
                                ) : (
                                    <img
                                        src={imgUrl}
                                        alt={`Texture output ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        style={texturePixelate ? { imageRendering: 'pixelated' } : undefined}
                                        onError={() => setImgErrors((prev) => ({ ...prev, [item]: true }))}
                                    />
                                )}
                                {!hasError && (
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => onExpand(imgUrl)}
                                            className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/40 text-white transition-colors"
                                        >
                                            <Maximize2 size={16} />
                                        </button>
                                    </div>
                                )}
                                <div
                                    className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500/50 rounded-l-full blur-[2px] transition-opacity ${imageResources.length > 1 && idx % 2 === 0 ? 'opacity-0' : 'opacity-100'}`}
                                />
                            </div>
                        )
                    })}
                </div>
            )}

            {previewImageUrl && !isLoading && (
                <div className="flex gap-1.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); setPreviewTab('2d'); setPreviewOpen(true) }}
                        className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium rounded-md border border-orange-400/50 text-orange-500 dark:text-orange-400 hover:bg-orange-500/10 transition-colors"
                    >
                        <Grid3X3 size={11} />
                        2D
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setPreviewTab('3d'); setPreviewOpen(true) }}
                        className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium rounded-md border border-orange-400/50 text-orange-500 dark:text-orange-400 hover:bg-orange-500/10 transition-colors"
                    >
                        <Box size={11} />
                        3D
                    </button>
                </div>
            )}

            <button
                onClick={(e) => { e.stopPropagation(); onRun() }}
                disabled={isLoading || !canRun}
                className="flex items-center justify-center gap-2 flex-1 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-md transition-colors"
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                Generate
            </button>

            {previewImageUrl && (
                <TexturePreviewModal
                    isOpen={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    imageUrl={previewImageUrl}
                    pixelated={texturePixelate}
                    initialTab={previewTab}
                    textureResolution={textureResolution}
                    outputFormat={outputFormat}
                    textureSize={texturePixelate ? textureSize : undefined}
                />
            )}
        </div>
    )
}
