# MiniVAgent: Digital Alchemy Lab

MiniVAgent is a node-based workflow application powered by Nano Banana Pro for building AI-driven image and text pipelines. Create flexible generation flows by connecting nodes on a visual canvas, leveraging Google Gemini models, OpenAI models, and other modern AI tools.

MiniVAgent is released under the [Apache 2.0 License](LICENSE) and encourages all types of contributions. No contribution is too small, and we want to thank all our community contributors.

---

### Architecture: Three-Layer Stack

```
Handler  (server/handlers/)   — HTTP only: parse req, call service, return JSON
Service  (server/services/)   — Business logic: typed options/results, calls AI APIs
Helper   (server/helpers/)    — Graph traversal, image saving, shared utilities
```

Handlers never contain business logic. Services never touch `req`/`res`.

---

### Handler Pattern

```typescript
export const myHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const timer = startTimer()
        const { param } = req.body
        logger.info(`POST /api/my-endpoint - param: ${param}`)

        const result = await myService({ param })

        logger.info(`POST /api/my-endpoint - ✓ time: ${timer.stop()}s`)
        res.json(result)
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`POST /api/my-endpoint - ✗ error: ${msg}`)
        res.status(500).json({ error: msg })
    }
}
```

Every handler:

- Starts a timer via `startTimer()` and logs elapsed time on success
- Logs incoming parameters at `INFO` level
- Returns a JSON fallback or `500` on error

---

### Service Pattern

```typescript
export interface MyOptions {
    prompt: string
    model?: string
}
export interface MyResult {
    text: string
}

export const myService = async (options: MyOptions): Promise<MyResult> => {
    const validatedModel = validateModel(options.model, 'TEXT')
    const response = await ai.models.generateContent({ model: validatedModel, contents: options.prompt })
    return { text: response.text || '' }
}
```

- Always accepts a typed options object, returns a typed result
- Uses `validateModel(model, category)` — falls back to the category default when `model` is `undefined`
- Never imports from `express`

---

### Reference Image Resolution

Images passed between nodes or via API can be in three forms:

| Prefix                 | Resolution                                                    |
| ---------------------- | ------------------------------------------------------------- |
| `resource:<id>`        | Read from `data/resources/` by UUID, converted to `data:` URI |
| `http://` / `https://` | Fetched at runtime, converted to `data:` URI                  |
| `data:…;base64,…`      | Passed through unchanged                                      |

Handled by `resolveReferenceImages()` in `server/handlers/generationHandlers.ts`.

---

### Graph Execution

Nodes are executed in dependency order by `renderHandlers.ts` calling `executeNode()` in `executionHelpers.ts`.

**Text resolution** (`graphGetConnectedText`):

- Finds edges with `targetHandle === 'prompt'` (or no handle)
- Sorts source nodes by Y position (top → bottom)
- Reads `output` when `sourceHandle === 'output'`, otherwise reads `prompt`
- Joins multiple inputs with `\n\n`

**Image resolution** (`graphGetConnectedImages`):

- Finds edges with `targetHandle === 'image'`
- For `IMAGE_GEN` sources: reads `data.images[index]` from `image-N` handle
- For `IMAGE_SOURCE` sources: reads `data.imageInput`
- For `COMPARE` sources: reads `data.images[index]` from `image-N` handle
- Results sorted by source node Y position

**Text resolution from `SPLIT_TEXT`** (`graphGetConnectedText`):

- Source handle must start with `split-` (e.g. `split-0`, `split-1`)
- Reads `data.splitOutputs[index]` for the matching part index

**Prompt merging rules:**

```
TEXT_GEN : finalPrompt = node.prompt + "\n\n--- Context ---\n" + connectedText
IMAGE_GEN: finalPrompt = node.prompt + " " + connectedText
```

**Node execution behaviour by type:**

| Type            | What `executeNode` does                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `TEXT_GEN`      | Generates text; optionally enhances prompt; appends split-separator instruction when `includeSplitSeparator` is set |
| `IMAGE_GEN`     | Generates images; resolves reference images; saves results as resources                                             |
| `IMAGE_TO_TEXT` | Runs vision model on resolved images; writes to `data.output`                                                       |
| `IMAGE_SOURCE`  | Resolves HTTP/HTTPS URLs to base64; passes through inline `data:` URIs                                              |
| `NOTE`          | Concatenates own text with connected text; writes to `data.output`                                                  |
| `SPLIT_TEXT`    | Splits combined text by `data.splitSeparator` (default `====`); writes parts to `data.splitOutputs`                 |
| `COMPARE`       | Passthrough — no server execution; comparison is client-side only                                                   |

---
