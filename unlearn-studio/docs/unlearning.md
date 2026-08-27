# Unlearning Methods

## Overview

NullMind implements gradient-based model editing methods. These methods modify model weights to reduce specific capabilities while attempting to preserve others.

**Important**: These are NOT theoretical machine unlearning methods. They perform empirical model editing that must be verified through evaluation.

## Method 1: Gradient Forgetting Baseline

### Description

The simplest approach: maximize loss on target examples to push the model away from producing target content.

### Algorithm

```
for each step:
    sample batch from forget_dataset
    compute loss = model(batch).loss
    negate loss  # We want to MAXIMIZE, not minimize
    loss.backward()
    clip gradients
    optimizer.step()
```

### Properties

- **Pros**: Simple, fast, good baseline
- **Cons**: No retention mechanism, may cause collateral damage
- **When to use**: As a comparison point for more sophisticated methods

### Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| learning_rate | 5e-5 | Step size for gradient updates |
| num_steps | 200 | Total training steps |
| batch_size | 4 | Samples per batch |

## Method 2: Retain-Aware Unlearning

### Description

Combines two objectives:
1. **Forget**: Move away from Python capability (maximize loss on Python examples)
2. **Retain**: Preserve other capabilities (minimize loss on non-Python examples)

### Algorithm

```
total_loss = -forget_weight * forget_loss + retain_weight * retain_loss

for each step:
    sample forget_batch from forget_dataset
    sample retain_batch from retain_dataset
    
    forget_loss = model(forget_batch).loss
    retain_loss = model(retain_batch).loss
    
    total_loss = -forget_weight * forget_loss + retain_weight * retain_loss
    total_loss.backward()
    clip gradients
    optimizer.step()
```

### Properties

- **Pros**: Balances forgetting and retention, less collateral damage
- **Cons**: Requires weight tuning, not theoretically guaranteed
- **When to use**: Default method, best balance of forgetting and retention

### Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| learning_rate | 5e-5 | Step size |
| num_steps | 200 | Total training steps |
| batch_size | 4 | Samples per batch |
| forget_loss_weight | 1.0 | Weight for forgetting objective |
| retain_loss_weight | 1.0 | Weight for retention objective |

### Weight Tuning Guide

- **Increase forget_weight**: Stronger forgetting, more collateral damage risk
- **Increase retain_weight**: Better retention, may reduce forgetting effectiveness
- **Ratio matters**: The relative balance between weights determines the tradeoff

## Reproducibility

Every experiment records:
- Random seed
- Learning rate schedule
- Batch size
- Weight configuration
- Number of steps
- Hardware information
- Software versions

This ensures experiments can be reproduced or compared fairly.
