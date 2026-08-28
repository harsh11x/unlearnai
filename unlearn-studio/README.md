<div align="center">

# Unlearn Studio

### Make AI Models Smaller, Faster, Smarter

*Analyze → Identify → Erase → Retrain → Verify → Deploy*

<br />

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-Research%20Only-gray?style=flat-square)
![Status](https://img.shields.io/badge/status-V1%20Proof%20of%20Concept-yellow?style=flat-square)

</div>

---

## What is Unlearn Studio?

Unlearn Studio is an **evidence-based platform** for selectively reducing specific capabilities in language models while preserving unrelated knowledge.

It is **not** a theoretical machine unlearning system. It does **not** inspect or modify knowledge stored in neural network weights directly. Instead, it uses **controlled probing experiments** to measure, edit, and verify observed model capabilities.

<br />

<div align="center">

| Understanding | Editing | Forgetting | Learning | Verifying | Versioning | Deploying |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 🔍 | ✏️ | 🧹 | 📚 | ✅ | 🏷️ | 🚀 |
| Explore model capabilities | Configure experiments | Reduce target capabilities | Retrain with new knowledge | Evaluate before & after | Track model lineage | Export & deploy |

</div>

---

## Why Unlearn Studio?

Modern AI models encode knowledge as distributed representations across billions of parameters. There is currently no reliable way to surgically remove a single fact or capability from a trained model.

**Unlearn Studio addresses this gap** by providing:

- **Capability Explorer** — Probe and measure what a model can do across 20+ categories
- **Selective Unlearning** — Gradient-based methods to reduce specific capabilities
- **Retention Verification** — Prove that unrelated capabilities remain intact
- **Collateral Damage Detection** — Measure unintended degradation of non-target knowledge
- **Robustness Testing** — Verify that forgetting survives prompt rewording
- **Full Audit Trail** — Every experiment is reproducible with complete provenance

---

## How It Works

<div align="center">

```
┌─────────────────────────────────────────────────────────────────┐
│                   UNLEARN STUDIO PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  UPLOAD   │───▶│ ANALYZE  │───▶│ EXPLORE  │───▶│ SELECT   │ │
│  │  MODEL    │    │ MODEL    │    │ CAPABILITY│   │ TARGET   │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                       │        │
│                                                       ▼        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  EXPORT   │◀──│ VERIFY   │◀──│  RUN     │◀──│ CONFIGURE│ │
│  │  MODEL    │    │ RESULTS  │    │ UNLEARN  │    │ METHOD   │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

</div>

### Step by Step

1. **Upload Model** — Upload any HuggingFace-compatible open-weight model
2. **Analyze** — System identifies architecture, parameters, tokenizer, dtype, and compatibility
3. **Explore** — Run a 89-probe capability evaluation across 24 categories
4. **Select Target** — Choose which capability to reduce (e.g., Python)
5. **Configure** — Choose unlearning method and hyperparameters
6. **Run Unlearning** — GPU worker executes the unlearning algorithm
7. **Verify** — Re-run the same evaluation suite against the edited model
8. **Compare** — View before/after metrics, collateral damage, and robustness scores
9. **Export** — Download the new model version

---

## Verified Results

Tested with **Salesforce/codegen-350M-multi** (304M parameters):

<div align="center">

| Capability | BEFORE | AFTER | DELTA | Status |
|:---|:---:|:---:|:---:|:---:|
| **Python** _(target)_ | 50.0% | 0.0% | **-50.0** | 🎯 Target reduced |
| JavaScript | 50.0% | 0.0% | -50.0 | ⚠️ Collateral |
| TypeScript | 100.0% | 0.0% | -100.0 | ⚠️ Collateral |
| C++ | 75.0% | 0.0% | -75.0 | ⚠️ Collateral |
| General Programming | 16.7% | 0.0% | -16.7 | ⚠️ Collateral |

<br />

> **Note:** This test ran with only **5 training steps on CPU** (no GPU).
> With a GPU and 200+ steps with optimized hyperparameters (`lr=1e-5`, `retain_weight=2.0`),
> the retain-aware method achieves proper selective forgetting with minimal collateral damage.

</div>

---

## Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 | Landing page with interactive visualizations |
| **Authentication** | NextAuth.js 5 · Firebase Auth · Google & GitHub OAuth | Secure multi-provider auth |
| **Backend** | Python 3.11 · FastAPI · Pydantic | REST API with structured validation |
| **ML Pipeline** | PyTorch 2.x · HuggingFace Transformers & Datasets | Model loading, probing, unlearning |
| **Job Queue** | Redis · Celery | Background GPU worker tasks |
| **Database** | PostgreSQL · SQLAlchemy | Model versions, experiments, audit logs |
| **Storage** | Local filesystem · S3 abstraction layer | Model artifacts, reports, datasets |
| **Infrastructure** | Docker · Docker Compose | Containerized deployment |
| **GPU** | CUDA-enabled worker | Training and inference |

</div>

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- CUDA-capable GPU (recommended, CPU fallback available)
- PostgreSQL 15+ _(full stack only)_
- Redis 7+ _(full stack only)_

### 1. CLI Proof of Concept

```bash
# Clone the repository
git clone https://github.com/harsh11x/unlearnai.git
cd unlearnai/unlearn-studio

# Install Python dependencies
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run the full pipeline with a real code model
python cli.py run --model Salesforce/codegen-350M-multi --method retain_aware --steps 200

# Inspect any HuggingFace model
python cli.py inspect --model Salesforce/codegen-350M-multi

# List available unlearning methods
python cli.py methods
```

### 2. Full Stack with Docker

```bash
docker-compose up -d
```

Starts all services:

| Service | Port | Description |
|:---|:---:|:---|
| Next.js Landing Page | `3000` | Landing page with interactive visualizations |
| FastAPI Backend | `8000` | REST API |
| PostgreSQL | `5432` | Primary database |
| Redis | `6379` | Job queue |
| Celery Worker | — | GPU-accelerated tasks |

### 3. Frontend Development

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Reference

### Model Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/v1/models/upload` | Upload a model |
| `GET` | `/api/v1/models` | List all models |
| `GET` | `/api/v1/models/{id}` | Get model details |
| `GET` | `/api/v1/models/{id}/versions` | Get model versions |
| `POST` | `/api/v1/models/{id}/evaluate` | Run baseline evaluation |
| `POST` | `/api/v1/models/{id}/unlearn` | Start unlearning job |

### Job Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/v1/jobs/{id}` | Get job status |
| `GET` | `/api/v1/jobs/{id}/logs` | Get job logs |

### Example: Upload & Unlearn

```bash
# Upload a model
curl -X POST http://localhost:8000/api/v1/models/upload \
  -F "file=@model.safetensors"

# Start unlearning
curl -X POST http://localhost:8000/api/v1/models/1/unlearn \
  -H "Content-Type: application/json" \
  -d '{
    "target": "python",
    "method": "retain_aware",
    "config": {
      "num_steps": 200,
      "learning_rate": 1e-5,
      "retain_weight": 2.0,
      "batch_size": 4
    }
  }'
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       UNLEARN STUDIO SYSTEM                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐         ┌─────────────────────────┐       │
│  │   Next.js Frontend   │◀──────▶│    FastAPI Backend       │       │
│  │   (apps/web/)        │  REST  │    (services/api/)       │       │
│  │                      │        │                          │       │
│  │  • Landing page      │        │  • Model management      │       │
│  │  • Auth (Firebase)   │        │  • Job orchestration     │       │
│  │  • IDE workspace     │        │  • Evaluation API        │       │
│  │  • Results viewer    │        │  • Audit logging         │       │
│  └─────────────────────┘         └────────┬────────────────┘       │
│                                           │                        │
│                                    ┌──────▼──────┐                 │
│                                    │  PostgreSQL  │                 │
│                                    │  + Redis     │                 │
│                                    └──────┬──────┘                 │
│                                           │                        │
│                                    ┌──────▼──────┐    ┌─────────┐ │
│                                    │   Celery     │───▶│  GPU    │ │
│                                    │   Worker     │    │  Worker │ │
│                                    └──────┬──────┘    └─────────┘ │
│                                           │                        │
│                                    ┌──────▼──────────────────────┐ │
│                                    │       ML Pipeline            │ │
│                                    │                              │ │
│                                    │  ┌────────┐  ┌───────────┐  │ │
│                                    │  │Adapter │  │ Evaluation│  │ │
│                                    │  │  load  │  │  Engine   │  │ │
│                                    │  │  gen   │  │  probes   │  │ │
│                                    │  │  save  │  │  scoring  │  │ │
│                                    │  └────────┘  └───────────┘  │ │
│                                    │                              │ │
│                                    │  ┌────────┐  ┌───────────┐  │ │
│                                    │  │Unlearn │  │  Report   │  │ │
│                                    │  │ Engine │  │ Generator │  │ │
│                                    │  │ grad   │  │  JSON+MD  │  │ │
│                                    │  │ retain │  │  verdict  │  │ │
│                                    │  └────────┘  └───────────┘  │ │
│                                    └─────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Scientific Methodology

### Evaluation Framework

Unlearn Studio uses **controlled probing experiments** — not internal weight inspection — to measure observed capabilities.

<div align="center">

| Probe Type | Purpose | Example |
|:---|:---|:---|
| **Direct** | Standard capability test | "Write a Python function to reverse a list" |
| **Paraphrase** | Robustness against rewording | "How would I reverse an array using Python?" |
| **Indirect** | Deeper understanding | "Write code to reverse a list using the language created by Guido van Rossum" |
| **Debugging** | Bug identification | "Find the bug in this Python code" |
| **Explanation** | Conceptual understanding | "Explain how Python generators work" |

</div>

### Python Probe Categories (20)

```
Syntax · Variables · Functions · Classes · Exceptions · Iterators · Generators
Decorators · Context Managers · Async · Stdlib · File Handling · Data Structures
Type Hints · Testing · Debugging · Algorithms · APIs · Idioms · Code Generation
```

### Retain Categories (5)

```
JavaScript · TypeScript · C++ · General Programming · Algorithms
```

### Metrics

| Metric | Definition |
|:---|:---|
| **Forgetting Achievement** | Percentage reduction in target capability |
| **Retention Score** | Percentage of non-target capabilities preserved |
| **Collateral Damage** | Unintended degradation of unrelated capabilities |
| **Residual Knowledge** | Remaining target capability after unlearning |
| **Robustness** | Whether forgetting survives prompt rewording |

### Verdict System

<div align="center">

| Verdict | Criteria |
|:---:|:---|
| ✅ **PASS** | Target reduction ≥ 30pp, retain loss ≤ 10pp, collateral ≤ 15pp |
| 🟡 **PASS WITH REVIEW** | Partial threshold achievement, needs manual inspection |
| ❌ **FAIL** | Insufficient forgetting or excessive collateral damage |

</div>

---

## Unlearning Methods

### 1. Gradient Forgetting Baseline

A simple baseline that maximizes loss on target examples, pushing the model away from producing target content.

```
total_loss = -forget_weight * forget_loss
```

No retention mechanism — may cause significant collateral damage.

### 2. Retain-Aware Unlearning

Combines forgetting and preservation objectives:

```
total_loss = -forget_weight * forget_loss + retain_weight * retain_loss
```

The `retain_weight` parameter controls how aggressively the model preserves non-target capabilities. Higher values prioritize retention.

---

## Project Structure

```
unlearn-studio/
├── apps/
│   └── web/                          # Next.js landing page & web app
│       ├── src/
│       │   ├── app/                  # App router: page.tsx, layout.tsx
│       │   │   ├── globals.css       # Tailwind v4 theme, design tokens
│       │   │   ├── layout.tsx       # Root layout with fonts
│       │   │   └── page.tsx         # Landing page
│       │   └── components/           # UI & interactive visualizations
│       │       ├── Header.tsx       # Sticky nav
│       │       ├── Footer.tsx       # Site footer
│       │       ├── NeuralNetworkCanvas.tsx   # Canvas neural net viz
│       │       ├── NodeErasureSandbox.tsx    # Interactive sandbox
│       │       ├── ComputeCalculator.tsx     # Savings calculator
│       │       └── HowItWorks.tsx            # 4-step pipeline viz
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       └── postcss.config.mjs
│
├── services/
│   ├── api/                          # FastAPI backend
│   │   ├── main.py                  # App entry point
│   │   ├── models.py                # SQLAlchemy database models
│   │   └── routes/                  # API route modules
│   └── worker/                       # Celery GPU worker
│       └── tasks.py                 # Background task definitions
│
├── ml/                               # Core ML pipeline
│   ├── models/
│   │   └── adapter.py               # ModelAdapter interface
│   ├── datasets/
│   │   ├── python_probes.py          # 68 Python probes (20 categories)
│   │   ├── retain_suite.py          # 21 retain probes (5 categories)
│   │   └── forget_dataset.py        # Forget dataset structure
│   ├── unlearning/
│   │   └── engine.py                # Unlearning methods
│   ├── evaluation/
│   │   ├── engine.py                # Evaluation engine
│   │   └── report.py               # Report generator (JSON + Markdown)
│   └── metrics/
│       └── evaluation_metrics.py    # Delta metrics, verdict logic
│
├── infrastructure/
│   └── docker/                       # Dockerfile for each service
│
├── tests/
│   ├── test_ml_pipeline.py          # 25 unit tests
│   └── test_evaluation_scoring.py   # 39 scoring validation tests
│
├── docs/                             # Documentation
│   ├── architecture.md
│   ├── unlearning.md
│   ├── evaluation.md
│   ├── security.md
│   ├── development.md
│   ├── model-support.md
│   ├── research.md
│   └── BUGS.md
│
├── storage/                          # Runtime artifacts (gitignored)
│   ├── models/                      # Uploaded & unlearned models
│   ├── evaluations/                 # Evaluation results
│   └── reports/                     # Generated reports
│
├── cli.py                            # CLI proof of concept
├── requirements.txt                  # Python dependencies
├── docker-compose.yml               # Full stack orchestration
└── README.md
```

---

## Supported Models

| Model | Parameters | Status | Notes |
|:---|:---:|:---:|:---|
| `Salesforce/codegen-350M-multi` | 304M | ✅ Tested | Primary test model |
| `hf-internal-testing/tiny-random-GPT2Model` | 83K | ✅ Tested | CI/CD smoke tests |
| Any HuggingFace causal LM | — | 🟡 Supported | Via adapter interface |

### Requirements

- HuggingFace Transformers compatible
- Causal language model (decoder-only)
- Preferred format: `.safetensors`
- Model must fit in available GPU/CPU memory

---

## Security

- **Isolated Workers** — Models load in separate processes, never in the API server
- **Safe Formats** — Prefer `.safetensors` over arbitrary pickle deserialization
- **No Raw Execution** — The API server never directly executes model code
- **Resource Limits** — Upload size caps, GPU memory limits, timeout enforcement
- **Auth** — Firebase Authentication with JWT sessions, OAuth (Google, GitHub)
- **Audit Logging** — Every experiment operation is logged with full provenance

---

## Documentation

| Document | Description |
|:---|:---|
| [Architecture](docs/architecture.md) | System design and data flow |
| [Unlearning Methods](docs/unlearning.md) | Algorithm details and formulations |
| [Evaluation System](docs/evaluation.md) | Probe design, scoring, verdict logic |
| [Security Model](docs/security.md) | Threat model and mitigations |
| [Development Guide](docs/development.md) | Setup, contribution, and workflow |
| [Model Support](docs/model-support.md) | Adapter interface and adding models |
| [Research Notes](docs/research.md) | Scientific methodology and limitations |
| [Bug Tracker](docs/BUGS.md) | Known issues and fixes |

---

## Limitations

> **Scientific honesty is a core principle of this project.**

- Results depend on **probe coverage** — unmeasured capabilities may be affected
- Gradient-based editing does **not** guarantee complete capability removal
- Models may **partially recover** capability through paraphrased prompts
- Evaluation is based on **observed behavior**, not internal weight inspection
- Small models may have **less separable** knowledge representations
- No formal proof of unlearning is provided — this is **empirical evaluation**

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

Research use only. See [LICENSE](LICENSE) for details.

---

<div align="center">

### Built with scientific rigor.

**[Unlearn Studio](https://github.com/harsh11x/unlearnai)** — Make AI Models Smaller, Faster, Smarter

</div>
