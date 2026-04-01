import React, { useRef, useState, useEffect } from 'react'
import { Link as LinkIcon, Upload, Globe, Maximize2, Play, Loader2 } from 'lucide-react'
import { Node, NodeData } from '../../types'
import { getModels } from '../../services/generateService'
import { ProviderIcon } from '../../assets/ProviderIcon'

interface ImageToTextNodeProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    connectedInputText?: string
    connectedInputImages?: string[]
    onRun: () => void
    onExpand: (imageUrl: string) => void
}

export const ImageToTextNode: React.FC<ImageToTextNodeProps> = ({ node, updateNodeData, connectedInputImages = [], onRun, onExpand }) => {
    const { imageInput, imageInputType = 'UPLOAD', model, isLoading } = node.data
    const [availableModels, setAvailableModels] = useState<Array<{ name: string; model: string; provider: string }>>([])

    const hasLinkedImages = connectedInputImages.length > 0
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        getModels()
            .then((r) => setAvailableModels(r.models.VISION ?? []))
            .catch(() => {})
    }, [])

    const modelEntry = model ? availableModels.find((m) => m.model === model) : availableModels[0]
    const modelLabel = model
        ? (availableModels.find((m) => m.model === model)?.name ?? model)
        : availableModels[0] ? `Default (${availableModels[0].name})` : 'Default'
    const modelProvider = modelEntry?.provider ?? 'gemini'

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
                if (event.target?.result) {
                    updateNodeData(node.id, { imageInput: event.target.result as string })
                }
            }
            reader.readAsDataURL(file)
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Model Badge */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Model</span>
                <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate max-w-[160px]" title={modelLabel}>
                    <ProviderIcon provider={modelProvider} />
                    {modelLabel}
                </span>
            </div>

            {/* Image Input Section */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase flex items-center justify-between">
                    <span>Source Image</span>
                    {hasLinkedImages && (
                        <span className="text-[10px] text-pink-500 flex items-center gap-1">
                            <LinkIcon size={10} /> Linked ({connectedInputImages.length})
                        </span>
                    )}
                </label>

                {hasLinkedImages ? (
                    <div className="relative w-full h-32 bg-slate-100 dark:bg-zinc-800 rounded-md overflow-hidden border border-pink-200 dark:border-pink-900/50 group">
                        <img src={connectedInputImages[0]} alt="Linked Input" className="w-full h-full object-cover opacity-80" />

                        {connectedInputImages.length > 1 && <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">+{connectedInputImages.length - 1}</div>}

                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity">
                            <div className="flex gap-2">
                                <div className="p-2 bg-black/20 backdrop-blur-sm rounded-full text-white">
                                    <LinkIcon size={16} />
                                </div>
                                {connectedInputImages[0] && (
                                    <button
                                        onClick={() => onExpand(connectedInputImages[0])}
                                        className="p-2 bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/40 text-white transition-colors"
                                    >
                                        <Maximize2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {/* Tabs */}
                        <div className="flex rounded-md bg-slate-100 dark:bg-zinc-800 p-1">
                            <button
                                onClick={() => updateNodeData(node.id, { imageInputType: 'UPLOAD' })}
                                className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors flex items-center justify-center gap-1 ${imageInputType === 'UPLOAD' ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-800 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'}`}
                            >
                                <Upload size={12} /> Upload
                            </button>
                            <button
                                onClick={() => updateNodeData(node.id, { imageInputType: 'URL' })}
                                className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors flex items-center justify-center gap-1 ${imageInputType === 'URL' ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-800 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'}`}
                            >
                                <Globe size={12} /> URL
                            </button>
                        </div>

                        {/* Preview / Upload Area */}
                        <div className="relative w-full min-h-[140px] bg-slate-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 group">
                            {imageInput ? (
                                <>
                                    <img src={imageInput} alt="Source" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                    <div className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
                                        <button onClick={() => onExpand(imageInput)} className="p-2 bg-black/30 backdrop-blur-sm rounded-full hover:bg-black/50 text-white transition-colors pointer-events-auto" title="Expand Preview">
                                            <Maximize2 size={16} />
                                        </button>
                                        {imageInputType === 'UPLOAD' && (
                                            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/40 text-white transition-colors opacity-0 group-hover:opacity-100 pointer-events-auto" title="Change Image">
                                                <Upload size={16} />
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500">
                                    {imageInputType === 'UPLOAD' ? (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex flex-col items-center cursor-pointer p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors w-full h-full justify-center"
                                        >
                                            <Upload size={24} className="mb-2" />
                                            <span className="text-xs font-medium">Click to Upload</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center p-4 w-full">
                                            <Globe size={24} className="mb-2" />
                                            <span className="text-xs font-medium text-center mb-2">Enter URL below</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Inputs */}
                        {imageInputType === 'UPLOAD' && <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />}
                    </div>
                )}
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onRun() }}
                disabled={isLoading || (!imageInput && !hasLinkedImages)}
                className="flex items-center justify-center gap-2 w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-md transition-colors"
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                Generate
            </button>
        </div>
    )
}
