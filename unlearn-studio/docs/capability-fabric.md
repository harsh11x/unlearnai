# Capability Fabric

Modules, composition, distillation and bounded self-direction, sitting on top of
the existing probe/evaluation stack.

## Why modules

The gradient pipeline edits shared weights, so reducing Python also damaged
JavaScript, TypeScript and C++ — that is the collateral-damage table in the
README, and it is not a bug in the optimiser. Knowledge is distributed across
the same parameters that hold everything else.

A **module** inverts the arrangement. Each capability lives in its own small
low-rank delta beside an untouched base model:

```
base model (unchanged)
  + module:python        LoRA delta + manifest + measured score
  + module:javascript    LoRA delta + manifest + measured score
```

That makes the operations this project wanted into pointer operations rather
than destructive edits:

| Operation | How it is expressed |
|---|---|
| Unlearn | detach the module; the base model is untouched |
| Relearn / acquire | train a new module |
| Retrain / heal | train a module with a retention term over protected examples |
| Combine | attach several modules, measured for interference |
| Ship | distil the composition into one dense model, gated on fidelity |

## The five objects

| Object | Location | Purpose |
|---|---|---|
| Module manifest | `ml/modules/manifest.py` | identity, base-model binding, evidence |
| Registry | `ml/registry.py` | on-disk index, ranked by measured delta |
| Trainer / attach | `ml/modules/trainer.py`, `ml/modules/attach.py` | fit and apply deltas |
| Composition | `ml/composition.py` | interference between modules |
| Distillation | `ml/distill.py` | fuse to dense, with a fidelity gate |
| Loop | `ml/loop.py` | bounded self-directed acquisition |

## Commands

```bash
# Fit a Python module and measure it before/after
python cli.py module train --capability python --steps 60 --verify

# Attach it to the base model and re-measure
python cli.py module apply --id <module-id> --model <base>

# Detach it — the base model is unchanged
python cli.py module apply --id <module-id> --model <base> --detach

# List modules and check their artifacts exist
python cli.py module list --validate

# Measure interference between two modules
python cli.py compose --modules <a> <b> --plan

# Distil a composition into one dense model, gated on fidelity
python cli.py fuse --modules <a> <b> --out storage/fused

# Bounded self-directed acquisition
python cli.py loop --budget 3 --held-out held_out_probes.json
```

`module list`, `compose --from-results` and `fuse --from-results` run **without
torch, transformers or peft**. Recorded measurements can be re-analysed and the
gate re-run on any machine, which is what makes a result auditable rather than
trusted.

## Interference

For module `A` owning capability `c`:

```
interference(A | B) = score(c, A+B) - score(c, A)
```

Negative means adding `B` cost `A` capability. At or below `-threshold`
(default 10 points) the pair is a **conflict**: `compose` exits non-zero and
`--plan` refuses to stack them, recording which module was dropped and why.
Interference is measured, never assumed.

## The fidelity gate

Fusing modules into one dense model is where success is easiest to overstate. A
fused artifact looks like one smaller model; whether it still does what the
composition did is a separate question.

`fuse` measures the composite, distils it, measures the fused artifact, and then
compares the two. Any capability that regresses by more than `--tolerance`
(default 5 points) fails the gate and the command exits non-zero. The result is
never reported as equivalent on the strength of the training having completed.

## The self-direction loop

The loop reads its own measured scores, takes the weakest capability it owns,
tries to acquire it, and keeps the change only if it clears the improvement bar
without collateral damage. Rejected changes are reverted and recorded.

**The rule that makes it trustworthy:** the loop may change modules; it may not
change what counts as success. Held-out probes are opened read-only,
fingerprinted at the start of the run, and re-verified after every acquisition.
If they change mid-run, `ImmutableProbeViolation` stops the run. Without this, a
self-modifying system can always "improve" by relaxing its own test.

What this is: bounded self-improvement against a measurable objective, with
optionally over a fixed capability set.

What this is not: autonomy in the general sense, self-authored goals,
self-awareness, or consciousness. No part of this system claims or attempts
those, and no claim about them should be inferred from the loop existing.

## The boundary on grafting

A delta binds to the base model it was fitted to (and its tokenizer). Manifests
record that identity and `require_compatible()` refuses anything else — a delta
from another model family will not do what its manifest claims, and may load
without error, which is worse than failing.

So "add a capability to any model" is accurate within a model family and false
across families. There is no mechanism here for transferring capability between
architectures, and the registry will not pretend otherwise.

## Evidence rules

1. `verified` is `False` unless scores were actually measured. An unverified
   module is a real delta, not evidence of a capability, and `register best`
   never returns one.
2. Re-registering a module id with different contents is refused, so a
   measurement cannot be silently overwritten by a later run.
3. Collateral damage is computed across all retained capabilities, and
   improvements on one capability never offset damage to another.
4. Every gate reports failure by exit code, not only in prose.

## Enforced invariants

Three prohibitions are implemented in [`ml/policy.py`](../ml/policy.py) rather
than left as good intentions. Each one has a failure mode that looks like
success from the inside, which is why prose was not enough.

| Prohibition | Enforcement |
|---|---|
| No sentience / self-awareness / unbounded self-authoring claim | `scan_claims()` over the README and `docs/`. Negated mentions ("this does not claim consciousness") are allowed, because the docs must be able to rule it out. Tested in CI. |
| No cross-architecture knowledge transfer | `require_compatible()` binds every delta to its base model (and tokenizer when known); `module apply` refuses a foreign base with exit 2 *before* loading weights. |
| No pass produced by loosening the test | `verify_fidelity` fails on any **unmeasured** capability unless the caller names it in `allow_unmeasured`, and records those exclusions. `tolerance` is capped at 10pp. `run_loop` refuses `min_delta < 30` or `max_collateral > 15`. All refusals exit 2. |

Two details worth knowing:

* **Unmeasured is fatal, not neutral.** The gate used to pass when a capability
  was never probed on the fused model. That was a gate satisfiable by measuring
  less. It now fails, and skipping a capability requires naming it explicitly so
  the report shows what was left out.
* **Evidence grade is recorded.** A loop run without held-out probes is marked
  `self-measured` and `trustworthy: false` in its report, because training and
  evaluating on the same instruments is weaker evidence no matter how good the
  number looks.

## Tests

`tests/test_capability_fabric.py` runs without torch and covers the decisions:
manifest identity and binding, registry ranking and persistence, interference
arithmetic, the fidelity gate, loop policy and rejection, held-out immutability,
and the CLI's offline paths.

The torch paths (train, attach, distil) are thin wrappers around peft; they are
kept small deliberately because they cannot be exercised in the torch-free test
environment.
