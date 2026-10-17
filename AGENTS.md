# Agent rules for this repository

Unlearn Studio / Remap Studios: machine unlearning research tooling.
Python package in `unlearn-studio/` (`ml/`, `services/`, `apps/`).

These rules exist because the project is easy to overclaim. They are enforced in
code (`unlearn-studio/ml/policy.py`, `unlearn-studio/tests/test_capability_fabric.py`)
and must not be relaxed.

## Never do these

1. **Never promise or imply sentience, self-awareness, or unbounded
   self-authoring.** The self-direction loop is bounded self-improvement against
   a measurement it cannot edit. That is a different claim. Do not describe the
   system as conscious, alive, autonomous in the general sense, or as authoring
   its own goals. Do not soften this into "it learns on its own" — that shaping
   is how a demo becomes a lie.

2. **Never claim cross-architecture knowledge transfer.** A LoRA delta binds to
   the base model and tokenizer it was fitted to. "Add a capability to any
   model" is accurate only within a model family. Do not describe merging,
   grafting or distilling as moving knowledge between architectures.

3. **Never make a check pass by loosening it.** A failing result is a result.
   Do not widen a tolerance, lower a threshold, drop a capability from a required
   list, skip an unmeasured capability, delete a failing test, weaken an
   assertion, or add a type/lint suppression to get green. If a check is wrong,
   fix the check and explain why in the commit or PR — and verify the behaviour
   it was protecting.

## Evidence rules

* `verified` is `False` unless scores were measured. An unverified module is a
  real delta, not evidence of a capability.
* No capability claim ships without a measured before/after, with collateral
  damage reported.
* Report failures and refusals explicitly. "Not run" is not "passed".
* Prefer refusing to proceeding on a guess. If a target cannot be matched to
  tensors, say so and list candidates — never edit arbitrary weights and label
  the result with the requested target.

## Practical notes

* `python cli.py module list`, `compose --from-results` and
  `fuse --from-results` run without torch. Recorded measurements are auditable
  on any machine; keep it that way by not adding eager torch imports to those
  paths.
* Tests: `python -m pytest tests/ --ignore=tests/test_evaluation_scoring.py`
  (that file needs torch).
* Docs: `unlearn-studio/docs/capability-fabric.md` for the module system;
  `docs/BUGS.md` for known issues.
