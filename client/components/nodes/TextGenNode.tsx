import React, { useState, useEffect } from 'react'
import { Play, Loader2, Link as LinkIcon, Sparkles } from 'lucide-react'
import { Node, NodeData } from '../../types'
import { getModels } from '../../services/generateService'
import { ProviderIcon } from '../../assets/ProviderIcon'

interface TextGenNodeProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    connectedInputText?: string
    onRun: () => void
}

export const TextGenNode: React.FC<TextGenNodeProps> = ({ node, updateNodeData, connectedInputText, onRun }) => {
    const { prompt, isLoading, model, enhancePrompt } = node.data
    const [availableModels, setAvailableModels] = useState<{ name: string; model: string; provider: string }[]>([])

    useEffect(() => {
        getModels()
            .then((r) => setAvailableModels(r.models.TEXT ?? []))
            .catch(() => {})
    }, [])

    const modelEntry = model ? availableModels.find((m) => m.model === model) : availableModels[0]
    const modelLabel = model
        ? (availableModels.find((m) => m.model === model)?.name ?? model)
        : availableModels[0] ? `Default (${availableModels[0].name})` : 'Default'
    const modelProvider = modelEntry?.provider ?? 'gemini'

    const isLinked = !!connectedInputText
    const canRun = !!prompt.trim() || isLinked

    const handleWheel = (e: React.WheelEvent) => {
        const target = e.currentTarget as HTMLElement
        if (target.scrollHeight > target.clientHeight) {
            e.stopPropagation()
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Model Badge */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Model</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-[140px]" title={modelLabel}>
                    <ProviderIcon provider={modelProvider} />
                    {modelLabel}
                </span>
            </div>

            {/* Prompt */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase">
                        {isLinked ? 'Input & Instructions' : 'Input Prompt'}
                    </label>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={(e) => { e.stopPropagation(); updateNodeData(node.id, { enhancePrompt: !enhancePrompt }) }}
                            title={enhancePrompt ? 'Prompt Enhancement ON' : 'Prompt Enhancement OFF'}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all border ${
                                enhancePrompt
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-500 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                                    : 'bg-transparent border-transparent text-slate-300 dark:text-zinc-600 hover:text-slate-500 dark:hover:text-zinc-400'
                            }`}
                        >
                            <Sparkles size={9} fill={enhancePrompt ? 'currentColor' : 'none'} />
                            Enhance
                        </button>
                        {isLinked && <LinkIcon size={12} className="text-indigo-500" />}
                    </div>
                </div>

                {isLinked && (
                    <div
                        className="w-full text-xs p-2 mb-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 italic whitespace-pre-wrap max-h-24 overflow-y-auto custom-scrollbar relative group"
                        onWheel={handleWheel}
                    >
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-100 dark:bg-indigo-900 text-[9px] px-1 rounded text-indigo-500">CONTEXT</div>
                        "{connectedInputText}"
                    </div>
                )}

                <textarea
                    className="w-full text-sm p-2 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none placeholder:text-slate-300 dark:placeholder:text-zinc-600"
                    rows={isLinked ? 4 : 6}
                    value={prompt}
                    onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
                    onWheel={handleWheel}
                    placeholder={isLinked ? 'Add instructions for the connected input...' : 'Enter text prompt here...'}
                />
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onRun() }}
                disabled={isLoading || !canRun}
                className="flex items-center justify-center gap-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium rounded-md transition-colors"
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                Generate
            </button>
        </div>
    )
}
