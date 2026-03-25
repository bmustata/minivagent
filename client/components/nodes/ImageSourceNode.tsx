import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Crop, Globe, Maximize2, RotateCcw, RotateCw, Upload } from 'lucide-react'
import { Node, NodeData } from '../../types'

interface ImageSourceNodeProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    onExpand: (imageUrl: string) => void
}

interface CropArea {
    x: number      // % from left (0–100)
    y: number      // % from top (0–100)
    width: number  // % width (0–100)
    height: number // % height (0–100)
}

type DragHandle = 'tl' | 'tr' | 'bl' | 'br' | 'move'

interface DragState {
    handle: DragHandle
    startX: number
    startY: number
    startCrop: CropArea
    containerRect: DOMRect
}

function clamp(v: number, min: number, max: number) {
    return Math.min(max, Math.max(min, v))
}

async function rotateImageData(dataUrl: string, degrees: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const rad = (degrees * Math.PI) / 180
            if (Math.abs(degrees) === 90) {
                canvas.width = img.naturalHeight
                canvas.height = img.naturalWidth
            } else {
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
            }
            const ctx = canvas.getContext('2d')!
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate(rad)
            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
            resolve(canvas.toDataURL('image/png'))
        }
        img.src = dataUrl
    })
}

async function cropImageData(dataUrl: string, crop: CropArea): Promise<string> {
    return new Promise((resolve) => {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            const sx = (crop.x / 100) * img.naturalWidth
            const sy = (crop.y / 100) * img.naturalHeight
            const sw = (crop.width / 100) * img.naturalWidth
            const sh = (crop.height / 100) * img.naturalHeight
            const canvas = document.createElement('canvas')
            canvas.width = Math.max(1, Math.round(sw))
            canvas.height = Math.max(1, Math.round(sh))
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL('image/png'))
        }
        img.src = dataUrl
    })
}

export const ImageSourceNode: React.FC<ImageSourceNodeProps> = ({ node, updateNodeData, onExpand }) => {
    const { imageInput, imageInputType = 'UPLOAD' } = node.data
    const fileInputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<DragState | null>(null)

    const [isCropping, setIsCropping] = useState(false)
    const [cropArea, setCropArea] = useState<CropArea>({ x: 10, y: 10, width: 80, height: 80 })
    const [selectedRatio, setSelectedRatio] = useState<string>('Free')

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

    const handleRotate = async (degrees: number) => {
        if (!imageInput) return
        const rotated = await rotateImageData(imageInput, degrees)
        updateNodeData(node.id, { imageInput: rotated })
    }

    const handleStartCrop = () => {
        setCropArea({ x: 10, y: 10, width: 80, height: 80 })
        setSelectedRatio('Free')
        setIsCropping(true)
    }

    const handleApplyCrop = async () => {
        if (!imageInput) return
        const cropped = await cropImageData(imageInput, cropArea)
        updateNodeData(node.id, { imageInput: cropped })
        setIsCropping(false)
    }

    // Keyboard shortcuts while crop mode is active
    useEffect(() => {
        if (!isCropping) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter') { e.preventDefault(); handleApplyCrop() }
            if (e.key === 'Escape') { e.preventDefault(); setIsCropping(false) }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [isCropping, cropArea, imageInput])

    const handleSetRatio = (label: string, rw: number | null, rh: number | null) => {
        setSelectedRatio(label)
        if (rw === null || rh === null) return // Free — keep current box
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        const targetAspect = rw / rh
        const containerAspect = rect.width / rect.height
        let widthPct: number, heightPct: number
        if (targetAspect > containerAspect) {
            widthPct = 80
            heightPct = (widthPct * rect.width) / (targetAspect * rect.height)
        } else {
            heightPct = 80
            widthPct = (heightPct * rect.height * targetAspect) / rect.width
        }
        widthPct = clamp(widthPct, 5, 95)
        heightPct = clamp(heightPct, 5, 95)
        setCropArea({ x: (100 - widthPct) / 2, y: (100 - heightPct) / 2, width: widthPct, height: heightPct })
    }

    const startDrag = useCallback((e: React.MouseEvent, handle: DragHandle) => {
        e.stopPropagation()
        e.preventDefault()
        if (handle !== 'move') setSelectedRatio('Free') // resizing = free ratio
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        dragRef.current = { handle, startX: e.clientX, startY: e.clientY, startCrop: { ...cropArea }, containerRect: rect }

        const onMouseMove = (me: MouseEvent) => {
            const d = dragRef.current
            if (!d) return
            const dx = ((me.clientX - d.startX) / d.containerRect.width) * 100
            const dy = ((me.clientY - d.startY) / d.containerRect.height) * 100
            const { x, y, width, height } = d.startCrop
            const MIN = 5
            let nx = x, ny = y, nw = width, nh = height
            switch (d.handle) {
                case 'move':
                    nx = clamp(x + dx, 0, 100 - width)
                    ny = clamp(y + dy, 0, 100 - height)
                    break
                case 'tl':
                    nx = clamp(x + dx, 0, x + width - MIN)
                    ny = clamp(y + dy, 0, y + height - MIN)
                    nw = x + width - nx
                    nh = y + height - ny
                    break
                case 'tr':
                    ny = clamp(y + dy, 0, y + height - MIN)
                    nw = clamp(width + dx, MIN, 100 - x)
                    nh = y + height - ny
                    break
                case 'bl':
                    nx = clamp(x + dx, 0, x + width - MIN)
                    nh = clamp(height + dy, MIN, 100 - y)
                    nw = x + width - nx
                    break
                case 'br':
                    nw = clamp(width + dx, MIN, 100 - x)
                    nh = clamp(height + dy, MIN, 100 - y)
                    break
            }
            setCropArea({ x: nx, y: ny, width: nw, height: nh })
        }

        const onMouseUp = () => {
            dragRef.current = null
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }, [cropArea])

    const btnBase = 'flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase rounded-md border transition-colors'
    const btnNeutral = `${btnBase} bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700`

    return (
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

            {/* Content Area */}
            <div
                ref={containerRef}
                className="relative w-full min-h-[160px] bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 group select-none overflow-hidden"
            >
                {imageInput ? (
                    <>
                        <img
                            src={imageInput}
                            alt="Source"
                            className="w-full h-full rounded-lg"
                            style={{ display: 'block', objectFit: isCropping ? 'contain' : 'cover', minHeight: 160 }}
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                        />

                        {isCropping ? (
                            /* Crop overlay */
                            <div
                                className="absolute cursor-move border-2 border-white"
                                style={{
                                    left: `${cropArea.x}%`,
                                    top: `${cropArea.y}%`,
                                    width: `${cropArea.width}%`,
                                    height: `${cropArea.height}%`,
                                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                                }}
                                onMouseDown={(e) => startDrag(e, 'move')}
                            >
                                {/* Rule-of-thirds grid lines */}
                                <div className="absolute inset-0 pointer-events-none" style={{ borderLeft: '1px solid rgba(255,255,255,0.3)', borderRight: '1px solid rgba(255,255,255,0.3)', left: '33.3%', right: '33.3%' }} />
                                <div className="absolute inset-0 pointer-events-none" style={{ borderTop: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.3)', top: '33.3%', bottom: '33.3%' }} />
                                {/* Corner handles */}
                                {(['tl', 'tr', 'bl', 'br'] as const).map((h) => (
                                    <div
                                        key={h}
                                        className="absolute w-3 h-3 bg-white rounded-sm shadow"
                                        style={{
                                            top: h.startsWith('t') ? 0 : undefined,
                                            bottom: h.startsWith('b') ? 0 : undefined,
                                            left: h.endsWith('l') ? 0 : undefined,
                                            right: h.endsWith('r') ? 0 : undefined,
                                            transform: `translate(${h.endsWith('r') ? '50%' : '-50%'}, ${h.startsWith('b') ? '50%' : '-50%'})`,
                                            cursor: h === 'tl' || h === 'br' ? 'nwse-resize' : 'nesw-resize',
                                        }}
                                        onMouseDown={(e) => startDrag(e, h)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button onClick={() => onExpand(imageInput)} className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/40 text-white transition-colors" title="Expand Preview">
                                    <Maximize2 size={16} />
                                </button>
                                {imageInputType === 'UPLOAD' && (
                                    <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/40 text-white transition-colors" title="Change Image">
                                        <Upload size={16} />
                                    </button>
                                )}
                            </div>
                        )}
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

            {/* Image controls — shown only when an image is loaded */}
            {imageInput && (
                isCropping ? (
                    <div className="flex flex-col gap-2">
                        {/* Aspect ratio presets */}
                        <div className="flex flex-wrap gap-1">
                            {([
                                { label: 'Free', rw: null, rh: null },
                                { label: '1:1',  rw: 1,    rh: 1    },
                                { label: '4:3',  rw: 4,    rh: 3    },
                                { label: '3:4',  rw: 3,    rh: 4    },
                                { label: '16:9', rw: 16,   rh: 9    },
                                { label: '9:16', rw: 9,    rh: 16   },
                            ] as const).map(({ label, rw, rh }) => (
                                <button
                                    key={label}
                                    onClick={() => handleSetRatio(label, rw as number | null, rh as number | null)}
                                    className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                                        selectedRatio === label
                                            ? 'bg-cyan-500 text-white border-cyan-500'
                                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-cyan-400 hover:text-cyan-500'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {/* Apply / Cancel */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleApplyCrop}
                                className={`${btnBase} bg-cyan-500 hover:bg-cyan-400 text-white border-transparent`}
                            >
                                <Check size={12} /> Apply <span className="opacity-60 font-mono normal-case text-[9px] ml-0.5">↵</span>
                            </button>
                            <button onClick={() => setIsCropping(false)} className={btnNeutral}>
                                Cancel <span className="opacity-50 font-mono normal-case text-[9px] ml-0.5">Esc</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => handleRotate(-90)} className={btnNeutral} title="Rotate Left">
                            <RotateCcw size={12} />
                        </button>
                        <button onClick={() => handleRotate(90)} className={btnNeutral} title="Rotate Right">
                            <RotateCw size={12} />
                        </button>
                        <button onClick={handleStartCrop} className={btnNeutral} title="Crop">
                            <Crop size={12} />
                        </button>
                    </div>
                )
            )}

            {/* Input Fields */}
            {imageInputType === 'UPLOAD' && <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />}

            {/* Visual Handle Indicator */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-500/50 rounded-l-full blur-[2px]" />
        </div>
    )
}
