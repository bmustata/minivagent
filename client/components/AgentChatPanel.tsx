import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, X, Send, Loader2, Plus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { createSession, sendMessage, deleteSession, getSession, AgentMessage } from '../services/agentService'
import { Node, Edge } from '../types'

interface AgentChatPanelProps {
    nodes: Node[]
    edges: Edge[]
    graphId?: string
    onGraphPlan: (plan: { nodes: unknown[]; edges: unknown[] }) => void
    onClose: () => void
}

const storageKey = (graphId?: string) => `agent-session:${graphId ?? '__default__'}`

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ nodes, edges, graphId, onGraphPlan, onClose }) => {
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [messages, setMessages] = useState<AgentMessage[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isCreatingSession, setIsCreatingSession] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }

    useEffect(() => {
        if (messages.length > 0) scrollToBottom()
    }, [messages])

    // Build a lightweight graph snapshot (no base64 images) to send as context
    const buildGraphSnapshot = useCallback(() => {
        if (nodes.length === 0) return undefined
        return {
            nodes: nodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: {
                    prompt: n.data.prompt,
                    imageCount: n.data.imageCount,
                    aspectRatio: n.data.aspectRatio,
                    model: n.data.model
                }
            })),
            edges
        }
    }, [nodes, edges])

    const startNewSession = async () => {
        if (sessionId) {
            await deleteSession(sessionId).catch(() => {})
        }
        setIsCreatingSession(true)
        try {
            const session = await createSession()
            setSessionId(session.id)
            setMessages([])
            localStorage.setItem(storageKey(graphId), session.id)
        } finally {
            setIsCreatingSession(false)
        }
    }

    // Auto-create or restore session on mount
    useEffect(() => {
        const init = async () => {
            const stored = localStorage.getItem(storageKey(graphId))
            if (stored) {
                const existing = await getSession(stored).catch(() => null)
                if (existing) {
                    setSessionId(existing.id)
                    setMessages(existing.messages)
                    return
                }
            }
            await startNewSession()
        }
        init()
        return () => {
            // Do NOT delete session on unmount — it's persistent by design
        }
    }, [graphId])

    const handleSend = async () => {
        if (!input.trim() || isLoading || !sessionId) return

        const userMsg: AgentMessage = { role: 'user', content: input.trim(), timestamp: Date.now() }
        setMessages((prev) => [...prev, userMsg])
        setInput('')
        setIsLoading(true)

        try {
            const reply = await sendMessage(sessionId, userMsg.content, buildGraphSnapshot())

            const hasGraph = !!(reply.graphPlan && reply.graphPlan.nodes?.length > 0)
            const assistantMsg: AgentMessage = {
                role: 'assistant',
                content: hasGraph ? '✓ Graph updated on canvas.' : reply.reply,
                timestamp: Date.now()
            }
            setMessages((prev) => [...prev, assistantMsg])

            if (hasGraph) {
                onGraphPlan(reply.graphPlan!)
            }
        } catch (err) {
            const errorMsg: AgentMessage = {
                role: 'assistant',
                content: `**Error:** ${err instanceof Error ? err.message : 'Something went wrong'}`,
                timestamp: Date.now()
            }
            setMessages((prev) => [...prev, errorMsg])
        } finally {
            setIsLoading(false)
            textareaRef.current?.focus()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div
            className="w-80 flex flex-col bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700 overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
            style={{ height: 'calc(100vh - 96px)' }}
            onWheel={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                    <Bot size={14} />
                    Agent Chat
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={startNewSession}
                        disabled={isCreatingSession}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-500 dark:text-zinc-400"
                        title="New conversation"
                    >
                        {isCreatingSession ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-500 dark:text-zinc-400">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {messages.length === 0 && !isCreatingSession && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-slate-400 dark:text-zinc-500">
                        <Bot size={28} className="opacity-40" />
                        <p className="text-xs">Ask me to build or modify your workflow.<br />I can see your current graph.</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                            className={`max-w-[92%] text-xs px-2.5 py-2 rounded-lg leading-relaxed ${
                                msg.role === 'user'
                                    ? 'bg-violet-600 text-white rounded-br-sm'
                                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-bl-sm'
                            }`}
                        >
                            {msg.role === 'user' ? (
                                <span className="whitespace-pre-wrap">{msg.content}</span>
                            ) : (
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                                        li: ({ children }) => <li>{children}</li>,
                                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                        em: ({ children }) => <em className="italic">{children}</em>,
                                        code: ({ children, className }) => {
                                            const isBlock = className?.includes('language-')
                                            return isBlock ? (
                                                <code className="block bg-black/10 dark:bg-white/5 rounded px-2 py-1 mt-1 mb-1.5 font-mono text-[11px] whitespace-pre-wrap overflow-x-auto">{children}</code>
                                            ) : (
                                                <code className="bg-black/10 dark:bg-white/10 rounded px-1 font-mono text-[11px]">{children}</code>
                                            )
                                        },
                                        pre: ({ children }) => <pre className="mb-1.5">{children}</pre>,
                                        h1: ({ children }) => <h1 className="font-bold text-sm mb-1">{children}</h1>,
                                        h2: ({ children }) => <h2 className="font-bold mb-1">{children}</h2>,
                                        h3: ({ children }) => <h3 className="font-semibold mb-0.5">{children}</h3>,
                                        blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-400 dark:border-zinc-500 pl-2 opacity-80 italic mb-1.5">{children}</blockquote>,
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start">
                        <div className="bg-slate-100 dark:bg-zinc-800 rounded-lg rounded-bl-sm px-3 py-2">
                            <Loader2 size={12} className="animate-spin text-slate-400 dark:text-zinc-500" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 border-t border-slate-200 dark:border-zinc-700 shrink-0">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask the agent… (Enter to send)"
                        rows={2}
                        disabled={isLoading || !sessionId}
                        className="flex-1 text-xs p-2 rounded-md bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim() || !sessionId}
                        className="p-2 mb-0.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white rounded-md transition-colors shrink-0"
                    >
                        <Send size={13} />
                    </button>
                </div>
                {nodes.length > 0 && (
                    <p className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1">
                        Graph context: {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>
        </div>
    )
}
