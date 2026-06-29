# NERVI — Complete Project Report

| Resource | Link |
|---|---|
| NERVI CLI repo | https://github.com/dsainvg/NERVI |
| NERVI docs & marketplace | https://nervi.dsainvg.me |
| npuserver repo | https://github.com/dsainvg/npuserver |
| npuserver docs | https://dev.dsainvg.me/npuserver/ |
| Training data repo | https://github.com/dsainvg/data_qwen3.5_4B_finetune |
| HuggingFace models | https://huggingface.co/durgasai299792458 |
| Extension marketplace | https://nervi.dsainvg.me/marketplace |
| Personal site | https://dsainvg.me |

**Author:** Durga Sai (dsainvg)  
**GitHub:** [github.com/dsainvg](https://github.com/dsainvg)  
**Personal Site:** [dsainvg.me](https://dsainvg.me)  
**HuggingFace:** [durgasai299792458](https://huggingface.co/durgasai299792458)

---

## Executive Summary

NERVI is a fully self-built, end-to-end local AI inference platform targeting Intel NPU hardware. It spans a Go-based CLI frontend, a Python/Flask backend inference server (`npuserver`), fine-tuned LLMs converted to OpenVINO INT4 format, synthetic training data, a live extension marketplace backed by Cloudflare infrastructure, and complete public documentation. Every layer — from the hardware driver integration to the extension IPC protocol to the model fine-tuning pipeline — was designed and implemented by a single developer.

The project answers a specific, hard problem: running large language models fully offline, without a GPU, on the Neural Processing Unit (NPU) integrated into modern Intel Core Ultra laptops, while providing a polished user experience comparable to tools like Ollama.

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [NERVI CLI — Go Frontend](#2-nervi-cli--go-frontend)
3. [npuserver — Python Backend](#3-npuserver--python-backend)
4. [Model Pipeline — Fine-Tuning & Conversion](#4-model-pipeline--fine-tuning--conversion)
5. [Extension System](#5-extension-system)
6. [Extension Marketplace & Infrastructure](#6-extension-marketplace--infrastructure)
7. [Documentation Site](#7-documentation-site)
8. [Technology Stack Summary](#8-technology-stack-summary)
9. [Key Technical Decisions & Engineering Highlights](#9-key-technical-decisions--engineering-highlights)
10. [Project Scope Assessment](#10-project-scope-assessment)

---

## 1. Project Architecture

NERVI is structured as a two-process system with a clear boundary between the Go frontend and the Python backend. These are not mere wrappers — each layer performs non-trivial work that the other cannot do.

```
User (terminal)
      │  commands / chat
      ▼
┌─────────────────────────────────────────┐
│         NERVI CLI  (Go binary)          │
│                                         │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ Interactive │  │  Server manager  │  │
│  │    shell    │  │  (spawn / kill)  │  │
│  │ ANSI TUI    │  │  PID tracking    │  │
│  └─────────────┘  └──────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │       Extension broker           │   │
│  │   stdin/stdout IPC, tool/menu    │   │
│  └──────────────────────────────────┘   │
└──────────────────┬──────────────────────┘
                   │  REST / SSE  (HTTP)
                   ▼
┌─────────────────────────────────────────┐
│       npuserver  (Flask / Python)       │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ Model        │  │ Compile pipeline │  │
│  │ registry     │  │ LLMPipeline →   │  │
│  │ (4 states)   │  │ .blob files     │  │
│  └──────────────┘  └─────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  Chat completions (OpenAI API)   │   │
│  │  Blocking + SSE streaming        │   │
│  └──────────────────────────────────┘   │
└──────────────────┬──────────────────────┘
                   │  ov_genai Python API
                   ▼
         OpenVINO GenAI runtime
                   │
                   ▼
         Intel AI Boost NPU
         (Core Ultra, Meteor Lake+)
```

**External ecosystem connections:**

- **HuggingFace Hub** (`durgasai299792458`) — hosts fine-tuned, INT4-quantized OpenVINO models ready for NERVI
- **Cloudflare Workers + D1** — backs the extension marketplace API and storage
- **Synthetic dataset repo** (`data_qwen3.5_4B_finetune`) — the training data used to produce the NERVI-optimised models

---

## 2. NERVI CLI — Go Frontend

**Repository:** `github.com/dsainvg/NERVI`  
**Install:** `go install github.com/dsainvg/NERVI@latest`  
**Binary:** `nervi` (Linux/macOS) / `nervi.exe` (Windows)

### 2.1 Core Design

The CLI is a single compiled Go binary with zero runtime dependencies from the user's perspective. On first use it self-bootstraps a managed Python virtual environment under the platform config directory (`%AppData%\Roaming\nervi\` on Windows, `~/.config/nervi/` on Unix), installs `npuserver` from PyPI, and writes a `.nervi_ready` sentinel so subsequent invocations skip the setup entirely.

The Go process communicates with the Flask backend purely over REST/SSE on localhost. It auto-spawns the Flask server as a subprocess when needed, tracks the PID in `server.pid`, and can cleanly terminate it with `nervi kill`.

### 2.2 Interactive Shell (`nervi run`)

The interactive chat interface is built from scratch using raw ANSI escape codes — no third-party TUI framework. Key implementation details:

**Viewport isolation.** Standard terminal output scrolls the whole screen, causing a persistent status bar to duplicate on every redraw. NERVI avoids this by partitioning the viewport. On launch it queries the terminal height, then sends `\033[1;<height-1>r` to restrict scrolling to all rows except the bottom one. The bottom row is locked and used exclusively for the status bar. On exit, `\033[r` resets the scroll region.

**Cross-platform window size.** On Windows, standard Unix `ioctl` calls are unavailable. NERVI opens a handle to `CONOUT$` via `syscall.Open` and calls `GetConsoleScreenBufferInfo` to retrieve dimensions. On Unix/macOS it uses the standard `ioctl` + `TIOCGWINSZ` path.

**Thinking spinner.** For reasoning models that emit `<think>` tokens before their response, NERVI shows an amber spinner during the thinking phase (`▣ Chat · model-name · ⠋ Thinking`). When the first non-thinking token arrives, the spinner is erased with ANSI cursor-back codes and replaced with a timing readout (`Thought: 6.4s`).

### 2.3 Command Reference

| Command | Description |
|---|---|
| `nervi run` | Launch interactive chat shell |
| `nervi serve` | Run npuserver in foreground (for debugging) |
| `nervi kill` | Stop background server |
| `nervi load <model>` | Load compiled model into NPU memory |
| `nervi unload` | Free NPU memory |
| `nervi pull <model>` | Download + compile model from HuggingFace |
| `nervi pull --list` | List all models (available / downloaded / compiled / active) |
| `nervi delete <model>` | Delete model files (`-c` for compiled-only) |
| `nervi health` | NPU telemetry and server status |
| `nervi info` | Active config, port, paths |
| `nervi update` | Upgrade Python backend in managed venv |
| `nervi config` | Interactive config wizard |
| `nervi config get/set <key>` | Read/write individual config values |
| `nervi app list` | List installed extensions |
| `nervi app install <id>` | Install extension from marketplace |
| `nervi app create <id>` | Scaffold a new extension project |
| `nervi app <id> enable/disable` | Toggle extension |
| `nervi app call <id> <tool>` | Call a specific tool on an extension |
| `nervi app <id> logs [-f]` | Tail extension logs |
| `nervi app <id> status` | Show extension runtime status |
| `nervi app <id> kill` | Force-kill an extension process |
| `nervi app monitor` | Monitor stateful extension state in real time |

### 2.4 Configuration

Config is stored as JSON at `~/.config/nervi/config.json`. Nickname resolution is layered: user-defined aliases in config → server-side built-in aliases (e.g. `qwen3-4b`) → exact HuggingFace repo ID fallback.

```json
{
  "model_port": 22828,
  "model_name": "durgasai299792458/Qwen3-4B-OpenVINO-INT4-npu-i",
  "nicknames": {
    "qwen3-4b": "durgasai299792458/Qwen3-4B-OpenVINO-INT4-npu-i",
    "gemma":    "durgasai299792458/gemma-4-E2B-OpenVINO-INT4"
  }
}
```

### 2.5 Directory Layout

```
~/.config/nervi/          (Linux)
%AppData%\Roaming\nervi\  (Windows)
  ├── venv/               managed Python environment
  ├── extensions/         installed extension folders
  │   └── <ext-id>/
  │       ├── manifest.json
  │       └── <executable>
  ├── logs/               per-extension log files
  ├── state/              stateful extension persistence (JSON)
  ├── server.pid          Flask process ID
  ├── config.json         active configuration
  └── .nervi_ready        sentinel: venv is initialised
```

---

## 3. npuserver — Python Backend

**Repository:** `github.com/dsainvg/npuserver`  
**Docs:** [dev.dsainvg.me/npuserver](https://dev.dsainvg.me/npuserver/)  
**PyPI:** installable via `pip install npuserver`  
**Core deps:** `openvino-genai`, `flask`, `huggingface-hub`

### 3.1 Purpose

`npuserver` is a standalone Python library and Flask REST server that handles everything the Go CLI cannot: Python-level Intel OpenVINO GenAI integration, HuggingFace model download management, NPU memory lifecycle, and streaming inference. It is designed to be embeddable (importable as a library) and also to function as the NERVI backend process.

### 3.2 Key Design Decisions

**Explicit memory management.** The Intel NPU has limited, specialised SRAM. Unlike GPU inference servers that may lazily swap models, `npuserver` requires explicit `load` and `unload` calls and aggressively garbage-collects after unloading to prevent memory leaks. Only one model can be active at a time.

**No background downloads.** The server refuses to download during a load request. Models must be fully present locally before a compile/load is triggered. This prevents unexpected bandwidth usage mid-inference and makes the compile step deterministic.

**On-the-fly compilation.** If a model is downloaded but not compiled, `npuserver` intercepts the load request, runs `ov_genai.LLMPipeline` targeting `"NPU"` to produce `.blob` files, writes a `compiled.ok` sentinel, then loads. Subsequent loads skip compilation entirely.

**Resume-safe downloads.** Partial downloads (interrupted connection) are automatically resumed on the next `pull` call via HuggingFace Hub's snapshot download with resumption.

**Client timeout exemption.** Compilation can take 5–30 minutes. The Go client sets `Timeout: 0` specifically for the `/v1/models/download` and `/v1/models/load` endpoints to prevent premature timeout errors.

### 3.3 Model States

Every model known to `npuserver` is classified into one of four states:

| State | Meaning |
|---|---|
| `available` | Known on remote registry, not yet downloaded |
| `downloaded` | Weights in HuggingFace cache, no compiled blob |
| `compiled` | NPU `.blob` files ready, instant load |
| `active` | Currently loaded in NPU execution memory |

### 3.4 API Reference

**Base / health**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Server status |
| `GET` | `/health` | NPU telemetry + active model |
| `GET` | `/currentmodel` | Alias for `/health` |

**Model registry**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/models` | List all models with states |

**Model lifecycle**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/models/download` | Download from HF + compile (blocking) |
| `POST` | `/v1/models/load` | Load compiled model into NPU |
| `POST` | `/unload` | Unload from NPU memory |
| `POST` | `/v1/models/delete` | Delete compiled blobs and/or weights |

**Chat completions**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/chat/completions` | Blocking or SSE streaming chat |

**Chat response includes:**
- Standard OpenAI-compatible `choices` structure
- `reasoning_content` field for reasoning models (from `<think>` tokens)
- `metrics` object with NPU performance data: TTFT, throughput (tokens/sec)

### 3.5 Python Client Library

Beyond the REST interface, `npuserver` exposes a Python client API for programmatic model management without writing raw HTTP:

```python
import npuserver

npuserver.download_model("durgasai299792458/Qwen3-4B-OpenVINO-INT4-npu-i")
npuserver.load_model("durgasai299792458/Qwen3-4B-OpenVINO-INT4-npu-i")
npuserver.unload_model()
npuserver.delete_compiled("durgasai299792458/Qwen3-4B-OpenVINO-INT4-npu-i")
npuserver.delete("durgasai299792458/Qwen3-4B-OpenVINO-INT4-npu-i")
```

### 3.6 OpenAI Compatibility

Because `npuserver` implements the `/v1/chat/completions` endpoint with the same request/response schema as the OpenAI API, any tool that supports a custom `base_url` — LangChain, AutoGen, the official `openai` Python package — can point at `npuserver` with a one-line change:

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8080/v1", api_key="not-needed")
```

---

## 4. Model Pipeline — Fine-Tuning & Conversion

**Training data repo:** `github.com/dsainvg/data_qwen3.5_4B_finetune`  
**HuggingFace profile:** `durgasai299792458`

### 4.1 Overview

Running a model on Intel NPU via OpenVINO is not as simple as downloading any Hugging Face checkpoint. The model must be:

1. In OpenVINO IR format (`.xml` + `.bin` weight files, or pre-converted INT4 blobs)
2. Quantized to INT4 with symmetric quantization (a hard requirement for NPU compilation)
3. Compiled into NPU-specific `.blob` files via `ov_genai.LLMPipeline`

This creates a unique end-to-end ownership requirement: rather than pointing users at arbitrary HuggingFace models, NERVI maintains its own converted and fine-tuned model variants under `durgasai299792458`.

### 4.2 Fine-Tuning

Models were fine-tuned on synthetic data created specifically for this project (published in `data_qwen3.5_4B_finetune`). The primary base model was **Qwen3 4B**, chosen for its balance of capability and size (fits in NPU memory at INT4 quantization with reasonable context length).

Fine-tuning targets agentic, multi-step decision-making behaviour — the type of response patterns that NERVI's menu-based tool-call interface requires. Standard instruction-tuning datasets would not teach a model to interact correctly with NERVI's specific tool/menu IPC protocol.

Fine-tuned model checkpoints are published to HuggingFace under `durgasai299792458` and are the primary model sources listed in NERVI's default nickname registry.

### 4.3 OpenVINO Conversion

Post fine-tuning, models are converted using `optimum-cli` from the `optimum-intel` package:

- Export format: OpenVINO IR
- Weight precision: INT4 (`--weight-format int4`)
- Quantization ratio: `--ratio 1.0` (maximise INT4 coverage)
- Group size: 128 (group quantization, appropriate for sub-7B models)
- Symmetric quantization enforced (NPU requirement — asymmetric quantization causes NPU compilation failures)

Converted models are uploaded as complete HuggingFace repositories containing `openvino_model.xml`, `openvino_model.bin`, tokenizer IR files, and `openvino_config.json`.

### 4.4 Model Inventory (published under `durgasai299792458`)

| Model | Base | Format | Notes |
|---|---|---|---|
| `Qwen3-4B-OpenVINO-INT4-npu-i` | Qwen3 4B | INT4 OV | Primary NERVI model, fine-tuned |
| `Qwen3-0.6BOpenVINO` | Qwen3 0.6B | OV | Lightweight option |
| `gemma-4-E2B-OpenVINO-INT4` | Gemma 4 | INT4 OV | Alternative model |

5+ models total fine-tuned and converted across the project lifecycle.

### 4.5 Compilation Mechanics

At runtime, when a user runs `nervi load` on a downloaded-but-not-compiled model, `npuserver` performs:

1. Allocate a slot in `~/.cache/npuserver/compiled/`
2. Write a manifest JSON (max prompt length, speed profile)
3. Instantiate `ov_genai.LLMPipeline(model_path, "NPU")` — this triggers blob compilation
4. Write `compiled.ok` sentinel on success

Compilation time: 5–30 minutes depending on hardware. Once compiled, subsequent loads are near-instant (blob is loaded directly into NPU SRAM).

---

## 5. Extension System

The extension system is one of the most architecturally sophisticated parts of NERVI. It allows third-party developers to add capabilities to the CLI without modifying the core binary.

### 5.1 Design Principles

- **Subprocess-based isolation:** Extensions run as independent OS processes, not as plugins loaded into the Go runtime. This means any language can be used to write an extension (Go, Python, Rust, etc.) as long as it produces an executable.
- **Lazy spawning:** Stateless extensions are spawned per-request and exit after responding. Stateful extensions live in the background and handle concurrent requests.
- **Manifest-driven discovery:** NERVI discovers extensions by reading `manifest.json` files. No registration step, no code changes to NERVI core.
- **IPC over stdio:** Communication uses newline-delimited JSON over `stdin`/`stdout`. `stderr` is captured to log files.

### 5.2 Extension Modes

Extensions declare one of two interaction modes:

**Tool mode** — the extension exposes callable functions. NERVI (or the agentic LLM) calls a specific tool with JSON arguments, and the extension responds with a JSON result. This is the primary mode for agent-facing extensions.

**Menu mode** — the extension exposes a text-based menu. A user types `/app <ext-id>` and NERVI enters a menu-driven interaction loop. The extension responds with a menu structure (title, items list, text content) and handles subsequent user selections.

Extensions also declare a lifecycle type:

**Stateless** — spawned fresh per request, exits after responding. Zero overhead when idle.  
**Stateful** — spawned once, persists in background. Required for extensions that maintain session state (databases, open connections, long-running computations).

### 5.3 Manifest Schema

```json
{
  "name": "My Extension",
  "description": "What this extension does",
  "version": "1.0.0",
  "author": "developer@example.com",
  "executable": "main",
  "type": "stateless",
  "mode": "tool",
  "stores_data": false,
  "tools": [
    {
      "name": "tool_name",
      "description": "What this tool does",
      "input_schema": {
        "type": "object",
        "properties": {
          "param": { "type": "string", "description": "A parameter" }
        },
        "required": ["param"]
      }
    }
  ]
}
```

### 5.4 IPC Protocol

**Tool mode — request (Go → extension):**
```json
{
  "method": "call",
  "tool": "calculate_area",
  "arguments": { "width": 10, "height": 5 },
  "id": "req-98765"
}
```

**Tool mode — response (extension → Go):**
```json
{
  "result": { "area": 50, "units": "sqm" },
  "error": "",
  "id": "req-98765"
}
```

**Menu mode — request:**
```json
{
  "method": "menu",
  "selection": "1",
  "arguments": ["arg1", "arg2"],
  "id": "req-112"
}
```

**Menu mode — response:**
```json
{
  "result": {
    "title": "Main Menu",
    "items": [
      { "id": "1", "label": "Add item" },
      { "id": "2", "label": "List items" }
    ],
    "text_content": "Choose an action:"
  },
  "error": "",
  "id": "req-112"
}
```

### 5.5 State Persistence

Stateful extensions that set `"stores_data": true` get a dedicated state file at `~/.config/nervi/state/<ext-id>.json`. NERVI's IPC broker synchronises state changes dynamically. The `nervi app monitor` command provides real-time state observation.

### 5.6 Scaffolding

`nervi app create <id> --mode=tool --type=stateless` generates a boilerplate extension directory with a `manifest.json` and a `main.go` entry point that already handles the JSON framing protocol. This lowers the barrier to extension development significantly.

---

## 6. Extension Marketplace & Infrastructure

**URL:** [nervi.dsainvg.me/marketplace](https://nervi.dsainvg.me/marketplace)  
**Backend:** Cloudflare Workers + D1 (SQLite at the edge)

### 6.1 Architecture

The marketplace is a serverless system hosted entirely on Cloudflare's edge network:

- **Cloudflare Workers** handle API requests (listing extensions, fetching metadata, serving downloads)
- **Cloudflare D1** provides the SQLite database backing the extension registry
- The website frontend is served statically with dynamic content fetched from the Workers API

This means the marketplace has no origin server to maintain, scales automatically, and has global low latency without any infrastructure management overhead.

### 6.2 Publishing

Developers publish extensions via `nervi.dsainvg.me/upload`. The extension is packaged as a compiled zip (containing the binary and `manifest.json`), and NERVI installs it with `nervi app install <extension-id>` — which downloads the zip, extracts it, and registers it by reading the manifest.

### 6.3 Current Extensions

At launch, two reference extensions are published:

| Extension | Mode | Type | Description |
|---|---|---|---|
| `memory` | menu | stateful | Persistent key-value memory store with read/write menus |
| `calculator` | tool | stateless | Arithmetic calculator exposing a `multiply` tool |

These serve as live examples of both extension modes and both lifecycle types.

---

## 7. Documentation Site

**URL:** [nervi.dsainvg.me/docs](https://nervi.dsainvg.me/docs)

The documentation covers the full project with dedicated pages for every major surface:

| Page | Content |
|---|---|
| Home / Architecture | System overview, two-layer architecture |
| Installation | Hardware requirements, driver setup, build instructions, auto-scaffolding |
| CLI Commands | Full command reference with syntax and flags |
| Model Compilation | Registry states, compilation mechanics, resume-safe downloads, timeout handling |
| Interactive Shell | Viewport isolation, spinner, cross-platform window size |
| Configuration | Config file schema, CLI config commands, nickname resolution |
| Managing Extensions | Directory structure, install/enable/disable/log commands |
| Creating Extensions | Scaffolding, manifest schema, tool definition |
| IPC & Lifecycle | Full IPC protocol, tool mode, menu mode, state persistence |
| API Reference | Complete npuserver HTTP API with request/response schemas |
| About | Tech stack, developer info, license |

---

## 8. Technology Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| CLI frontend | Go | Single binary, fast startup, cross-platform |
| TUI rendering | Raw ANSI escape codes | Viewport isolation, inline spinner, status bar |
| Backend server | Python + Flask | OpenVINO integration, model lifecycle |
| NPU inference | Intel OpenVINO GenAI (`ov_genai`) | Hardware-accelerated LLM execution |
| Model quantization | `optimum-cli` (Optimum Intel) | INT4 conversion for NPU |
| Model hosting | HuggingFace Hub | Fine-tuned model distribution |
| Fine-tuning | HuggingFace Transformers + PEFT | LoRA/SFT on Qwen3 4B |
| Training data | Synthetic (hand-crafted dataset) | Agentic behaviour fine-tuning |
| Extension IPC | Newline-delimited JSON over stdio | Cross-language extension protocol |
| Marketplace backend | Cloudflare Workers + D1 | Serverless edge API + SQLite |
| Docs & web | Static site (Cloudflare hosted) | Public documentation |
| Hardware target | Intel AI Boost NPU (Core Ultra) | Inference without GPU |

---

## 9. Key Technical Decisions & Engineering Highlights

### Viewport isolation without a TUI library

Most Go terminal applications use a library like `bubbletea` or `tcell` for UI rendering. NERVI implements its own viewport partitioning using raw ANSI sequences. This gives complete control and avoids library overhead, but required implementing cross-platform window-size querying (`GetConsoleScreenBufferInfo` on Windows, `ioctl TIOCGWINSZ` on Unix) from scratch.

### Two-process architecture with zero-configuration auto-setup

Separating the Go CLI from the Python backend means the Go binary remains a pure single executable from the user's point of view, while the Python side gets full access to OpenVINO's Python bindings. The auto-venv bootstrap on first run (create venv → pip install → write sentinel) means the user never manually sets up Python dependencies.

### Explicit NPU memory contract

The `load/unload` model is a deliberate design choice against the typical "just call the API" approach of cloud LLM clients. Intel NPU SRAM is a constrained, non-paged resource. The explicit lifecycle forces users and automation to think about memory as a managed resource, which prevents the silent failures and OOM conditions that plague naive NPU inference implementations.

### OpenAI-compatible API surface

Implementing `/v1/chat/completions` with the OpenAI schema means `npuserver` is a drop-in local backend for any existing LLM tooling. This was a forward-looking decision: the value of NERVI is not just the CLI, but the inference infrastructure that any application can use.

### Extension IPC as a typed protocol

Using newline-delimited JSON over stdio (rather than, say, HTTP or gRPC) keeps extensions completely language-agnostic at minimal overhead. The `id` field on every message enables multiplexing, which allows stateful extensions to handle concurrent calls correctly. The two-mode design (tool vs. menu) cleanly separates the agent-callable surface from the human-interactive surface.

### Fine-tuning for the specific interaction pattern

Generic instruction-following models do not behave optimally within NERVI's menu/tool interaction paradigm. Fine-tuning on synthetic data tailored to this specific protocol ensures the model produces structured, parseable responses and understands the tool-call semantics without requiring complex system prompt engineering at inference time.

### Symmetric INT4 quantization enforcement

NPU compilation under OpenVINO requires symmetric quantization. Asymmetric INT4 (which is the default for many quantization pipelines targeting GPU/CPU) silently produces incorrect compilation results. This hard requirement was discovered and solved in the model conversion pipeline, which is why the NERVI model variants on HuggingFace are specifically prepared for NPU compatibility rather than being generic OpenVINO conversions.

---

## 10. Project Scope Assessment

### What was built

This is not a single project. It is a vertically integrated platform with at least six distinct components, each non-trivial on its own:

| Component | Complexity |
|---|---|
| NERVI Go CLI with custom TUI | High — raw ANSI, cross-platform syscalls, subprocess management |
| npuserver Flask library | High — OpenVINO integration, NPU memory management, streaming SSE |
| Model fine-tuning pipeline | High — synthetic data creation, LoRA training, INT4 conversion |
| OpenVINO model publishing | Medium — conversion, quantization, HF upload |
| Extension IPC protocol | High — typed JSON protocol, two modes, stateful broker |
| Cloudflare marketplace | Medium — Workers + D1, upload/install flow |
| Documentation site | Medium — complete docs for all surfaces |

### Lines of infrastructure owned

- Go binary (CLI, TUI, server manager, extension broker, IPC)
- Python package (Flask server, OpenVINO pipeline, model lifecycle, HF integration, client library)
- Synthetic training dataset
- 5+ fine-tuned and converted model checkpoints
- Marketplace backend (Cloudflare Workers + D1)
- Documentation website

### What makes this technically distinctive

Most local LLM tools (Ollama, LM Studio, Jan) target GPU inference on CUDA or Metal. NERVI specifically targets the Intel NPU — a fundamentally different execution model with tighter memory constraints, mandatory ahead-of-time compilation, and symmetric quantization requirements. Building a full-featured inference platform on this hardware, from scratch, as a sole developer, while simultaneously fine-tuning the models it runs, represents an unusually deep end-to-end ownership of the AI inference stack.

---

*Report generated from live documentation at nervi.dsainvg.me and dev.dsainvg.me/npuserver.*  
*All implementation details sourced from official project documentation and repositories.*
