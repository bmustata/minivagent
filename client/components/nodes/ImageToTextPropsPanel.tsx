import React, { useState, useEffect } from 'react'
import { X, ScanEye, Copy, Eye, Play, Loader2, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Node, NodeData } from '../../types'
import { getModels } from '../../services/generateService'
import { TextPreviewModal } from '../TextPreviewModal'

interface ImageToTextPropsPanelProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    connectedInputText?: string
    onClose: () => void
    onRun: () => void
}

export const ImageToTextPropsPanel: React.FC<ImageToTextPropsPanelProps> = ({ node, updateNodeData, connectedInputText, onClose, onRun }) => {
    const { prompt, output, error, model, isLoading, imageInput, imageInputType } = node.data

    const [availableModels, setAvailableModels] = useState<Array<{ name: string; model: string }>>([])
    const [modelsLoading, setModelsLoading] = useState(true)
    const [showPreview, setShowPreview] = useState(false)

    useEffect(() => {
        getModels()
            .then((r) => setAvailableModels(r.models.VISION ?? []))
            .catch(() => {})
            .finally(() => setModelsLoading(false))
    }, [])

    const isLinked = !!connectedInputText
    const hasImage = !!imageInput || isLinked
    const canRun = hasImage

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
                        <select
                            value={model || ''}
                            onChange={(e) => updateNodeData(node.id, { model: e.target.value || undefined })}
                            disabled={modelsLoading}
                            className="w-full text-xs p-1.5 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                        >
                            <option value="">{availableModels[0] ? `Default (${availableModels[0].name})` : 'Default'}</option>
                            {availableModels.map((m) => (
                                <option key={m.model} value={m.model}>{m.name}</option>
                            ))}
                        </select>
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
