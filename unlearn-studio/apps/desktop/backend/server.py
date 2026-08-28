"""
Unlearn Studio — Python ML Backend
Communicates with Electron via JSON-RPC over stdio.
All heavy compute (model loading, training, unlearning) happens here.
"""

import sys
import json
import os
import traceback
import threading
import time
import signal

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from model_loader import ModelLoader
from weight_analyzer import WeightAnalyzer
from unlearn_engine import UnlearnEngine
from eval_engine import EvalEngine
from device_manager import DeviceManager


class Backend:
    def __init__(self):
        self.model_loader = ModelLoader()
        self.weight_analyzer = WeightAnalyzer()
        self.unlearn_engine = UnlearnEngine()
        self.eval_engine = EvalEngine()
        self.device_manager = DeviceManager()
        self.current_model = None
        self.current_metadata = None

    def handle(self, method: str, params: dict) -> dict:
        """Route a JSON-RPC method call to the appropriate handler."""
        try:
            handler = getattr(self, f"_{method.replace('.', '_')}", None)
            if handler is None:
                return {"error": f"Unknown method: {method}"}
            return {"result": handler(**params)}
        except Exception as e:
            return {"error": f"{type(e).__name__}: {e}\n{traceback.format_exc()}"}

    # ── Device Info ──

    def _device_info(self) -> dict:
        return self.device_manager.get_info()

    def _device_monitor(self) -> dict:
        return self.device_manager.get_usage()

    # ── Model Loading ──

    def _model_load(self, path: str) -> dict:
        """Load a model from a file path. Returns metadata about the model."""
        self.current_model, self.current_metadata = self.model_loader.load(path)
        return self.current_metadata

    def _model_load_folder(self, path: str) -> dict:
        """Load a model from a HuggingFace-style directory."""
        self.current_model, self.current_metadata = self.model_loader.load_folder(path)
        return self.current_metadata

    def _model_layers(self) -> dict:
        """Get structured layer information for the loaded model."""
        if self.current_model is None:
            return {"error": "No model loaded"}
        return {"layers": self.weight_analyzer.get_layers(self.current_model)}

    def _model_summary(self) -> dict:
        """Get a full model summary with parameter counts per component."""
        if self.current_model is None:
            return {"error": "No model loaded"}
        return self.weight_analyzer.get_summary(self.current_model)

    # ── Weight Analysis ──

    def _weight_stats(self, tensor_name: str) -> dict:
        """Get statistical summary of a specific tensor (mean, std, min, max, etc.)."""
        if self.current_model is None:
            return {"error": "No model loaded"}
        return self.weight_analyzer.tensor_stats(self.current_model, tensor_name)

    def _weight_list(self) -> dict:
        """List all tensors with names, shapes, dtypes, sizes."""
        if self.current_model is None:
            return {"error": "No model loaded"}
        return {"tensors": self.weight_analyzer.list_tensors(self.current_model)}

    def _weight_heatmap(self, tensor_name: str, size: int = 128) -> dict:
        """Generate heatmap data for a tensor. Returns a flat array of values."""
        if self.current_model is None:
            return {"error": "No model loaded"}
        return self.weight_analyzer.generate_heatmap(self.current_model, tensor_name, size)

    def _weight_gradient(self, tensor_name: str) -> dict:
        """Get gradient data for a tensor (if available after backward pass)."""
        if self.current_model is None:
            return {"error": "No model loaded"}
        return self.weight_analyzer.get_gradient(self.current_model, tensor_name)

    # ── Unlearning ──

    def _unlearn_start(self, config: dict) -> dict:
        """Start an unlearning job. Runs in a background thread."""
        if self.current_model is None:
            return {"error": "No model loaded"}

        job_id = self.unlearn_engine.start(
            model=self.current_model,
            config=config,
            device=self.device_manager.device,
            callback=self._unlearn_progress_callback,
        )
        return {"job_id": job_id, "status": "started"}

    def _unlearn_progress(self, job_id: str) -> dict:
        """Get current progress of a running unlearning job."""
        return self.unlearn_engine.get_progress(job_id)

    def _unlearn_cancel(self, job_id: str) -> dict:
        """Cancel a running unlearning job."""
        self.unlearn_engine.cancel(job_id)
        return {"status": "cancelled"}

    def _unlearn_stop(self) -> dict:
        """Stop the current unlearning job and revert to the original model."""
        self.unlearn_engine.stop()
        if self.current_model is not None and self.unlearn_engine.original_state is not None:
            self.current_model.load_state_dict(self.unlearn_engine.original_state)
        return {"status": "stopped"}

    def _unlearn_progress_callback(self, job_id: str, data: dict):
        """Called from the unlearn thread to update progress."""
        # Store progress data — the Electron side polls _unlearn_progress
        pass

    # ── Evaluation ──

    def _eval_probes(self, config: dict) -> dict:
        """Run evaluation probes against the current model."""
        if self.current_model is None:
            return {"error": "No model loaded"}
        return self.eval_engine.run_probes(self.current_model, config)

    # ── Export ──

    def _model_export(self, path: str, format: str = "safetensors") -> dict:
        """Export the current (possibly modified) model to disk."""
        if self.current_model is None:
            return {"error": "No model loaded"}
        return self.model_loader.save(self.current_model, self.current_metadata, path, format)

    # ── Info ──

    def _system_info(self) -> dict:
        """Get system info: Python version, torch version, available memory, etc."""
        import torch
        import psutil
        return {
            "python": sys.version,
            "torch": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "cuda_version": torch.version.cuda if torch.cuda.is_available() else None,
            "mps_available": hasattr(torch.backends, "mps") and torch.backends.mps.is_available(),
            "ram_total_gb": round(psutil.virtual_memory().total / (1024**3), 1),
            "ram_available_gb": round(psutil.virtual_memory().available / (1024**3), 1),
            "cpu_count": psutil.cpu_count(),
            "device": str(self.device_manager.device),
        }


def main():
    backend = Backend()

    # Send ready signal
    write_response({"jsonrpc": "2.0", "method": "ready", "params": backend._system_info()})

    # Main message loop — read JSON-RPC from stdin, write responses to stdout
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            write_response({"jsonrpc": "2.0", "error": "Invalid JSON"})
            continue

        method = request.get("method", "")
        params = request.get("params", {})
        req_id = request.get("id")

        result = backend.handle(method, params)

        if req_id is not None:
            response = {"jsonrpc": "2.0", "id": req_id}
            if "error" in result:
                response["error"] = result["error"]
            else:
                response["result"] = result.get("result", result)
            write_response(response)


def write_response(response: dict):
    """Write a JSON-RPC response to stdout."""
    try:
        line = json.dumps(response) + "\n"
        sys.stdout.write(line)
        sys.stdout.flush()
    except (BrokenPipeError, OSError):
        pass


if __name__ == "__main__":
    main()
