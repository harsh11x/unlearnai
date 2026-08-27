# Architecture

## System Overview

NullMind follows a phased architecture designed to start with ML proof-of-concept and progressively add API, worker, and UI layers.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend   │────▶│  API Server  │────▶│  Database (PG)  │
│  (Next.js)   │     │  (FastAPI)   │     └─────────────────┘
└─────────────┘     └──────┬───────┘
                           │
                    ┌──────▼───────┐     ┌─────────────────┐
                    │  Task Queue  │────▶│   GPU Worker    │
                    │   (Redis/    │     │   (Celery +     │
                    │    Celery)   │     │    PyTorch)     │
                    └──────────────┘     └─────────────────┘
```

## ML Pipeline

The core ML pipeline runs independently of the web stack:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Model Load  │────▶│  Baseline    │────▶│  Unlearning  │
│  (Adapter)   │     │  Evaluation  │     │  (Engine)    │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                    ┌──────────────┐     ┌────────▼───────┐
                    │   Report     │◀────│  Post-Unlearn  │
                    │  Generation  │     │  Evaluation    │
                    └──────────────┘     └────────────────┘
```

### Model Adapter

Abstract interface for model operations:
- `load()` - Load model and tokenizer
- `inspect()` - Extract metadata
- `generate()` - Text generation
- `save()` - Save model to disk
- `unload()` - Release memory

### Evaluation Engine

Runs controlled probing experiments against models:
1. Groups probes by capability category
2. Generates responses for each probe
3. Matches responses against expected patterns
4. Computes capability scores
5. Generates delta metrics

### Unlearning Engine

Implements unlearning algorithms:
- **Gradient Forgetting**: Maximizes loss on target examples
- **Retain-Aware**: Balances forgetting and preservation

### Report Generator

Produces comprehensive experiment reports with:
- Before/after comparison
- Robustness results
- Collateral damage assessment
- Verdict determination

## Data Flow

1. User uploads model → API validates → Worker loads
2. Baseline evaluation → probe suite → metrics
3. User configures unlearning → job created
4. Worker runs unlearning → creates new model version
5. Post-unlearning evaluation → same probe suite
6. Comparison → delta metrics → report

## Security Model

- Models loaded in isolated worker processes
- No arbitrary pickle deserialization (prefer safetensors)
- API server never directly executes model code
- Resource limits on uploads and GPU usage
- Audit logging for all operations
