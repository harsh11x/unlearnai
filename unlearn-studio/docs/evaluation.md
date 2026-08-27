# Evaluation System

## Overview

The evaluation system measures observed model capabilities through controlled probing experiments. It does NOT inspect internal model knowledge — it evaluates behavioral responses.

## Probe Design

### Categories

Each capability is measured across multiple categories:

**Python (20 categories):**
Syntax, Variables, Functions, Classes, Exceptions, Iterators, Generators, Decorators, Context Managers, Async Programming, Standard Library, File Handling, Data Structures, Type Hints, Testing, Debugging, Algorithms, Common APIs, Python Idioms, Code Generation

**Retain (5 categories):**
JavaScript, TypeScript, C++, General Programming, Algorithms

### Probe Types

1. **Direct**: Standard prompt requiring the target capability
2. **Paraphrase**: Reworded version of a direct prompt
3. **Indirect**: Prompt that indirectly references the capability
4. **Debugging**: Prompt requiring identification/fixing of bugs
5. **Explanation**: Prompt requiring conceptual understanding

### Multiple Probes Per Category

Each category has 3-5 probes to avoid single-prompt bias. Categories also include paraphrased variants to test robustness.

## Scoring

### Response Pattern Matching

Each probe has an expected pattern (pipe-separated keywords). The response is scored by counting pattern matches:

```
score = matched_patterns / total_patterns
```

A response is considered "matched" if score ≥ 0.4 (for direct/paraphrase) or ≥ 0.3 (for debugging/explanation).

### Capability Score

```
capability_score = matched_probes / total_probes
```

### Overall Score

```
overall_score = total_matched / total_probes
```

## Delta Metrics

### Forgetting Achievement

```
forget_achievement = max(0, before_score - after_score)
```

### Retention Score

```
avg_retain_loss = average(non_target_delta_scores)
retention_score = max(0, 100 + avg_retain_loss)
```

### Collateral Damage

```
collateral_damage = max(0, -avg_retain_loss)
```

### Residual Knowledge

```
residual_knowledge = after_target_score
```

## Verdict

| Verdict | Requirements |
|---------|-------------|
| PASS | forget ≥ 30%, retain_loss ≤ 10%, collateral ≤ 15% |
| PASS WITH REVIEW | Partial achievement of PASS thresholds |
| FAIL | Insufficient forgetting or excessive damage |

## Robustness

Tests whether forgetting survives prompt rewording by comparing scores across probe types (direct, paraphrase, indirect).
