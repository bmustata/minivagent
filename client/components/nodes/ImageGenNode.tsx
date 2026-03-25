import React, { useState, useEffect } from 'react'
import { Play, Loader2, Maximize2, Info, ImageOff } from 'lucide-react'
import { Node, NodeData } from '../../types'
import { getModels } from '../../services/generateService'
import { resourceToUrl } from '../../utils/imageUtils'

interface ImageGenNodeProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    connectedInputText?: string
    connectedInputImages?: string[]
    onExpand: (imageUrl: string) => void
    onRun: () => void
}

export const ImageGenNode: React.FC<ImageGenNodeProps> = ({ node, connectedInputText, connectedInputImages = [], onExpand, onRun }) => {
    const { prompt, imageResources, isLoading, error, imageCount = 1, model } = node.data
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
    const [inputThumbError, setInputThumbError] = useState(false)
    const [availableModels, setAvailableModels] = useState<Array<{ name: string; model: string }>>([]);

    useEffect(() => {
        getModels()
            .then((r) => setAvailableModels(r.models.IMAGE))
            .catch(() => {})
    }, [])

    // Reset input thumb error when connected image changes
    useEffect(() => {
        setInputThumbError(false)
    }, [connectedInputImages[0]])

    const modelLabel = model
        ? (availableModels.find((m) => m.model === model)?.name ?? model)
        : 'Default'

    const hasImages = connectedInputImages.length > 0
    const canRun = !!prompt.trim() || !!connectedInputText || hasImages

    return (
        <div className="flex flex-col gap-3">
            {/* Model Badge */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Model</span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate max-w-[140px]" title={modelLabel}>{modelLabel}</span>
            </div>

            {/* Image Input Status — only shown when connected */}
            {hasImages && <div className="flex items-center gap-2">
                <div
                    className="w-10 h-10 rounded-md flex items-center justify-center border relative overflow-hidden bg-pink-100 dark:bg-pink-900/20 border-pink-300 dark:border-pink-700"
                >
                    {inputThumbError ? (
                        <ImageOff size={14} className="text-pink-400" />
                    ) : (
                        <img src={connectedInputImages[0]} alt="Input" className="w-full h-full object-cover rounded-md" onError={() => setInputThumbError(true)} />
                    )}
                    {connectedInputImages.length > 1 && (
                        <div className="absolute bottom-0 right-0 bg-pink-500 text-white text-[8px] font-bold px-1 rounded-tl-md">+{connectedInputImages.length - 1}</div>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400">Image Input</span>
                    <span className="text-[10px] text-pink-500">
                        {connectedInputImages.length} Connected
                    </span>
                </div>
            </div>}

            {error && <div className="text-xs p-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-md">{error}</div>}

            {/* Output Image Grid */}
            {imageResources && imageResources.length > 0 && !isLoading && (
                <div className="space-y-2">
                    <div className="flex items-center px-2 py-1 bg-purple-50 dark:bg-purple-900/10 rounded-md border border-purple-200 dark:border-purple-900/30">
                        <div className="flex items-center gap-1.5 text-[10px] text-purple-600 dark:text-purple-400">
                            <Info size={10} />
                            <span className="font-semibold">
                                {imageResources.length} image{imageResources.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

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
                                            alt={`Generated output ${idx + 1}`}
                                            className="w-full h-full object-cover"
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
                                        className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-500/50 rounded-l-full blur-[2px] transition-opacity ${imageResources.length > 1 && idx % 2 === 0 ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Generate Button */}
            <button
                onClick={onRun}
                disabled={isLoading || !canRun}
                className="flex items-center justify-center gap-2 w-full py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-md transition-colors"
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                Generate
            </button>
        </div>
    )
}

