import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Link as LinkIcon, Eye, Copy, X, FileText, Code } from 'lucide-react'
import { Node, NodeData } from '../../types'
import { toast } from 'sonner'

interface SplitTextNodeProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    connectedInputText?: string
    onRun: () => void
}

const PRESETS = [
    { label: '====', value: '====' },
    { label: '---', value: '---' },
    { label: 'new line', value: '\\n' },
    { label: ',', value: ',' },
    { label: ';', value: ';' },
]

const PRESET_VALUES = new Set(PRESETS.map((p) => p.value))
const DEFAULT_CUSTOM = '@@@@'

function doSplit(text: string, rawSeparator: string): string[] {
    const separator = rawSeparator.replace(/\\n/g, '\n')
    return text.split(separator).map((s) => s.trim()).filter((s) => s.length > 0)
}

export const SplitTextNode: React.FC<SplitTextNodeProps> = ({ node, updateNodeData, connectedInputText, onRun }) => {
    const { splitSeparator = '====', splitOutputs, error } = node.data
    const hasInput = !!connectedInputText
    const [page, setPage] = useState(0)
    const [showPreview, setShowPreview] = useState(false)
    const [previewPage, setPreviewPage] = useState(0)
    const [previewMode, setPreviewMode] = useState<'text' | 'markdown'>('markdown')
    const [customValue, setCustomValue] = useState(() =>
        PRESET_VALUES.has(splitSeparator) ? DEFAULT_CUSTOM : splitSeparator
    )
    const isCustom = !PRESET_VALUES.has(splitSeparator)

    // Auto-split whenever input text or separator changes
    useEffect(() => {
        if (!connectedInputText) return
        const parts = doSplit(connectedInputText, splitSeparator)
        updateNodeData(node.id, { splitOutputs: parts, error: parts.length === 0 ? 'Split produced no results with that separator.' : undefined })
        setPage(0)
    }, [connectedInputText, splitSeparator])

    // Clamp page when outputs change
    useEffect(() => {
        if (splitOutputs && page >= splitOutputs.length) setPage(Math.max(0, splitOutputs.length - 1))
    }, [splitOutputs])

    // Sync selected page to node.data so downstream connections get the right part
    useEffect(() => {
        updateNodeData(node.id, { splitPage: page })
    }, [page])

    const handleSeparatorChange = (value: string) => {
        updateNodeData(node.id, { splitSeparator: value })
    }

    const total = splitOutputs?.length ?? 0
    const currentPart = total > 0 ? splitOutputs![page] : null

    const openPreview = (e: React.MouseEvent) => {
        e.stopPropagation()
        setPreviewPage(page)
        setShowPreview(true)
        setTimeout(() => (document.querySelector('[data-split-preview]') as HTMLElement)?.focus(), 0)
    }

    const renderMarkdown = (content: string) =>
        content
            .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-5 mb-2">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-slate-200 dark:bg-zinc-700 rounded text-sm">$1</code>')
            .replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>')
            .replace(/\n\n/g, '<br/><br/>')

    return (
        <div className="flex flex-col gap-3">
            {/* Input badge */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Input</span>
                {hasInput ? (
                    <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
                        <LinkIcon size={10} /> Connected
                    </span>
                ) : (
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 italic">No input</span>
                )}
            </div>

            {/* Separator row */}
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Separator</label>
                <div className="flex flex-wrap gap-1">
                    {PRESETS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => handleSeparatorChange(p.value)}
                            className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                                splitSeparator === p.value
                                    ? 'bg-green-500 text-white border-green-500'
                                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        onClick={() => handleSeparatorChange(customValue)}
                        className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                            isCustom
                                ? 'bg-green-500 text-white border-green-500'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                    >
                        custom
                    </button>
                </div>
                {isCustom && (
                    <input
                        type="text"
                        value={splitSeparator}
                        onChange={(e) => {
                            setCustomValue(e.target.value)
                            handleSeparatorChange(e.target.value)
                        }}
                        placeholder="Custom separator…"
                        className="w-full text-xs font-mono p-1.5 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    />
                )}
            </div>

            {/* Output viewer */}
            {currentPart !== null ? (
                <div className="flex flex-col gap-1.5">
                    {/* Part preview */}
                    <div className="text-[10px] text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800 rounded px-2 py-2 border-l-2 border-green-400 min-h-[40px] max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap break-words">
                        {currentPart}
                    </div>
                    {/* Preview button */}
                    <div className="flex justify-end">
                        <button
                            onClick={openPreview}
                            className="flex items-center gap-1 py-0.5 px-2 text-[10px] font-medium rounded border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                            <Eye size={10} />
                            Preview parts
                        </button>
                    </div>
                    {/* Pagination */}
                    {(() => {
                        const PAGE_SIZE = 10
                        const windowStart = Math.floor(page / PAGE_SIZE) * PAGE_SIZE
                        const windowEnd = Math.min(windowStart + PAGE_SIZE, total)
                        const hasPrevWindow = windowStart > 0
                        const hasNextWindow = windowEnd < total
                        return (
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                                <button
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-slate-500 dark:text-zinc-400 transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                {hasPrevWindow && (
                                    <button
                                        onClick={() => setPage(windowStart - 1)}
                                        className="w-6 h-6 text-[10px] font-semibold rounded border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:border-green-400 hover:text-green-500 transition-colors"
                                        title={`Go to part ${windowStart}`}
                                    >
                                        …
                                    </button>
                                )}
                                {Array.from({ length: windowEnd - windowStart }, (_, i) => {
                                    const idx = windowStart + i
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setPage(idx)}
                                            className={`w-6 h-6 text-[10px] font-semibold rounded border transition-colors ${
                                                idx === page
                                                    ? 'bg-white dark:bg-zinc-900 border-green-500 text-green-600 dark:text-green-400'
                                                    : 'bg-transparent border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:border-green-400 hover:text-green-500'
                                            }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    )
                                })}
                                {hasNextWindow && (
                                    <button
                                        onClick={() => setPage(windowEnd)}
                                        className="w-6 h-6 text-[10px] font-semibold rounded border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:border-green-400 hover:text-green-500 transition-colors"
                                        title={`Go to part ${windowEnd + 1}`}
                                    >
                                        …
                                    </button>
                                )}
                                <button
                                    onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
                                    disabled={page === total - 1}
                                    className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-slate-500 dark:text-zinc-400 transition-colors"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )
                    })()}
                </div>
            ) : (
                error && (
                    <div className="text-[10px] text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1 border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )
            )}
            {/* Full-screen preview modal */}
            {showPreview && splitOutputs && splitOutputs.length > 0 && createPortal(
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                    data-split-preview="true"
                    onWheel={(e) => e.stopPropagation()}
                    onClick={(e) => e.target === e.currentTarget && setShowPreview(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') setPreviewPage((p) => Math.max(0, p - 1))
                        if (e.key === 'ArrowRight') setPreviewPage((p) => Math.min(splitOutputs.length - 1, p + 1))
                        if (e.key === 'Escape') setShowPreview(false)
                    }}
                    tabIndex={0}
                >
                    <div className="w-[90vw] max-w-5xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-700 flex flex-col h-[85vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-700 shrink-0">
                            <div className="flex items-center gap-3">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">Split Text Preview</h2>
                                <span className="text-xs text-slate-400 dark:text-zinc-500">Part {previewPage + 1} of {splitOutputs.length}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex rounded-lg bg-slate-100 dark:bg-zinc-800 p-1">
                                    <button
                                        onClick={() => setPreviewMode('text')}
                                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-md transition-colors ${
                                            previewMode === 'text' ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-800 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
                                        }`}
                                    >
                                        <Code size={14} /> Text
                                    </button>
                                    <button
                                        onClick={() => setPreviewMode('markdown')}
                                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-md transition-colors ${
                                            previewMode === 'markdown' ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-800 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
                                        }`}
                                    >
                                        <FileText size={14} /> Markdown
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(splitOutputs[previewPage])
                                        toast.success('Copied to clipboard!')
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors"
                                >
                                    <Copy size={13} /> Copy
                                </button>
                                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                    <X size={20} className="text-slate-500 dark:text-zinc-400" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 bg-slate-50 dark:bg-black/50 custom-scrollbar">
                            {previewMode === 'text' ? (
                                <pre className="text-sm font-mono text-slate-700 dark:text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">{splitOutputs[previewPage]}</pre>
                            ) : (
                                <div className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(splitOutputs[previewPage]) }} />
                            )}
                        </div>

                        {/* Footer navigation */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-zinc-700 shrink-0">
                            <button
                                onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                                disabled={previewPage === 0}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 text-slate-600 dark:text-zinc-300 transition-colors"
                            >
                                <ChevronLeft size={16} /> Previous
                            </button>
                            <div className="flex items-center gap-1 flex-wrap justify-center max-w-lg">
                                {Array.from({ length: splitOutputs.length }, (_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPreviewPage(i)}
                                        className={`w-7 h-7 text-[11px] font-semibold rounded border transition-colors ${
                                            i === previewPage
                                                ? 'bg-white dark:bg-zinc-900 border-green-500 text-green-600 dark:text-green-400'
                                                : 'bg-transparent border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:border-green-400 hover:text-green-500'
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => {
                                    setPage(previewPage)
                                    setShowPreview(false)
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
                            >
                                Select & Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}        </div>
    )
}
