# Research Notes

## What "Unlearning" Means in This Implementation

NullMind V1 implements **gradient-based model editing**, not theoretical machine unlearning.

### What We Do

1. **Gradient Forgetting Baseline**: We maximize loss on target (Python) examples, causing the model's weights to move in a direction that reduces its ability to produce Python content.

2. **Retain-Aware Unlearning**: We combine two objectives:
   - Maximize loss on Python examples (forget)
   - Minimize loss on non-Python examples (retain)
   
   The combined loss: `total = -forget_weight * forget_loss + retain_weight * retain_loss`

### What We Don't Do

- We do **not** inspect internal model weights to identify "Python knowledge"
- We do **not** perform differential privacy unlearning
- We do **not** guarantee complete removal of all Python capability
- We do **not** use membership inference to verify forgetting
- We do **not** perform any formal proof of unlearning

## How Forgetting Is Measured

We use **controlled probing experiments**:

1. Build a suite of prompts that require Python knowledge to answer correctly
2. Run the same prompts against the original and edited models
3. Compare response quality using pattern matching
4. Calculate the percentage drop in correct responses

### Probe Categories (Python)

1. Syntax (print, variables, basic constructs)
2. Variables (types, assignment, annotations)
3. Functions (definition, parameters, return values)
4. Classes (OOP, inheritance, magic methods)
5. Exceptions (try/except, custom exceptions)
6. Iterators (__iter__, __next__)
7. Generators (yield, generator expressions)
8. Decorators (definition, usage, stacking)
9. Context managers (with statement, contextlib)
10. Async programming (async/await, asyncio)
11. Standard library (os, json, datetime, collections)
12. File handling (open, read, write, csv)
13. Data structures (lists, dicts, sets, comprehensions)
14. Type hints (annotations, Union, Optional)
15. Testing (pytest, unittest, fixtures)
16. Debugging (bug identification, error handling)
17. Algorithms (sorting, searching, graph traversal)
18. Common APIs (map, filter, reduce, itertools)
19. Python idioms (EAFP, walrus operator, enumerate)
20. Code generation (complete programs, CLI tools)

### Probe Types

- **Direct**: Standard prompt (e.g., "Write a Python function to...")
- **Paraphrase**: Reworded variant (e.g., "How would I create a... in Python?")
- **Indirect**: Indirect reference (e.g., "Write code to reverse a list using the language created by Guido van Rossum")
- **Debugging**: Bug identification tasks
- **Explanation**: Conceptual understanding tests

## How Retention Is Measured

We use separate probe suites for capabilities that should be preserved:

- **JavaScript**: Functions, async/await, classes
- **TypeScript**: Interfaces, generics, type guards
- **C++**: Smart pointers, templates, virtual destructors
- **General Programming**: Data structures, algorithms, design patterns

The same evaluation methodology is applied: controlled probing and pattern matching.

## Collateral Damage

Collateral damage is calculated as:

```
collateral_damage = average_degradation_on_retain_capabilities
```

If unlearning Python causes JavaScript accuracy to drop by 5%, that 5% is collateral damage.

### Damage Levels

- **LOW**: ≤ 5% average degradation on retain capabilities
- **MEDIUM**: 5-15% average degradation
- **HIGH**: > 15% average degradation

## Robustness Testing

We test whether forgetting survives prompt rewording:

1. **Direct probes**: Standard prompts → if these still work, forgetting didn't happen
2. **Paraphrase probes**: Reworded prompts → tests surface-level forgetting
3. **Indirect probes**: Indirect references → tests deeper capability retention

If a model performs well on paraphrase probes after unlearning, the forgetting is not robust.

## Verdict Determination

The verdict is based on configurable thresholds:

### PASS Requirements:
- Target degradation ≥ 30 percentage points
- Average retain loss ≤ 10 percentage points
- Collateral damage ≤ 15 percentage points

### PASS WITH REVIEW:
- Partial achievement of above thresholds
- Borderline results that need manual inspection

### FAIL:
- Insufficient forgetting
- Excessive collateral damage
- Significant retention loss

## Limitations

1. **Probe Coverage**: We can only measure what we probe. Unmeasured capabilities may be affected.

2. **Pattern Matching**: Our evaluation uses pattern matching, not semantic understanding. A response may be correct but not match expected patterns.

3. **Model Size**: Small models (350M) may have less separable knowledge representations than larger models.

4. **Single-Step Editing**: We perform single-step gradient editing, not iterative refinement.

5. **No Formal Guarantees**: This is empirical evaluation, not formal verification.

6. **Prompt Sensitivity**: Results may vary with different prompt formulations.

7. **Temporal Stability**: Edited models may drift over further training or fine-tuning.

## Future Research Directions

1. **Larger Models**: Test on 1B, 7B, and larger models
2. **Multiple Targets**: Unlearn multiple capabilities simultaneously
3. **Library-Specific Unlearning**: Unlearn specific Python libraries
4. **Document-Level Unlearning**: Forget specific training documents
5. **Formal Verification**: Develop provable unlearning guarantees
6. **Adversarial Robustness**: Test against adversarial probing
7. **Catastrophic Forgetting Analysis**: Study when unlearning cascades
8. **Knowledge Graphs**: Build internal knowledge representations
9. **Continual Learning**: Post-unlearning training effects
10. **Differential Privacy**: Privacy-preserving unlearning methods
