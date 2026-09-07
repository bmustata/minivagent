import React, { useState, useEffect, useRef } from 'react'
import { X, Sparkles, Link as LinkIcon, Play, Loader2, Grid3X3, Box } from 'lucide-react'
import { Node, NodeData } from '../../types'
import { getModels } from '../../services/generateService'
import { ProviderIcon } from '../../assets/ProviderIcon'
import { resourceToUrl } from '../../utils/imageUtils'
import { TexturePreviewModal } from './TexturePreviewModal'

interface ImageGenTexturePropsPanelProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    connectedInputText?: string
    onClose: () => void
    onRun: () => void
}

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']
const OUTPUT_FORMATS = ['PNG', 'JPEG']
const TEXTURE_SNAP_POINTS = [8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024]

const snapToNearest = (value: number, points: number[]) =>
    points.reduce((prev, curr) => (Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev))

export const ImageGenTexturePropsPanel: React.FC<ImageGenTexturePropsPanelProps> = ({
    node,
    updateNodeData,
    connectedInputText,
    onClose,
    onRun,
}) => {
    const {
        prompt, enhancePrompt, enhancedOutput, model, preset,
        aspectRatio = '1:1', outputFormat = 'PNG', isLoading,
        imageCount = 1, textureSize = 64, texturePixelate = false, textureResolution = 512,
        imageResources,
    } = node.data

    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewTab, setPreviewTab] = useState<'2d' | '3d'>('2d')
    const previewImageUrl = imageResources && imageResources.length > 0 ? resourceToUrl(imageResources[0]) : null

    const [availableModels, setAvailableModels] = useState<Array<{ name: string; model: string; provider: string; options: any }>>([])
    const [providers, setProviders] = useState<string[]>([])
    const [selectedProvider, setSelectedProvider] = useState<string>('')
    const [modelsLoading, setModelsLoading] = useState(true)
    const [showModelDropdown, setShowModelDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        getModels()
            .then((r) => {
                setAvailableModels(r.models.IMAGE)
                setProviders(r.providers?.IMAGE ?? [])
            })
            .catch(() => {})
            .finally(() => setModelsLoading(false))
    }, [])

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

    const isLinkedText = !!connectedInputText
    const selectedModel = availableModels.find((m) => m.model === model)
    const presets = selectedModel?.options?.presets as string[] | undefined
    const canRun = !!prompt?.trim() || !!connectedInputText

    return (
        <div
            className="w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700 overflow-hidden animate-in slide-in-from-right-5 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                    <Sparkles size={14} />
                    Texture
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
                    {providers.length > 1 && (
                        <div className="flex gap-1 mb-1.5 flex-wrap">
                            <button
                                onClick={() => setSelectedProvider('')}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                                    selectedProvider === ''
                                        ? 'bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300'
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
                                            ? 'bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300'
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
                                    className="w-full flex items-center gap-1.5 text-xs p-1.5 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 text-left"
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
                                            onClick={() => {
                                                const sel = availableModels[0]
                                                updateNodeData(node.id, { model: undefined, preset: sel?.options?.presets?.length ? sel.options.presets[0] : undefined })
                                                setShowModelDropdown(false)
                                            }}
                                        >
                                            {availableModels[0] && <ProviderIcon provider={availableModels[0].provider} />}
                                            <span>{availableModels[0] ? `Default (${availableModels[0].name})` : 'Default'}</span>
                                        </button>
                                        {filtered.map((m) => (
                                            <button
                                                key={m.model}
                                                className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 text-left ${
                                                    model === m.model ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-slate-700 dark:text-zinc-200'
                                                }`}
                                                onClick={() => {
                                                    updateNodeData(node.id, { model: m.model, preset: m.options?.presets?.length ? m.options.presets[0] : undefined })
                                                    setShowModelDropdown(false)
                                                }}
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

                {/* Preset */}
                {presets && presets.length > 0 && (
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 block">
                            {selectedModel?.provider === 'black-forest-labs' ? 'Resolution' : 'Preset'}
                        </label>
                        <select
                            value={preset || presets[0]}
                            onChange={(e) => updateNodeData(node.id, { preset: e.target.value })}
                            className="w-full text-xs p-1.5 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        >
                            {presets.map((p) => (
                                <option key={p} value={p}>{p}</option>
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
                            >
                                <Sparkles size={10} fill={enhancePrompt ? 'currentColor' : 'none'} />
                                {enhancePrompt ? 'Enhanced' : 'Enhance'}
                            </button>
                            {isLinkedText && <LinkIcon size={12} className="text-indigo-500" />}
                        </div>
                    </div>

                    {isLinkedText && (
                        <div
                            className="w-full text-xs p-2 mb-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 italic whitespace-pre-wrap max-h-24 overflow-y-auto custom-scrollbar"
                            onWheel={handleWheel}
                        >
                            "{connectedInputText}"
                        </div>
                    )}

                    <textarea
                        className="w-full text-sm p-2 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-y min-h-[80px] placeholder:text-slate-300 dark:placeholder:text-zinc-600"
                        rows={isLinkedText ? 3 : 4}
                        value={prompt}
                        onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
                        onWheel={handleWheel}
                        placeholder="Describe the texture (e.g. stone wall, mossy bricks, wood planks)…"
                    />

                    {enhancePrompt && enhancedOutput && (
                        <div className="text-[10px] p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 mt-2">
                            <span className="font-bold opacity-80 flex items-center gap-1 mb-1">
                                <Sparkles size={10} /> Enhanced Prompt Used:
                            </span>
                            <p className="italic leading-relaxed opacity-90">{enhancedOutput}</p>
                        </div>
                    )}
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
                                        ? 'bg-white dark:bg-zinc-600 text-orange-600 dark:text-orange-300 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pixelate toggle */}
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Pixelate</label>
                    <button
                        onClick={() => updateNodeData(node.id, { texturePixelate: !texturePixelate })}
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${texturePixelate ? 'bg-orange-500' : 'bg-slate-300 dark:bg-zinc-600'}`}
                    >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${texturePixelate ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </button>
                </div>

                {/* Pixel Grid Size (visible when pixelate is on) */}
                {texturePixelate && (
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">
                            Pixel Grid <span className="text-orange-500 font-mono">{textureSize}px</span>
                        </label>
                        <input
                            type="range"
                            min={8}
                            max={1024}
                            step={1}
                            value={textureSize}
                            list="texture-snap-points"
                            onChange={(e) => updateNodeData(node.id, { textureSize: snapToNearest(Number(e.target.value), TEXTURE_SNAP_POINTS) })}
                            className="w-full accent-orange-500"
                        />
                        <datalist id="texture-snap-points">
                            {TEXTURE_SNAP_POINTS.map((v) => <option key={v} value={v} />)}
                        </datalist>
                        <div className="flex justify-between text-[9px] text-slate-400 dark:text-zinc-600 mt-0.5">
                            <span>8 (coarse)</span>
                            <span>1024 (fine)</span>
                        </div>
                    </div>
                )}

                {/* Output Resolution */}
                <div>
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">
                        Output Resolution <span className="text-orange-500 font-mono">{textureResolution}×{textureResolution}</span>
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                        {([64, 128, 256, 512, 1024] as const).map((res) => (
                            <button
                                key={res}
                                onClick={() => updateNodeData(node.id, { textureResolution: res })}
                                title={res === 64 ? 'Very retro / Quake-style' : res === 128 ? 'Retro with more detail' : res === 256 ? 'Low-poly / retro 3D' : res === 512 ? 'Modern low-poly' : 'High-detail assets'}
                                className={`py-1 rounded text-[10px] font-mono font-bold transition-all border ${
                                    textureResolution === res
                                        ? 'bg-orange-500 border-orange-500 text-white'
                                        : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-orange-400 hover:text-orange-500'
                                }`}
                            >
                                {res >= 1024 ? '1K' : res}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 dark:text-zinc-600 mt-1">
                        <span>retro</span>
                        <span>high-detail</span>
                    </div>
                </div>

                {/* Aspect Ratio & Format */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Ratio</label>
                        <select
                            value={aspectRatio}
                            onChange={(e) => updateNodeData(node.id, { aspectRatio: e.target.value })}
                            className="w-full text-xs p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 border-none text-slate-700 dark:text-zinc-300 focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer"
                        >
                            {ASPECT_RATIOS.map((ratio) => (
                                <option key={ratio} value={ratio}>{ratio}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Format</label>
                        <select
                            value={outputFormat}
                            onChange={(e) => updateNodeData(node.id, { outputFormat: e.target.value })}
                            className="w-full text-xs p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 border-none text-slate-700 dark:text-zinc-300 focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer"
                        >
                            {OUTPUT_FORMATS.map((fmt) => (
                                <option key={fmt} value={fmt}>{fmt}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-3 pb-3 flex flex-col gap-2">
                {previewImageUrl && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setPreviewTab('2d'); setPreviewOpen(true) }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md border border-orange-500/50 text-orange-500 hover:bg-orange-500/10 transition-colors"
                        >
                            <Grid3X3 size={12} />
                            2D Preview
                        </button>
                        <button
                            onClick={() => { setPreviewTab('3d'); setPreviewOpen(true) }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md border border-orange-500/50 text-orange-500 hover:bg-orange-500/10 transition-colors"
                        >
                            <Box size={12} />
                            3D Preview
                        </button>
                    </div>
                )}
                <button
                    onClick={onRun}
                    disabled={isLoading || !canRun}
                    className="flex items-center justify-center gap-1.5 px-3 py-1 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white text-xs font-medium rounded-md transition-colors"
                >
                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                    Generate
                </button>
            </div>

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
