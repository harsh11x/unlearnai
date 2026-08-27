# Unlearn Studio

**AI Model Unlearning Platform**

Unlearn Studio is an evidence-based platform for selectively reducing specific capabilities in language models while preserving unrelated knowledge.

## Status

**V1 - Research Proof of Concept**

V1 focuses on one domain: **Programming / Code Generation**, with Python as the initial target.

## What This Is

- A system for performing gradient-based model editing to reduce specific capabilities
- An evaluation framework using controlled probing experiments
- Evidence-based measurement of forgetting, retention, and collateral damage

## What This Is NOT

- This does **not** perform theoretical machine unlearning
- This does **not** inspect or remove knowledge from model weights directly
- This does **not** claim to completely delete knowledge from neural networks
- Results are measured through observed capability, not internal knowledge inspection

## Architecture

```
unlearn-studio/
├── apps/web/              # Next.js frontend
├── services/
│   ├── api/               # FastAPI backend
│   └── worker/            # Celery GPU worker
├── ml/                    # Core ML pipeline
│   ├── models/            # Model adapters
│   ├── datasets/          # Probe and training datasets
│   ├── unlearning/        # Unlearning algorithms
│   ├── evaluation/        # Evaluation engine
│   └── metrics/           # Metric calculations
├── infrastructure/        # Docker configs
├── tests/                 # Test suite
├── docs/                  # Documentation
└── storage/               # Model/artifact storage
```

## Quick Start

### Prerequisites

- Python 3.11+
- CUDA-capable GPU (recommended)
- PostgreSQL (for full stack)
- Redis (for job queue)

### CLI Proof of Concept

```bash
# Install dependencies
pip install -r requirements.txt

# Run with default model (350M params)
python cli.py run

# Run with a specific model
python cli.py run --model Salesforce/codegen-350M-multi

# Run with custom settings
python cli.py run --model /path/to/model --method retain_aware --steps 200 --lr 5e-5

# List available methods
python cli.py methods

# Inspect a model
python cli.py inspect --model /path/to/model
```

### Full Stack with Docker

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- FastAPI backend (port 8000)
- GPU worker
- Next.js frontend (port 3000)

### Frontend Development

```bash
cd apps/web
npm install
npm run dev
```

## Scientific Approach

### Evaluation Methodology

Unlearn Studio uses **controlled probing experiments** to measure observed capabilities:

1. **Direct probes**: Standard prompts for specific capabilities
2. **Paraphrase probes**: Reworded variants to test robustness
3. **Indirect probes**: Indirect references to test deeper understanding
4. **Code completion probes**: In-context code completion tasks
5. **Debugging probes**: Bug identification and fixing tasks
6. **Explanation probes**: Conceptual understanding tests

### Metrics

- **Forgetting Achievement**: Percentage reduction in target capability
- **Retention Score**: Percentage of non-target capabilities preserved
- **Collateral Damage**: Unintended degradation of unrelated capabilities
- **Residual Knowledge**: Remaining target capability after unlearning
- **Robustness**: Whether forgetting survives prompt rewording

### Verdict System

- **PASS**: Significant target reduction, good retention, low collateral damage
- **PASS WITH REVIEW**: Partial success or borderline results
- **FAIL**: Insufficient forgetting or excessive collateral damage

## Unlearning Methods

### 1. Gradient Forgetting Baseline

Simple baseline that maximizes loss on target examples, pushing the model away from producing target content. No retention mechanism.

### 2. Retain-Aware Unlearning

Combines forgetting and preservation objectives:
```
total_loss = -forget_weight * forget_loss + retain_weight * retain_loss
```

## Limitations

- Results depend on probe coverage — unmeasured capabilities may be affected
- Gradient-based editing does not guarantee complete capability removal
- Model may partially recover capability through paraphrased prompts
- Evaluation is based on observed behavior, not weight inspection
- Small models may have less separable knowledge representations

## Documentation

- [Architecture](docs/architecture.md)
- [Unlearning Methods](docs/unlearning.md)
- [Evaluation System](docs/evaluation.md)
- [Security Model](docs/security.md)
- [Development Guide](docs/development.md)
- [Model Support](docs/model-support.md)
- [Research Notes](docs/research.md)

## License

Research use. See LICENSE for details.
