import React, { useState, useEffect, useRef } from 'react'
import { X, ScanEye, Copy, Eye, Play, Loader2, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Node, NodeData } from '../../types'
import { getModels } from '../../services/generateService'
import { TextPreviewModal } from '../TextPreviewModal'
import { ProviderIcon } from '../../assets/ProviderIcon'

interface ImageToTextPropsPanelProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    connectedInputText?: string
    onClose: () => void
    onRun: () => void
}

export const ImageToTextPropsPanel: React.FC<ImageToTextPropsPanelProps> = ({ node, updateNodeData, connectedInputText, onClose, onRun }) => {
    const { prompt, output, error, model, isLoading, imageInput, imageInputType } = node.data

    const [availableModels, setAvailableModels] = useState<Array<{ name: string; model: string; provider: string }>>([])
    const [providers, setProviders] = useState<string[]>([])
    const [selectedProvider, setSelectedProvider] = useState<string>('')
    const [modelsLoading, setModelsLoading] = useState(true)
    const [showModelDropdown, setShowModelDropdown] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        getModels()
            .then((r) => {
                setAvailableModels(r.models.VISION ?? [])
                setProviders(r.providers?.VISION ?? [])
            })
            .catch(() => {})
            .finally(() => setModelsLoading(false))
    }, [])

    const isLinked = !!connectedInputText
    const hasImage = !!imageInput || isLinked
    const canRun = hasImage

    useEffect(() => {
        if (!showModelDropdown) return
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowModelDropdown(false)
            }
        }
        document.addEventListener('mousedown', handler, true)
        return () => document.removeEventListener('mousedown', handler, true)
    }, [showModelDropdown])

    const handleWheel = (e: React.WheelEvent) => {
        const target = e.currentTarget as HTMLElement
        if (target.scrollHeight > target.clientHeight) e.stopPropagation()
    }

    return (
        <>
            <div
                className="w-64 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700 overflow-hidden animate-in slide-in-from-right-5 duration-200"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        <ScanEye size={14} />
                        Image to Text
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-500 dark:text-zinc-400">
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-3 flex flex-col gap-3 max-h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar" onWheel={handleWheel}>
                    {/* Model Selector */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 block">Model</label>
                        {providers.length > 1 && (
                            <div className="flex gap-1 mb-1.5 flex-wrap">
                                <button
                                    onClick={() => setSelectedProvider('')}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                                        selectedProvider === ''
                                            ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                                            : 'bg-transparent border-slate-200 text-slate-400 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800'
                                    }`}
                                >
                                    All
                                </button>
                                {providers.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setSelectedProvider(selectedProvider === p ? '' : p)}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors capitalize ${
                                            selectedProvider === p
                                                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                                                : 'bg-transparent border-slate-200 text-slate-400 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        <ProviderIcon provider={p} />
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}
                        {(() => {
                            const filtered = availableModels.filter((m) => !selectedProvider || m.provider === selectedProvider)
                            const selected = availableModels.find((m) => m.model === model) ?? null
                            return (
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        disabled={modelsLoading}
                                        onClick={() => setShowModelDropdown((v) => !v)}
                                        className="w-full flex items-center gap-1.5 text-xs p-1.5 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 text-left"
                                    >
                                        {selected ? (
                                            <>
                                                <ProviderIcon provider={selected.provider} />
                                                <span className="flex-1 truncate">{selected.name}</span>
                                            </>
                                        ) : (
                                            <>
                                                {availableModels[0] && <ProviderIcon provider={availableModels[0].provider} />}
                                                <span className="flex-1 truncate text-slate-400 dark:text-zinc-500">
                                                    {availableModels[0] ? `Default (${availableModels[0].name})` : 'Default'}
                                                </span>
                                            </>
                                        )}
                                        <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0 text-slate-400" fill="currentColor"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>
                                    </button>
                                    {showModelDropdown && (
                                        <div
                                            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-md shadow-lg max-h-48 overflow-y-auto custom-scrollbar"
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onWheel={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 text-left text-slate-400 dark:text-zinc-500"
                                                onClick={() => { updateNodeData(node.id, { model: undefined }); setShowModelDropdown(false) }}
                                            >
                                                {availableModels[0] && <ProviderIcon provider={availableModels[0].provider} />}
                                                <span>{availableModels[0] ? `Default (${availableModels[0].name})` : 'Default'}</span>
                                            </button>
                                            {filtered.map((m) => (
                                                <button
                                                    key={m.model}
                                                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 text-left ${
                                                        model === m.model ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-zinc-200'
                                                    }`}
                                                    onClick={() => { updateNodeData(node.id, { model: m.model }); setShowModelDropdown(false) }}
                                                >
                                                    <ProviderIcon provider={m.provider} />
                                                    <span className="truncate">{m.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })()}
                    </div>

                    {/* Prompt */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase">
                                {isLinked ? 'Linked Prompt(s)' : 'Prompt'}
                            </label>
                            {isLinked && <LinkIcon size={12} className="text-indigo-500" />}
                        </div>

                        {isLinked ? (
                            <div
                                className="w-full text-xs p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 italic whitespace-pre-wrap max-h-24 overflow-y-auto custom-scrollbar"
                                onWheel={handleWheel}
                            >
                                "{connectedInputText}"
                            </div>
                        ) : (
                            <textarea
                                className="w-full text-sm p-2 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y min-h-[80px] placeholder:text-slate-300 dark:placeholder:text-zinc-600"
                                rows={4}
                                value={prompt}
                                onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
                                onWheel={handleWheel}
                                placeholder="Ask about the image..."
                            />
                        )}
                    </div>

                    {/* Output */}
                    {(output || error) && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase">Result</label>
                                {output && (
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(output); toast.success('Copied!') }}
                                        className="flex items-center gap-1 text-slate-400 hover:text-indigo-500 transition-colors text-xs"
                                    >
                                        <Copy size={12} /><span>Copy</span>
                                    </button>
                                )}
                            </div>
                            <div
                                className={`text-sm p-2 rounded-md max-h-40 overflow-y-auto custom-scrollbar ${error ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'}`}
                                onWheel={handleWheel}
                            >
                                {error ? error : output}
                            </div>
                            {output && (
                                <div className="flex justify-end mt-1">
                                    <button onClick={() => setShowPreview(true)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors">
                                        <Eye size={12} /><span>Preview</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Generate Button */}
                <div className="px-3 pb-3 flex justify-end border-t border-slate-100 dark:border-zinc-800 pt-3">
                    <button
                        onClick={onRun}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white text-xs font-medium rounded-md transition-colors"
                    >
                        {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                        Generate
                    </button>
                </div>
            </div>

            <TextPreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} text={output || ''} title="Vision Result Preview" />
        </>
    )
}
