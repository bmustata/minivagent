import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Download, Check, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw, Box, ScanEye, ChevronDown, Gamepad2 } from 'lucide-react'
import { Node, NodeType } from '../types'
import { ResourceItem, getResourceInfo } from '../services/generateService'

export interface GalleryImage {
    url: string
    nodeId: string
    metadata?: {
        size: number
        sizeStr: string
        type: string
    }
}

interface GalleryModalProps {
    isOpen: boolean
    onClose: () => void
    images: GalleryImage[]
    initialIndex?: number
    nodes?: Node[]
}

export const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, images, initialIndex = 0, nodes = [] }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null)
    const [resourceInfo, setResourceInfo] = useState<ResourceItem | null>(null)
    const [showFormatMenu, setShowFormatMenu] = useState(false)
    const formatMenuRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const dragStart = useRef({ x: 0, y: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    // Sync initial index when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0)
            resetZoom()
        }
    }, [isOpen, initialIndex, images.length])

    // Reset zoom when changing images
    useEffect(() => {
        resetZoom()
    }, [currentIndex])

    const resetZoom = () => {
        setScale(1)
        setPosition({ x: 0, y: 0 })
    }

    const currentImage = images[currentIndex]
    const producerNode = currentImage ? nodes.find((n) => n.id === currentImage.nodeId) : undefined

    // Load image size
    useEffect(() => {
        if (currentImage) {
            setImgSize(null)
            const img = new Image()
            img.src = currentImage.url
            img.onload = () => {
                setImgSize({ width: img.naturalWidth, height: img.naturalHeight })
                const node = nodes.find((n) => n.id === currentImage.nodeId)
                if (node?.type === NodeType.IMAGE_GEN_PIXELATE) {
                    const containerEl = containerRef.current
                    const containerW = containerEl ? containerEl.clientWidth : window.innerWidth
                    const containerH = containerEl ? containerEl.clientHeight : window.innerHeight * 0.75
                    const fitScale = Math.min(containerW / img.naturalWidth, containerH / img.naturalHeight) * 0.85
                    setScale(Math.min(Math.max(fitScale, 1), 5))
                }
            }
        }
    }, [currentImage])

    // Fetch resource info for /api/resources/:id URLs
    useEffect(() => {
        if (!currentImage) return
        const match = currentImage.url.match(/\/api\/resources\/([0-9a-f-]{36})/)
        if (!match) {
            setResourceInfo(null)
            return
        }
        const id = match[1]
        getResourceInfo(id)
            .then(setResourceInfo)
            .catch(() => setResourceInfo(null))
    }, [currentImage?.url])

    const next = useCallback(() => {
        if (images.length === 0) return
        setCurrentIndex((prev) => (prev + 1) % images.length)
    }, [images.length])

    const prev = useCallback(() => {
        if (images.length === 0) return
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    }, [images.length])

    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') next()
            if (e.key === 'ArrowLeft') prev()
            if (e.key === 'Escape') onClose()
            // Zoom shortcuts
            if (e.key === '+' || e.key === '=') handleZoomIn()
            if (e.key === '-') handleZoomOut()
            if (e.key === '0') resetZoom()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, next, prev, onClose])

    // Close format menu on outside click
    useEffect(() => {
        if (!showFormatMenu) return
        const handler = (e: MouseEvent) => {
            if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as unknown as globalThis.Node)) {
                setShowFormatMenu(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showFormatMenu])

    // Zoom Handlers
    const handleZoomIn = () => setScale((s) => Math.min(s + 0.5, 5))
    const handleZoomOut = () => {
        setScale((s) => {
            const newScale = Math.max(s - 0.5, 1)
            if (newScale === 1) setPosition({ x: 0, y: 0 })
            return newScale
        })
    }

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation()
        const delta = -e.deltaY * 0.001
        setScale((s) => {
            const newScale = Math.min(Math.max(s + delta, 1), 5)
            if (newScale === 1) setPosition({ x: 0, y: 0 })
            return newScale
        })
    }

    // Pan Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            e.preventDefault()
            setIsDragging(true)
            dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            e.preventDefault()
            setPosition({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            })
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    const handleDoubleClick = () => {
        if (scale > 1) resetZoom()
        else setScale(2)
    }

    const getNodeLabel = (type?: NodeType) => {
        switch (type) {
            case NodeType.IMAGE_GEN:
                return 'Image Gen'
            case NodeType.IMAGE_GEN_PIXELATE:
                return 'Pixelate'
            case NodeType.IMAGE_SOURCE:
                return 'Source'
            case NodeType.IMAGE_TO_TEXT:
                return 'Vision'
            default:
                return 'Node'
        }
    }

    const getNodeIcon = (type?: NodeType) => {
        switch (type) {
            case NodeType.IMAGE_GEN:
                return <ImageIcon size={16} className="text-purple-500 dark:text-purple-400" />
            case NodeType.IMAGE_GEN_PIXELATE:
                return <Gamepad2 size={16} className="text-teal-500 dark:text-teal-400" />
            case NodeType.IMAGE_SOURCE:
                return <Box size={16} className="text-cyan-500 dark:text-cyan-400" />
            case NodeType.IMAGE_TO_TEXT:
                return <ScanEye size={16} className="text-blue-500 dark:text-blue-400" />
            default:
                return <ImageIcon size={16} className="text-slate-500 dark:text-zinc-500" />
        }
    }

    if (!isOpen || !currentImage) return null

    // Infer format: prefer fetched resource info, then inline metadata, then Base64 header, then URL extension
    let format = 'UNKNOWN TYPE'
    if (resourceInfo?.mimeType) {
        const ext = resourceInfo.mimeType.split('/')[1].toUpperCase()
        format = ext === 'JPG' ? 'JPEG' : ext
    } else if (currentImage.metadata?.type) {
        format = currentImage.metadata.type
    } else {
        const base64Match = currentImage.url.match(/data:image\/(\w+);base64/)
        if (base64Match) {
            format = base64Match[1].toUpperCase()
        } else {
            const urlMatch = currentImage.url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i)
            if (urlMatch) {
                const ext = urlMatch[1].toUpperCase()
                format = ext === 'JPG' ? 'JPEG' : ext
            }
        }
    }

    const handleDownload = (fmt?: string) => {
        setShowFormatMenu(false)

        const isResourceUrl = currentImage.url.startsWith('/api/resources/')
        // Extract GUID from /api/resources/<guid> (strip any trailing query/path)
        const guid = isResourceUrl ? currentImage.url.replace('/api/resources/', '').split('?')[0].split('/')[0] : null

        const resolvedFmt = fmt ?? format.toLowerCase()
        const ext = resolvedFmt === 'jpeg' ? 'jpg' : resolvedFmt

        const href = fmt && isResourceUrl ? `${currentImage.url}?format=${fmt}` : currentImage.url

        let stem: string
        if (guid) {
            if (fmt) {
                // Format conversion — append 6 random safe chars to distinguish from original
                const randomChars = Array.from(crypto.getRandomValues(new Uint8Array(6)))
                    .map((byte) => {
                        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
                        return chars[byte % chars.length]
                    })
                    .join('')
                stem = `minivagent-${guid}-${randomChars}`
            } else {
                stem = `minivagent-${guid}`
            }
        } else {
            // Non-resource URL fallback
            const randomChars = Array.from(crypto.getRandomValues(new Uint8Array(6)))
                .map((byte) => {
                    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
                    return chars[byte % chars.length]
                })
                .join('')
            stem = `minivagent-${randomChars}`
        }

        const link = document.createElement('a')
        link.href = href
        link.download = `${stem}.${ext}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="fixed inset-0 z-[200] bg-white/95 dark:bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200 text-slate-900 dark:text-white selection:bg-purple-500/30">
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-30 pointer-events-none">
                <div className="px-3 py-1 rounded-full bg-slate-100/80 dark:bg-white/10 backdrop-blur-md text-sm font-medium border border-slate-200 dark:border-white/5 pointer-events-auto text-slate-700 dark:text-white">
                    {currentIndex + 1} <span className="text-slate-400 dark:text-white/40">/</span> {images.length}
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-slate-900 dark:text-white/70 dark:hover:text-white pointer-events-auto">
                    <X size={24} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden cursor-default" onWheel={handleWheel} ref={containerRef}>
                {/* Navigation Zones / Buttons - Hidden if zoomed in to allow panning */}
                {scale === 1 && (
                    <>
                        <div className="absolute inset-y-0 left-0 w-1/4 z-20 flex items-center justify-start pl-4 group/nav hover:bg-gradient-to-r hover:from-black/5 dark:hover:from-black/20 hover:to-transparent">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    prev()
                                }}
                                className="p-4 rounded-full bg-white/80 dark:bg-black/50 hover:bg-slate-100 dark:hover:bg-white/20 backdrop-blur-md text-slate-800 dark:text-white shadow-sm transition-all transform -translate-x-4 group-hover/nav:translate-x-0 opacity-0 group-hover/nav:opacity-100"
                            >
                                <ChevronLeft size={32} />
                            </button>
                        </div>

                        <div className="absolute inset-y-0 right-0 w-1/4 z-20 flex items-center justify-end pr-4 group/nav hover:bg-gradient-to-l hover:from-black/5 dark:hover:from-black/20 hover:to-transparent">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    next()
                                }}
                                className="p-4 rounded-full bg-white/80 dark:bg-black/50 hover:bg-slate-100 dark:hover:bg-white/20 backdrop-blur-md text-slate-800 dark:text-white shadow-sm transition-all transform translate-x-4 group-hover/nav:translate-x-0 opacity-0 group-hover/nav:opacity-100"
                            >
                                <ChevronRight size={32} />
                            </button>
                        </div>
                    </>
                )}

                {/* Image Container */}
                <div
                    className={`relative transition-transform duration-75 ease-out ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onDoubleClick={handleDoubleClick}
                >
                    <img
                        src={currentImage.url}
                        alt="Gallery View"
                        className="max-w-full max-h-[80vh] object-contain shadow-2xl drop-shadow-2xl select-none pointer-events-none"
                        style={{ filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.5))' }}
                    />
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="p-4 md:p-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 z-30">
                {/* Metadata */}
                <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-zinc-400 w-full md:w-auto justify-center md:justify-start">
                    {producerNode && (
                        <div className="flex items-center gap-3 border-r border-slate-200 dark:border-white/10 pr-6">
                            {getNodeIcon(producerNode.type)}
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider leading-none">{getNodeLabel(producerNode.type)}</span>
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">#{producerNode.id}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2" title="Image Resolution">
                        <ImageIcon size={16} className="text-slate-500 dark:text-zinc-500" />
                        <div className="flex flex-col">
                            <span className="font-mono text-sm leading-none">{imgSize ? `${imgSize.width} × ${imgSize.height}` : 'Loading...'}</span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Resolution</span>
                        </div>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-300 dark:bg-white/10" />
                    {/* File size display */}
                    <div className="flex flex-col" title="File Size">
                        <span className="text-sm font-mono text-slate-600 dark:text-zinc-400 leading-none">
                            {resourceInfo?.sizeStr ?? currentImage.metadata?.sizeStr ?? 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Size</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-300 dark:bg-white/10" />
                    <div className="flex flex-col" title="File Format">
                        <span className="uppercase font-bold tracking-wider text-sm text-slate-700 dark:text-zinc-300 leading-none">{format}</span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Format</span>
                    </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-full p-1 border border-slate-200 dark:border-white/5">
                    <button
                        onClick={handleZoomOut}
                        className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                        disabled={scale <= 1}
                    >
                        <ZoomOut size={18} />
                    </button>
                    <span className="w-12 text-center text-xs font-mono text-slate-500 dark:text-white/70">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={handleZoomIn}
                        className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                        disabled={scale >= 5}
                    >
                        <ZoomIn size={18} />
                    </button>
                    <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/10 mx-1" />
                    <button onClick={resetZoom} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white" title="Reset Zoom">
                        <RotateCcw size={16} />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
                    {/* Split Download Button */}
                    <div className="relative flex" ref={formatMenuRef}>
                        {/* Primary: download original */}
                        <button
                            onClick={() => handleDownload()}
                            className="flex items-center gap-2 px-4 py-2 rounded-l-md bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors text-sm font-bold shadow-lg shadow-slate-200/50 dark:shadow-white/5"
                        >
                            <Download size={16} />
                            Download
                        </button>
                        {/* Chevron: open format picker */}
                        <button
                            onClick={() => setShowFormatMenu((v) => !v)}
                            className="flex items-center px-2 py-2 rounded-r-md bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors border-l border-white/20 dark:border-black/20 shadow-lg shadow-slate-200/50 dark:shadow-white/5"
                            title="Download as…"
                        >
                            <ChevronDown size={14} />
                        </button>

                        {/* Format dropdown */}
                        {showFormatMenu && (
                            <div className="absolute bottom-full right-0 mb-2 w-40 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden z-50">
                                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-semibold border-b border-slate-100 dark:border-white/5">Download as</div>
                                {[
                                    { label: `Original (${format})`, fmt: undefined },
                                    { label: 'PNG', fmt: 'png' },
                                    { label: 'JPEG', fmt: 'jpg' },
                                    { label: 'WebP', fmt: 'webp' },
                                    { label: 'AVIF', fmt: 'avif' }
                                ].map(({ label, fmt }) => (
                                    <button
                                        key={label}
                                        onClick={() => handleDownload(fmt)}
                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center justify-between"
                                    >
                                        {label}
                                        {fmt === undefined && <Check size={12} className="text-slate-400 dark:text-zinc-500" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
