"""
Device Manager — Detects and manages GPU/CPU compute resources.
Selects the best available device (CUDA > MPS > CPU).
"""

import torch
import psutil
import time


class DeviceManager:
    def __init__(self):
        self.device = self._select_device()
        self._last_cpu = None
        self._last_time = None

    def _select_device(self) -> torch.device:
        """Select the best available compute device."""
        if torch.cuda.is_available():
            # Use the first CUDA device
            return torch.device("cuda:0")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            # Apple Silicon GPU
            return torch.device("mps")
        else:
            return torch.device("cpu")

    def get_info(self) -> dict:
        """Get detailed device information."""
        info = {
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
