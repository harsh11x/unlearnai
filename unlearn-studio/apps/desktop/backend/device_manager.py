"""
Device Manager — Detects and manages GPU/CPU compute resources.
Selects the best available device (CUDA > MPS > CPU), unless the user has
pinned one (Settings → Backend → Compute device, or the REMAP_DEVICE env var,
which is what the desktop shell passes through on spawn).
"""

import os

import torch
import psutil
import time

VALID_PREFERENCES = ("auto", "cpu", "mps", "cuda")


class DeviceManager:
    def __init__(self, preference: str | None = None):
        self.preference = self._normalise(preference if preference is not None else os.environ.get("REMAP_DEVICE"))
        self.device = self._select_device()
        self._last_cpu = None
        self._last_time = None

    @staticmethod
    def _normalise(pref) -> str:
        if not isinstance(pref, str):
            return "auto"
        pref = pref.strip().lower()
        return pref if pref in VALID_PREFERENCES else "auto"

    def available_devices(self) -> list:
        """Every device this machine could run on, for the settings dropdown."""
        out = ["cpu"]
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            out.append("mps")
        if torch.cuda.is_available():
            out.append("cuda")
        return out

    def _select_device(self) -> torch.device:
        """Select the compute device, honouring an explicit user preference."""
        pref = self.preference

        # An explicit pin is only honoured when the hardware really supports it;
        # silently falling back keeps the app usable instead of crashing at the
        # first tensor op.
        if pref == "cpu":
            return torch.device("cpu")
        if pref == "mps":
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return torch.device("mps")
            return torch.device("cpu")
        if pref == "cuda":
            if torch.cuda.is_available():
                return torch.device("cuda:0")
            return torch.device("cpu")

        if torch.cuda.is_available():
            # Use the first CUDA device
            return torch.device("cuda:0")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            # Apple Silicon GPU
            return torch.device("mps")
        else:
            return torch.device("cpu")

    def set_preference(self, preference: str) -> dict:
        """Pin (or unpin) the compute device without restarting the backend."""
        self.preference = self._normalise(preference)
        self.device = self._select_device()
        return self.get_info()

    def get_info(self) -> dict:
        """Get detailed device information."""
        info = {
            "preference": getattr(self, "preference", "auto"),
            "available": self.available_devices(),
            "device": str(self.device),
            "device_type": self.device.type,
        }

        if self.device.type == "cuda":
            props = torch.cuda.get_device_properties(self.device)
            info.update({
                "gpu_name": props.name,
                "gpu_memory_total_gb": round(props.total_mem / (1024**3), 2),
                "gpu_memory_free_gb": round(
                    (props.total_mem - torch.cuda.memory_allocated(self.device)) / (1024**3), 2
                ),
                "gpu_memory_used_gb": round(
                    torch.cuda.memory_allocated(self.device) / (1024**3), 2
                ),
                "cuda_version": torch.version.cuda,
                "compute_capability": f"{props.major}.{props.minor}",
                "multi_processor_count": props.multi_processor_count,
            })
        elif self.device.type == "mps":
            info.update({
                "gpu_name": "Apple Silicon GPU (Metal Performance Shaders)",
                "gpu_memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 1),
            })
        else:
            info.update({
                "cpu_name": self._get_cpu_name(),
                "cpu_count": psutil.cpu_count(),
                "cpu_physical_count": psutil.cpu_count(logical=False),
                "ram_total_gb": round(psutil.virtual_memory().total / (1024**3), 1),
                "ram_available_gb": round(psutil.virtual_memory().available / (1024**3), 1),
            })

        return info

    def get_usage(self) -> dict:
        """Get current resource usage (for real-time monitoring)."""
        now = time.time()
        cpu_percent = psutil.cpu_percent(interval=0)
        mem = psutil.virtual_memory()

        usage = {
            "cpu_percent": cpu_percent,
            "ram_percent": mem.percent,
            "ram_used_gb": round(mem.used / (1024**3), 2),
            "ram_total_gb": round(mem.total / (1024**3), 2),
            "timestamp": now,
        }

        if self.device.type == "cuda":
            usage.update({
                "gpu_memory_used_gb": round(
                    torch.cuda.memory_allocated(self.device) / (1024**3), 2
                ),
                "gpu_memory_reserved_gb": round(
                    torch.cuda.memory_reserved(self.device) / (1024**3), 2
                ),
                "gpu_utilization": self._get_gpu_utilization(),
            })

        return usage

    def _get_cpu_name(self) -> str:
        try:
            with open("/proc/cpuinfo", "r") as f:
                for line in f:
                    if "model name" in line:
                        return line.split(":")[1].strip()
        except FileNotFoundError:
            pass
        return f"CPU ({psutil.cpu_count()} cores)"

    def _get_gpu_utilization(self) -> float:
        try:
            if self.device.type == "cuda":
                return torch.cuda.utilization(self.device)
        except Exception:
            pass
        return 0.0
