# Supported Models

minivagent supports multiple AI models across different categories. Models can be selected via the API or UI.

## Model Categories

### TEXT

**Purpose:** Text generation and prompt enhancement  
**Models:**

- `gemini-2.5-flash` (default)
- `gemini-3-flash-preview`

**Endpoints:** `POST /api/generate-text`, `POST /api/enhance-prompt`

### IMAGE

**Purpose:** Image generation from text or reference images  
**Models:**

| Name                                | Model                            | Presets          |
| ----------------------------------- | -------------------------------- | ---------------- |
| Nano Banana 1 (2.5 Flash) (default) | `gemini-2.5-flash-image`         | —                |
| Nano Banana Pro (3 Pro)             | `gemini-3-pro-image-preview`     | 1K, 2K, 4K       |
| Nano Banana 2 (3.1 Flash)           | `gemini-3.1-flash-image-preview` | 0.5K, 1K, 2K, 4K |
| Imagen 4                            | `imagen-4.0-generate-001`        | 1K, 2K           |
| Imagen 4 Fast                       | `imagen-4.0-fast-generate-001`   | —                |
| Imagen 4 Ultra                      | `imagen-4.0-ultra-generate-001`  | 1K, 2K           |

**Endpoints:** `POST /api/generate-images`

### VISION

**Purpose:** Image analysis and OCR  
**Models:**

- `gemini-2.5-flash` (default)
- `gemini-3-flash-preview`

**Endpoints:** `POST /api/extract-text-from-image`

### PLANNER

**Purpose:** Workflow generation from natural language  
**Models:**

- `gemini-2.5-flash` (default)

**Endpoints:** `POST /api/plan-graph`

### Retrieve Available Models

`GET /api/models` returns all supported models by category.
