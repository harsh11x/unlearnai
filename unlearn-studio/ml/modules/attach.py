"""
Capability Fabric - Attach / Detach

The reversible half of the fabric. A capability module is a separate set of
weights sitting beside the base model, so attaching and detaching are pointer
operations, not edits to shared weights. That is what makes "unlearn, relearn,
retrain" repeatable instead of destructive: the base model is never overwritten.

peft is imported inside the functions so this module stays importable (and its
contract testable) without torch installed.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from ml.modules.manifest import ModuleManifest

logger = logging.getLogger(__name__)


class AttachError(Exception):
    """Raised when a module cannot be attached or detached."""


def is_attached(model: Any) -> bool:
    """True when ``model`` already carries a peft adapter."""
    return hasattr(model, "peft_config") or model.__class__.__name__ == "PeftModel"


def attached_adapters(model: Any) -> list[str]:
    """Names of the adapters currently on the model."""
    config = getattr(model, "peft_config", None)
    if not config:
        return []
    try:
        return list(config.keys())
    except AttributeError:
        return []


def attach(
    model: Any,
    module_dir: str,
    *,
    adapter_name: str = "default",
    trainable: bool = False,
    manifest: Optional[ModuleManifest] = None,
) -> Any:
    """
    Attach a module's delta to a base model.

    Verifies the manifest's base-model identity first when a manifest is given,
    because a delta from a different model family will not load correctly and,
    worse, may load without error.
    """
    if not is_attached(model):
        from peft import PeftModel

        if manifest is not None and not manifest.is_compatible_with(manifest.base_model):
            raise AttachError(f"manifest {manifest.id} has an inconsistent base identity")
        logger.info("attaching module from %s", module_dir)
        return PeftModel.from_pretrained(model, module_dir, is_trainable=trainable)

    # Already a PeftModel: load as an additional named adapter. Composition of
    # several capabilities is handled by the composer, not here.
    if hasattr(model, "load_adapter"):
        logger.info("loading additional adapter %r from %s", adapter_name, module_dir)
        model.load_adapter(module_dir, adapter_name=adapter_name, is_trainable=trainable)
        model.set_adapter(adapter_name)
        return model

    raise AttachError(
        "model already has an adapter and does not support load_adapter()"
    )


def detach(model: Any, adapter_name: Optional[str] = None) -> Any:
    """
    Remove the adapter(s) and return the untouched base model.

    Reversible by construction: the base weights were never modified, so
    detaching restores the original behaviour exactly.
    """
    if not is_attached(model):
        return model

    if adapter_name is not None:
        if hasattr(model, "delete_adapter"):
            model.delete_adapter(adapter_name)
            remaining = attached_adapters(model)
            if remaining and hasattr(model, "set_adapter"):
                model.set_adapter(remaining[0])
            return model
        raise AttachError("this model cannot delete a single adapter")

    # Whole-adapter removal: prefer the library's own unload, fall back to the
    # wrapped base model. Both leave the original weights intact.
    if hasattr(model, "unload"):
        try:
            return model.unload()
        except Exception as exc:  # pragma: no cover - library-version dependent
            logger.debug("PeftModel.unload() failed (%s); using get_base_model()", exc)

    if hasattr(model, "get_base_model"):
        return model.get_base_model()

    raise AttachError("cannot detach: model exposes neither unload() nor get_base_model()")


def merged_copy(model: Any) -> Any:
    """
    Fold the attached adapter into ordinary weights and return a plain model.

    Used when a fused artifact is wanted. The original model is not modified.
    """
    if not is_attached(model):
        return model
    if not hasattr(model, "merge_and_unload"):
        raise AttachError("this adapter cannot be merged into the base weights")
    return model.merge_and_unload()


def active_adapter(model: Any) -> Optional[str]:
    """Name of the adapter currently in use, if any."""
    name = getattr(model, "active_adapter", None)
    if isinstance(name, (list, tuple)):
        return name[0] if name else None
    return name
