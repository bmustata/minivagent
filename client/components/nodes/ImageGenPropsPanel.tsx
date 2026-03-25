import React, { useState, useEffect } from 'react'
import { X, Sparkles, Link as LinkIcon, Play, Loader2 } from 'lucide-react'
import { Node, NodeData } from '../../types'
import { getModels } from '../../services/generateService'

interface ImageGenPropsPanelProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    connectedInputText?: string
    onClose: () => void
    onRun: () => void
}

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']
const OUTPUT_FORMATS = ['PNG', 'JPEG']

export const ImageGenPropsPanel: React.FC<ImageGenPropsPanelProps> = ({ node, updateNodeData, connectedInputText, onClose, onRun }) => {
    const { prompt, enhancePrompt, enhancedOutput, model, preset, imageCount = 1, aspectRatio = '1:1', outputFormat = 'PNG', isLoading } = node.data

    const [availableModels, setAvailableModels] = useState<Array<{ name: string; model: string; options: any }>>([])
    const [modelsLoading, setModelsLoading] = useState(true)

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await getModels()
                setAvailableModels(response.models.IMAGE)
            } catch {
                // silently fail — Canvas.tsx shows toast on node-level errors
            } finally {
                setModelsLoading(false)
            }
        }
        fetchModels()
    }, [])

    const isLinkedText = !!connectedInputText

    const handleWheel = (e: React.WheelEvent) => {
        const target = e.currentTarget as HTMLElement
        if (target.scrollHeight > target.clientHeight) {
            e.stopPropagation()
        }
    }

    const selectedModel = availableModels.find((m) => m.model === model)
    const presets = selectedModel?.options?.presets as string[] | undefined

    return (
        <div
            className="w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700 overflow-hidden animate-in slide-in-from-right-5 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    <Sparkles size={14} />
                    Image Generator
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-500 dark:text-zinc-400">
                    <X size={14} />
                </button>
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col gap-3 max-h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar">
                {/* Model Selector */}
                <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 block">Model</label>
                    <select
                        value={model || ''}
                        onChange={(e) => {
                            const sel = availableModels.find((m) => m.model === e.target.value)
                            const updates: Partial<NodeData> = { model: e.target.value || undefined }
                            if (sel?.options?.presets?.length) {
                                updates.preset = sel.options.presets[0]
                            } else {
                                updates.preset = undefined
                            }
                            updateNodeData(node.id, updates)
                        }}
                        disabled={modelsLoading}
                        className="w-full text-xs p-1.5 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                    >
                        <option value="">{availableModels[0] ? `Default (${availableModels[0].name})` : 'Default'}</option>
                        {availableModels.map((m) => (
                            <option key={m.model} value={m.model}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Preset Selector — conditional on model */}
                {presets && presets.length > 0 && (
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 block">Preset</label>
                        <select
                            value={preset || presets[0]}
                            onChange={(e) => updateNodeData(node.id, { preset: e.target.value })}
                            className="w-full text-xs p-1.5 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        >
                            {presets.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Prompt */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase block">
                            {isLinkedText ? 'Prompt & Context' : 'Prompt'}
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => updateNodeData(node.id, { enhancePrompt: !enhancePrompt })}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all duration-200 border ${
                                    enhancePrompt
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                                        : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800'
                                }`}
                                title={enhancePrompt ? 'Disable Prompt Enhancement' : 'Enable Prompt Enhancement'}
                            >
                                <Sparkles size={10} fill={enhancePrompt ? 'currentColor' : 'none'} />
                                {enhancePrompt ? 'Enhanced' : 'Enhance'}
                            </button>
                            {isLinkedText && <LinkIcon size={12} className="text-indigo-500" />}
                        </div>
                    </div>

                    {isLinkedText && (
                        <div
                            className="w-full text-xs p-2 mb-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 italic whitespace-pre-wrap max-h-24 overflow-y-auto custom-scrollbar relative group"
                            onWheel={handleWheel}
                        >
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-100 dark:bg-indigo-900 text-[9px] px-1 rounded text-indigo-500">
                                CONTEXT
                            </div>
                            "{connectedInputText}"
                        </div>
                    )}

                    <textarea
                        className="w-full text-sm p-2 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y min-h-[80px] placeholder:text-slate-300 dark:placeholder:text-zinc-600"
                        rows={isLinkedText ? 3 : 6}
                        value={prompt}
                        onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
                        onWheel={handleWheel}
                        placeholder={isLinkedText ? 'Add details to the context...' : 'Describe the image...'}
                    />

                    {enhancePrompt && enhancedOutput && (
                        <div className="text-[10px] p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <span className="font-bold opacity-80 flex items-center gap-1 mb-1">
                                <Sparkles size={10} /> Enhanced Prompt Used:
                            </span>
                            <p className="italic leading-relaxed opacity-90">{enhancedOutput}</p>
                        </div>
                    )}
                </div>

                {/* Aspect Ratio & Format */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Ratio</label>
                        <select
                            value={aspectRatio}
                            onChange={(e) => updateNodeData(node.id, { aspectRatio: e.target.value })}
                            className="w-full text-xs p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 border-none text-slate-700 dark:text-zinc-300 focus:ring-1 focus:ring-purple-500 outline-none cursor-pointer"
                        >
                            {ASPECT_RATIOS.map((ratio) => (
                                <option key={ratio} value={ratio}>
                                    {ratio}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Format</label>
                        <select
                            value={outputFormat}
                            onChange={(e) => updateNodeData(node.id, { outputFormat: e.target.value })}
                            className="w-full text-xs p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 border-none text-slate-700 dark:text-zinc-300 focus:ring-1 focus:ring-purple-500 outline-none cursor-pointer"
                        >
                            {OUTPUT_FORMATS.map((fmt) => (
                                <option key={fmt} value={fmt}>
                                    {fmt}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Count */}
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Count</label>
                    <div className="flex gap-1 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-md">
                        {[1, 2, 3, 4].map((num) => (
                            <button
                                key={num}
                                onClick={() => updateNodeData(node.id, { imageCount: num })}
                                className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-all ${
                                    imageCount === num
                                        ? 'bg-white dark:bg-zinc-600 text-purple-600 dark:text-purple-300 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Generate Button */}
            <div className="px-3 pb-3 flex justify-end">
                <button
                    onClick={onRun}
                    disabled={isLoading || (!prompt.trim() && !connectedInputText)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white text-xs font-medium rounded-md transition-colors"
                >
                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                    Generate
                </button>
            </div>
        </div>
    )
}
