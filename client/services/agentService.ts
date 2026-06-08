const API_BASE = '/api/agent'

export interface AgentMessage {
    role: 'user' | 'assistant'
    content: string
    currentGraph?: unknown
    timestamp: number
}

export interface AgentSession {
    id: string
    createdAt: number
}

export interface AgentReply {
    id: string
    reply: string
    graphPlan?: { nodes: unknown[]; edges: unknown[] }
    messages: AgentMessage[]
}

export const getSession = async (sessionId: string): Promise<{ id: string; createdAt: number; messages: AgentMessage[] } | null> => {
    const res = await fetch(`${API_BASE}/session/${sessionId}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error('Failed to fetch session')
    return res.json()
}

export const createSession = async (): Promise<AgentSession> => {
    const res = await fetch(`${API_BASE}/session`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to create agent session')
    return res.json()
}

export const sendMessage = async (sessionId: string, content: string, currentGraph?: unknown): Promise<AgentReply> => {
    const res = await fetch(`${API_BASE}/session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, currentGraph })
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).error ?? 'Agent request failed')
    }
    return res.json()
}

export const deleteSession = async (sessionId: string): Promise<void> => {
    await fetch(`${API_BASE}/session/${sessionId}`, { method: 'DELETE' })
}
