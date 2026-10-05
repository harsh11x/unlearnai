"""
GGUF tensor dequantization (pure NumPy).

GGUF stores weights in packed blocks. Until those blocks are unpacked we cannot
compute real statistics, draw real heatmaps, or perform any weight surgery —
which is exactly why quantized models previously reported "needs real weight
data".

This module implements the ggml block formats so a Q4_K_M / Q8_0 file can be
materialized as float32 tensors and then treated exactly like a Safetensors
checkpoint: inspect, edit, prune, retrain, export.

Every implementation below mirrors the reference `dequantize_row_*` functions
in ggml. Formats that are not implemented raise UnsupportedQuantType — it is
far better to refuse than to silently hand back wrong weights.

Implemented
  F32, F16, BF16, F64
  Q4_0, Q4_1, Q5_0, Q5_1, Q8_0, Q8_1
  Q4_K, Q5_K, Q6_K        (the K-quants used by Q4_K_M / Q5_K_M / Q6_K files)

Not implemented (raise UnsupportedQuantType)
  Q2_K, Q3_K, Q8_K, the IQ* family, TQ1_0, TQ2_0
"""

import numpy as np


class UnsupportedQuantType(Exception):
    """Raised when a ggml quant type has no verified dequantizer."""


# ggml_type enum names (for reporting)
GGML_TYPE_NAMES = {
    0: "F32", 1: "F16", 2: "Q4_0", 3: "Q4_1", 6: "Q5_0", 7: "Q5_1",
    8: "Q8_0", 9: "Q8_1", 10: "Q2_K", 11: "Q3_K", 12: "Q4_K",
    13: "Q5_K", 14: "Q6_K", 15: "Q8_K", 16: "IQ2_XXS", 17: "IQ2_XS",
    18: "IQ3_XXS", 19: "IQ1_S", 20: "IQ4_NL", 21: "IQ3_S", 22: "IQ2_S",
    23: "IQ4_XS", 24: "I8", 25: "I16", 26: "I32", 27: "I64", 28: "F64",
    29: "IQ1_M", 30: "BF16", 34: "TQ1_0", 35: "TQ2_0",
}

# type id → (elements per block, bytes per block). From ggml's type_traits.
BLOCK_LAYOUT = {
    0: (1, 4),       # F32
    1: (1, 2),       # F16
    2: (32, 18),     # Q4_0
    3: (32, 20),     # Q4_1
    6: (32, 22),     # Q5_0
    7: (32, 24),     # Q5_1
    8: (32, 34),     # Q8_0
    9: (32, 40),     # Q8_1
    12: (256, 144),  # Q4_K
    13: (256, 176),  # Q5_K
    14: (256, 210),  # Q6_K
    28: (1, 8),      # F64
    30: (1, 2),      # BF16
}

SUPPORTED_TYPE_NAMES = [GGML_TYPE_NAMES[t] for t in sorted(BLOCK_LAYOUT)]


def is_supported(ggml_type: int) -> bool:
    return ggml_type in BLOCK_LAYOUT


def type_name(ggml_type: int) -> str:
    return GGML_TYPE_NAMES.get(ggml_type, f"type_{ggml_type}")


def type_size_bytes(ggml_type: int) -> int:
    return BLOCK_LAYOUT[ggml_type][1]


def dequantize(raw: bytes, ggml_type: int, n_elements: int) -> np.ndarray:
    """
    Unpack `raw` into a flat float32 array of length `n_elements`.

    The result is in ggml element order (ne[0] fastest). Callers that want a
    torch-style weight should reshape with the reversed dims — see
    `reshape_to_torch`.
    """
    if ggml_type not in BLOCK_LAYOUT:
        raise UnsupportedQuantType(
            f"{type_name(ggml_type)} dequantization is not implemented. "
            f"Supported formats: {', '.join(SUPPORTED_TYPE_NAMES)}."
        )

    block_elems, block_bytes = BLOCK_LAYOUT[ggml_type]

    if block_elems == 1:
        if ggml_type == 0:
            return np.frombuffer(raw, dtype="<f4", count=n_elements).astype(np.float32)
        if ggml_type == 1:
            return np.frombuffer(raw, dtype="<f2", count=n_elements).astype(np.float32)
        if ggml_type == 28:
            return np.frombuffer(raw, dtype="<f8", count=n_elements).astype(np.float32)
        if ggml_type == 30:
            bits = np.frombuffer(raw, dtype="<u2", count=n_elements)
            return _bf16_to_f32(bits)

    n_blocks = (n_elements + block_elems - 1) // block_elems
    needed = n_blocks * block_bytes
    if len(raw) < needed:
        raise ValueError(
            f"Truncated tensor: need {needed} bytes for {n_blocks} "
            f"{type_name(ggml_type)} blocks, got {len(raw)}"
        )
    buf = np.frombuffer(raw[:needed], dtype=np.uint8)

    if ggml_type == 2:
        out = _q4_0(buf, n_blocks)
    elif ggml_type == 3:
        out = _q4_1(buf, n_blocks)
    elif ggml_type == 6:
        out = _q5_0(buf, n_blocks)
    elif ggml_type == 7:
        out = _q5_1(buf, n_blocks)
    elif ggml_type == 8:
        out = _q8_0(buf, n_blocks)
    elif ggml_type == 9:
        out = _q8_1(buf, n_blocks)
    elif ggml_type == 12:
        out = _q4_k(buf, n_blocks)
    elif ggml_type == 13:
        out = _q5_k(buf, n_blocks)
    elif ggml_type == 14:
        out = _q6_k(buf, n_blocks)
    else:  # pragma: no cover - guarded by BLOCK_LAYOUT
        raise UnsupportedQuantType(type_name(ggml_type))

    return out[:n_elements].astype(np.float32)


def reshape_to_torch(flat: np.ndarray, shape) -> np.ndarray:
    """
    Reshape a flat ggml-order array into a torch-order tensor.

    GGUF lists dims fastest-first (ne[0], ne[1], ...) while PyTorch/NumPy list
    them slowest-first, so the dims must be reversed.
    """
    dims = tuple(int(d) for d in shape)
    if not dims:
        return flat
    return flat.reshape(tuple(reversed(dims)))


def _bf16_to_f32(bits: np.ndarray) -> np.ndarray:
    """bfloat16 → float32 by placing the 16 significant bits in the high half."""
    return (bits.astype(np.uint32) << 16).view(np.float32)


def _f16_from(u8: np.ndarray) -> np.ndarray:
    """
    Interpret an (..., 2) uint8 array of little-endian fp16 bytes as float32.

    The trailing byte axis is consumed, so an (n, 2) input yields shape (n,) —
    matching how the block layouts address the scale/min fields. Using
    `.view("<f2")` directly here is not safe: it keeps the trailing axis
    (giving (n, 1)) and produced NaN for misaligned buffers.
    """
    if u8.ndim == 1:
        u8 = u8.reshape(-1, 2)
    lo = u8[..., 0].astype(np.uint16)
    hi = u8[..., 1].astype(np.uint16)
    return (lo | (hi << 8)).view(np.float16).astype(np.float32)


# ══════════════════════════════════════════════════════════════════════
# Legacy 32-element block formats
# ══════════════════════════════════════════════════════════════════════

def _q4_0(buf, nb):
    """block: f16 d; u8 qs[16]  →  (nibble - 8) * d"""
    b = buf.reshape(nb, 18)
    d = _f16_from(b[:, :2])                       # (nb,)
    qs = b[:, 2:].astype(np.int16)
    low = (qs & 0x0F).astype(np.float32) - 8.0
    high = (qs >> 4).astype(np.float32) - 8.0
    return (np.concatenate([low, high], axis=1) * d[:, None]).reshape(-1)


def _q4_1(buf, nb):
    """block: f16 d; f16 m; u8 qs[16]  →  nibble * d + m"""
    b = buf.reshape(nb, 20)
    d = _f16_from(b[:, :2])
    m = _f16_from(b[:, 2:4])
    qs = b[:, 4:].astype(np.int16)
    low = (qs & 0x0F).astype(np.float32)
    high = (qs >> 4).astype(np.float32)
    q = np.concatenate([low, high], axis=1)
    return (q * d[:, None] + m[:, None]).reshape(-1)


def _q5_0(buf, nb):
    """block: f16 d; u8 qh[4]; u8 qs[16]  →  (q | bit<<4) - 16) * d"""
    b = buf.reshape(nb, 22)
    d = _f16_from(b[:, :2])
    qh = _u32_from(b[:, 2:6])                              # 32 high bits
    qs = b[:, 6:].astype(np.int16)
    bits = _u32_to_bits(qh)                                # (nb, 32)
    low = (qs & 0x0F) | (bits[:, :16].astype(np.int16) << 4)
    high = (qs >> 4) | (bits[:, 16:].astype(np.int16) << 4)
    q = np.concatenate([low, high], axis=1).astype(np.float32) - 16.0
    return (q * d[:, None]).reshape(-1)


def _q5_1(buf, nb):
    """block: f16 d; f16 m; u8 qh[4]; u8 qs[16]  →  q * d + m"""
    b = buf.reshape(nb, 24)
    d = _f16_from(b[:, :2])
    m = _f16_from(b[:, 2:4])
    qh = _u32_from(b[:, 4:8])
    qs = b[:, 8:].astype(np.int16)
    bits = _u32_to_bits(qh)
    low = (qs & 0x0F) | (bits[:, :16].astype(np.int16) << 4)
    high = (qs >> 4) | (bits[:, 16:].astype(np.int16) << 4)
    q = np.concatenate([low, high], axis=1).astype(np.float32)
    return (q * d[:, None] + m[:, None]).reshape(-1)


def _q8_0(buf, nb):
    """block: f16 d; i8 qs[32]  →  q * d"""
    b = buf.reshape(nb, 34)
    d = _f16_from(b[:, :2])
    q = b[:, 2:].copy().view("<i1").astype(np.float32)
    return (q * d[:, None]).reshape(-1)


def _q8_1(buf, nb):
    """block: f32 d; f32 s; i8 qs[32]  →  q * d"""
    b = buf.reshape(nb, 40)
    d = _f32_from(b[:, :4])
    q = b[:, 8:].copy().view("<i1").astype(np.float32)
    return (q * d[:, None]).reshape(-1)


def _f32_from(u8: np.ndarray) -> np.ndarray:
    """Interpret an (..., 4) uint8 array of little-endian fp32 bytes as float32."""
    if u8.ndim == 1:
        u8 = u8.reshape(-1, 4)
    acc = (u8[..., 0].astype(np.uint32)
           | (u8[..., 1].astype(np.uint32) << 8)
           | (u8[..., 2].astype(np.uint32) << 16)
           | (u8[..., 3].astype(np.uint32) << 24))
    return acc.view(np.float32)


def _u32_from(u8: np.ndarray) -> np.ndarray:
    """Interpret an (..., 4) uint8 array of little-endian bytes as uint32."""
    if u8.ndim == 1:
        u8 = u8.reshape(-1, 4)
    return (u8[..., 0].astype(np.uint32)
            | (u8[..., 1].astype(np.uint32) << 8)
            | (u8[..., 2].astype(np.uint32) << 16)
            | (u8[..., 3].astype(np.uint32) << 24))


def _u32_to_bits(vals: np.ndarray) -> np.ndarray:
    """Expand an (n,) uint32 array into an (n, 32) array of 0/1 bits, LSB first."""
    shifts = np.arange(32, dtype=np.uint32)
    return ((vals[:, None] >> shifts) & 1).astype(np.uint8)


# ══════════════════════════════════════════════════════════════════════
# K-quant super-blocks (256 elements)
# ══════════════════════════════════════════════════════════════════════

def _get_scale_min_k4(j: int, scales: np.ndarray):
    """
    Unpack the 6-bit (scale, min) pair for sub-block `j` (0..7) from the
    12-byte `scales` array. Faithful port of ggml's get_scale_min_k4.

    scales: (nb, 12) uint8
    """
    if j < 4:
        d = scales[:, j] & 63
        m = scales[:, j + 4] & 63
    else:
        d = (scales[:, j + 4] & 0x0F) | ((scales[:, j - 4] >> 6) << 4)
        m = (scales[:, j + 4] >> 4) | ((scales[:, j] >> 6) << 4)
    return d.astype(np.float32), m.astype(np.float32)


def _q4_k(buf, nb):
    """
    block_q4_K: f16 d; f16 dmin; u8 scales[12]; u8 qs[128]

    ggml walks 64 elements at a time: 32 low nibbles then 32 high nibbles,
    both taken from the same 32-byte slice of qs.
    """
    b = buf.reshape(nb, 144)
    d = _f16_from(b[:, :2])                              # (nb,)
    dmin = _f16_from(b[:, 2:4])
    scales = b[:, 4:16]
    qs = b[:, 16:].astype(np.int32)                      # (nb, 128)

    out = np.empty((nb, 256), dtype=np.float32)
    for j in range(8):                                   # 8 sub-blocks of 32
        sc, mn = _get_scale_min_k4(j, scales)
        slice_ = qs[:, (j // 2) * 32:(j // 2 + 1) * 32]
        nib = (slice_ & 0x0F) if (j % 2 == 0) else (slice_ >> 4)
        out[:, j * 32:(j + 1) * 32] = d[:, None] * sc[:, None] * nib.astype(np.float32) - dmin[:, None] * mn[:, None]
    return out.reshape(-1)


def _q5_k(buf, nb):
    """
    block_q5_K: f16 d; f16 dmin; u8 scales[12]; u8 qh[32]; u8 qs[128]

    Same walk as Q4_K, but each element's 5th bit comes from qh using a mask
    that rotates by 2 bits per 64-element group.
    """
    b = buf.reshape(nb, 176)
    d = _f16_from(b[:, :2])
    dmin = _f16_from(b[:, 2:4])
    scales = b[:, 4:16]
    qh = b[:, 16:48].astype(np.int32)                    # (nb, 32)
    qs = b[:, 48:].astype(np.int32)                      # (nb, 128)

    out = np.empty((nb, 256), dtype=np.float32)
    for j in range(8):
        sc, mn = _get_scale_min_k4(j, scales)
        group = j // 2                                   # 0..3
        slice_ = qs[:, group * 32:(group + 1) * 32]
        if j % 2 == 0:
            nib = slice_ & 0x0F
            hmask = 1 << (2 * group)                     # u1: 1,4,16,64
        else:
            nib = slice_ >> 4
            hmask = 2 << (2 * group)                     # u2: 2,8,32,128
        hi = np.where((qh[:, :32] & hmask) != 0, 16, 0)
        q = nib + hi
        out[:, j * 32:(j + 1) * 32] = d[:, None] * sc[:, None] * q.astype(np.float32) - dmin[:, None] * mn[:, None]
    return out.reshape(-1)


def _q6_k(buf, nb):
    """
    block_q6_K: u8 ql[128]; u8 qh[64]; i8 scales[16]; f16 d

    ggml processes two 128-element halves. Within each half, index l runs
    0..32 and produces four outputs at l+0, l+32, l+64, l+96 from the low
    nibble of ql[l], the low nibble of ql[l+32], and their high nibbles,
    each combined with a 2-bit field of qh[l] shifted by 0/2/4/6.
    """
    b = buf.reshape(nb, 210)
    ql = b[:, :128].astype(np.int32)
    qh = b[:, 128:192].astype(np.int32)
    scales = b[:, 192:208].copy().view("<i1").astype(np.int32)   # (nb, 16)
    d = _f16_from(b[:, 208:210])                                 # (nb,)

    out = np.empty((nb, 256), dtype=np.float32)
    for half in range(2):
        ql_base = half * 64
        qh_base = half * 32
        sc_base = half * 8
        out_base = half * 128

        q1 = (ql[:, ql_base:ql_base + 32] & 0x0F) | (((qh[:, qh_base:qh_base + 32] >> 0) & 3) << 4)
        q2 = (ql[:, ql_base + 32:ql_base + 64] & 0x0F) | (((qh[:, qh_base:qh_base + 32] >> 2) & 3) << 4)
        q3 = (ql[:, ql_base:ql_base + 32] >> 4) | (((qh[:, qh_base:qh_base + 32] >> 4) & 3) << 4)
        q4 = (ql[:, ql_base + 32:ql_base + 64] >> 4) | (((qh[:, qh_base:qh_base + 32] >> 6) & 3) << 4)

        # The C reference uses `int is = l / 16` directly as a scale offset:
        #   y[l+ 0] = d * sc[is + 0] * q1;   y[l+32] = d * sc[is + 2] * q2;
        #   y[l+64] = d * sc[is + 4] * q3;   y[l+96] = d * sc[is + 6] * q4;
        # with `sc += 8` per 128-element half. So for l < 16 the offsets are
        # 0,2,4,6 and for l >= 16 they are 1,3,5,7 — `is` is added once, not
        # doubled. Each column gets an (nb, 32) scale, not a per-block scalar.
        col = np.arange(32) // 16                     # (32,) → 0 or 1
        s0 = scales[:, sc_base + col + 0]             # (nb, 32)
        s2 = scales[:, sc_base + col + 2]
        s4 = scales[:, sc_base + col + 4]
        s6 = scales[:, sc_base + col + 6]

        dv = d[:, None]                               # (nb, 1)
        out[:, out_base + 0:out_base + 32] = dv * s0 * (q1 - 32)
        out[:, out_base + 32:out_base + 64] = dv * s2 * (q2 - 32)
        out[:, out_base + 64:out_base + 96] = dv * s4 * (q3 - 32)
        out[:, out_base + 96:out_base + 128] = dv * s6 * (q4 - 32)
    return out.reshape(-1)
