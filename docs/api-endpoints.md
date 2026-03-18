# API Endpoints

All API endpoints are available under the `/api/` prefix:

**Health & Meta:**

- `GET /api/health` - Health check
- `GET /api/models` - Get all supported AI models
- `GET /api/meta` - All endpoints as JSON
- `GET /api/meta-llms` - All endpoints as Markdown (LLM-friendly)

**Generation:**

- `POST /api/enhance-prompt` - Enhance/optimize a prompt
- `POST /api/generate-text` - Generate text from prompt (optional `model` parameter)
- `POST /api/extract-text-from-image` - Extract text from images using vision (optional `model` parameter)
- `POST /api/generate-images` - Generate images from prompt (optional `model` parameter)
- `POST /api/plan-graph` - AI-powered graph planning

**Execution:**

- `POST /api/render/run` — Execute an inline graph (pass `nodes`, `edges?`, `name?` directly in the body — no saved graph required).
- `POST /api/render/:graphId/run` — Execute a saved graph, returns node states as JSON. Optional body: `nodes`, `edges`, `name` to override graph data.
- `POST /api/render/:graphId/run/stream` — Same execution streamed as Server-Sent Events.

**SSE events for `/run/stream`:**

| Event        | Payload                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| `job_start`  | `jobId`, `graphId`, `graphName`, `nodeCount`, `edgeCount`, `executionOrder`                              |
| `node_start` | `nodeId`, `type`                                                                                         |
| `node_end`   | Node result                                                                                              |
| `job_done`   | `status`, `graphId`, `graphName`, `nodeCount`, `edgeCount`, `executedNodes`, `elapsed`, `nodes`, `edges` |
| `job_error`  | `{ error: string }`                                                                                      |

**Graph Management:**

- `GET /api/graphs` - List all graphs
- `GET /api/graphs/:graphId` - Get specific graph
- `POST /api/graphs` - Create new graph
- `PUT /api/graphs/:graphId` - Update graph
- `DELETE /api/graphs/:graphId` - Delete graph

**Resources:**

- `GET /api/resources` - List all stored image resources
- `POST /api/resources` - Upload an image (`multipart/form-data`, field: `file`; accepted: PNG, JPEG, WebP)
- `GET /api/resources/:id/info` - Get image metadata (id, mimeType, size, createdAt)
- `GET /api/resources/:id` - Fetch raw image binary
- `DELETE /api/resources/:id` - Delete an image

## Quick Reference

| Method | Path                              | Description                                                           |
| ------ | --------------------------------- | --------------------------------------------------------------------- |
| GET    | `/api/health`                     | Health check                                                          |
| GET    | `/api/models`                     | All supported models by category                                      |
| GET    | `/api/meta`                       | All endpoints as JSON                                                 |
| GET    | `/api/meta-llms`                  | All endpoints as Markdown (LLM-friendly)                              |
| POST   | `/api/enhance-prompt`             | AI-enhance a prompt                                                   |
| POST   | `/api/generate-text`              | Generate text from prompt                                             |
| POST   | `/api/extract-text-from-image`    | Vision / image-to-text                                                |
| POST   | `/api/generate-images`            | Generate images from prompt                                           |
| POST   | `/api/plan-graph`                 | Natural language → graph JSON                                         |
| POST   | `/api/render/run`                 | Execute an inline graph (nodes/edges in body, no saved file required) |
| POST   | `/api/render/:graphId/run`        | Execute saved graph, returns unified node states as JSON              |
| POST   | `/api/render/:graphId/run/stream` | Execute graph, streams results as SSE                                 |
| GET    | `/api/graphs`                     | List saved graphs                                                     |
| GET    | `/api/graphs/:graphId`            | Get graph by ID                                                       |
| POST   | `/api/graphs`                     | Create graph                                                          |
| PUT    | `/api/graphs/:graphId`            | Update graph                                                          |
| DELETE | `/api/graphs/:graphId`            | Delete graph                                                          |
| GET    | `/api/resources`                  | List image resources                                                  |
| POST   | `/api/resources`                  | Upload image (`multipart/form-data`, field: `file`)                   |
| GET    | `/api/resources/:id/info`         | Resource metadata                                                     |
| GET    | `/api/resources/:id`              | Raw image binary                                                      |
| DELETE | `/api/resources/:id`              | Delete resource                                                       |
