"""
Correctness tests for gguf_dequant.py.

Two independent verification strategies are used:

1. LITERAL REFERENCE — a slow, scalar, element-at-a-time transcription of the
   ggml C `dequantize_row_*` functions. Any indexing/vectorisation bug in the
   NumPy implementation makes the two disagree.

2. ROUND-TRIP — quantize a float array with a reference quantizer, dequantize
   it, requantize, and require the packed bytes to match. A structural error
   (wrong nibble order, wrong high-bit mask) scrambles the values and breaks
   the round trip even when the dequantizer is self-consistent.

Run:  python3 test_gguf_dequant.py
"""

import sys
import os
import struct

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gguf_dequant as gq  # noqa: E402


FAILURES = []
CHECKS = 0


def check(name, cond, detail=""):
    global CHECKS
    CHECKS += 1
    ok = bool(cond)
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    if not ok:
        FAILURES.append(name)


def fp16(x):
    return np.float16(x).tobytes()


# ══════════════════════════════════════════════════════════════════════
# Literal scalar reference implementations (direct C transcription)
# ══════════════════════════════════════════════════════════════════════

def ref_q4_0(block_bytes):
    """struct: d(f16); qs[16]"""
    d = struct.unpack("<e", block_bytes[0:2])[0]
    out = []
    for l in range(16):
        out.append((block_bytes[2 + l] & 0x0F) - 8)
    for l in range(16):
        out.append((block_bytes[2 + l] >> 4) - 8)
    # ggml interleaves: y[0..15] from low nibbles, y[16..31] from high.
    return [v * d for v in out]


def ref_q4_1(block_bytes):
    d = struct.unpack("<e", block_bytes[0:2])[0]
    m = struct.unpack("<e", block_bytes[2:4])[0]
    out = []
    for l in range(16):
        out.append((block_bytes[4 + l] & 0x0F))
    for l in range(16):
        out.append((block_bytes[4 + l] >> 4))
    return [v * d + m for v in out]


def ref_q5_0(block_bytes):
    d = struct.unpack("<e", block_bytes[0:2])[0]
    qh = struct.unpack("<I", block_bytes[2:6])[0]
    out = []
    for l in range(16):
        hi = (qh >> l) & 1
        out.append(((block_bytes[6 + l] & 0x0F) | (hi << 4)) - 16)
    for l in range(16):
        hi = (qh >> (l + 16)) & 1
        out.append(((block_bytes[6 + l] >> 4) | (hi << 4)) - 16)
    return [v * d for v in out]


def ref_q8_0(block_bytes):
    d = struct.unpack("<e", block_bytes[0:2])[0]
    out = []
    for l in range(32):
        q = struct.unpack("<b", block_bytes[2 + l:3 + l])[0]
        out.append(q * d)
    return out


def get_scale_min_k4(j, q):
    if j < 4:
        return q[j] & 63, q[j + 4] & 63
    return ((q[j + 4] & 0xF) | ((q[j - 4] >> 6) << 4),
            (q[j + 4] >> 4) | ((q[j] >> 6) << 4))


def ref_q4_k(block_bytes):
    d = struct.unpack("<e", block_bytes[0:2])[0]
    dmin = struct.unpack("<e", block_bytes[2:4])[0]
    scales = block_bytes[4:16]
    qs = block_bytes[16:144]
    y = [0.0] * 256
    is_ = 0
    yi = 0
    for _ in range(0, 256, 64):
        sc, m = get_scale_min_k4(is_ + 0, scales)
        d1, m1 = d * sc, dmin * m
        sc, m = get_scale_min_k4(is_ + 1, scales)
        d2, m2 = d * sc, dmin * m
        for l in range(32):
            y[yi] = d1 * (qs[l] & 0xF) - m1
            yi += 1
        for l in range(32):
            y[yi] = d2 * (qs[l] >> 4) - m2
            yi += 1
        qs = qs[32:]
        is_ += 2
    return y


def ref_q5_k(block_bytes):
    d = struct.unpack("<e", block_bytes[0:2])[0]
    dmin = struct.unpack("<e", block_bytes[2:4])[0]
    scales = block_bytes[4:16]
    qh = block_bytes[16:48]
    qs = block_bytes[48:176]
    y = [0.0] * 256
    is_ = 0
    yi = 0
    u1, u2 = 1, 2
    for _ in range(0, 256, 64):
        sc, m = get_scale_min_k4(is_ + 0, scales)
        d1, m1 = d * sc, dmin * m
        sc, m = get_scale_min_k4(is_ + 1, scales)
        d2, m2 = d * sc, dmin * m
        for l in range(32):
            hi = 16 if (qh[l] & u1) else 0
            y[yi] = d1 * ((qs[l] & 0xF) + hi) - m1
            yi += 1
        for l in range(32):
            hi = 16 if (qh[l] & u2) else 0
            y[yi] = d2 * ((qs[l] >> 4) + hi) - m2
            yi += 1
        qs = qs[32:]
        is_ += 2
        u1 <<= 2
        u2 <<= 2
    return y


def ref_q6_k(block_bytes):
    d = struct.unpack("<e", block_bytes[208:210])[0]
    ql = block_bytes[0:128]
    qh = block_bytes[128:192]
    sc = struct.unpack("<16b", block_bytes[192:208])
    y = [0.0] * 256
    yi = 0
    ql_p, qh_p, sc_p = 0, 0, 0
    for _ in range(0, 256, 128):
        for l in range(32):
            is_ = l // 16
            q1 = ((ql[ql_p + l] & 0xF) | (((qh[qh_p + l] >> 0) & 3) << 4)) - 32
            q2 = ((ql[ql_p + l + 32] & 0xF) | (((qh[qh_p + l] >> 2) & 3) << 4)) - 32
            q3 = ((ql[ql_p + l] >> 4) | (((qh[qh_p + l] >> 4) & 3) << 4)) - 32
            q4 = ((ql[ql_p + l + 32] >> 4) | (((qh[qh_p + l] >> 6) & 3) << 4)) - 32
            y[yi + l + 0] = d * sc[sc_p + is_ + 0] * q1
            y[yi + l + 32] = d * sc[sc_p + is_ + 2] * q2
            y[yi + l + 64] = d * sc[sc_p + is_ + 4] * q3
            y[yi + l + 96] = d * sc[sc_p + is_ + 6] * q4
        yi += 128
        ql_p += 64
        qh_p += 32
        sc_p += 8
    return y


# ══════════════════════════════════════════════════════════════════════
# Reference quantizers (for the round-trip byte test)
# ══════════════════════════════════════════════════════════════════════

def quant_q8_0(vals):
    """Symmetric int8 with one fp16 scale per 32-element block."""
    out = bytearray()
    for i in range(0, len(vals), 32):
        blk = vals[i:i + 32]
        amax = max(abs(v) for v in blk) or 1e-8
        d = amax / 127.0
        d16 = np.float16(d)
        d = float(d16)
        out += np.float16(d16).tobytes()
        for v in blk:
            q = int(round(v / d)) if d else 0
            q = max(-128, min(127, q))
            out += struct.pack("<b", q)
    return bytes(out)


def quant_q4_0(vals):
    """
    Q4_0: symmetric 4-bit, nibble range -8..7, one fp16 scale per 32-block.

    Mirrors ggml's quantize_row_q4_0_ref, which derives the scale from the
    *signed* value of largest magnitude (`d = max / -8`). That sign convention
    is what makes the largest-magnitude element map exactly onto -8, so the
    nibble range is fully used. Using abs(max) instead shifts the whole block
    and loses a level.
    """
    out = bytearray()
    for i in range(0, len(vals), 32):
        blk = vals[i:i + 32]
        amax = 0.0
        mx = 0.0
        for v in blk:
            if abs(v) > amax:
                amax = abs(v)
                mx = v
        d = (mx / -8.0) if amax != 0 else 0.0
        d16 = np.float16(d)
        d = float(d16)
        out += np.float16(d16).tobytes()
        nibbles = []
        for v in blk:
            q = int(round(v / d)) if d else 0
            q = max(-8, min(7, q)) + 8
            nibbles.append(q & 0x0F)
        for l in range(16):
            out.append((nibbles[l] & 0x0F) | ((nibbles[l + 16] & 0x0F) << 4))
    return bytes(out)


# ══════════════════════════════════════════════════════════════════════
# Tests
# ══════════════════════════════════════════════════════════════════════

def test_unquantized():
    print("\n— unquantized formats —")
    f32 = np.array([1.5, -2.25, 0.0, 3.75], dtype=np.float32)
    got = gq.dequantize(f32.tobytes(), 0, 4)
    check("F32 round-trips exactly", np.array_equal(got, f32))

    f16 = np.array([1.5, -2.25, 0.0, 3.75], dtype=np.float16)
    got = gq.dequantize(f16.tobytes(), 1, 4)
    check("F16 decodes", np.allclose(got, f16.astype(np.float32)))

    f64 = np.array([1.5, -2.25], dtype=np.float64)
    got = gq.dequantize(f64.tobytes(), 28, 2)
    check("F64 decodes", np.allclose(got, f64.astype(np.float32)))

    bf = (np.float32(2.5).view(np.uint32) >> 16).astype(np.uint16)
    got = gq.dequantize(bf.tobytes(), 30, 1)
    check("BF16 decodes 2.5", np.allclose(got, [2.5], atol=0.01), f"got {got}")


def make_blocks(nb, block_bytes, scale_fields, rng):
    """
    Build `nb` synthetic blocks that look like a real file: valid fp16/fp32
    scale fields followed by random quant bytes.

    Feeding arbitrary random bytes into the scale field is not a valid test —
    a random uint16 is frequently NaN/Inf in fp16, which makes any comparison
    fail for reasons that have nothing to do with the dequantizer.

    scale_fields: list of (offset, length) pairs to fill with sane values.
    """
    out = bytearray()
    for _ in range(nb):
        blk = bytearray(rng.integers(0, 256, size=block_bytes, dtype=np.uint8))
        for off, length in scale_fields:
            if length == 2:
                val = float(rng.uniform(1e-4, 3e-2))
                blk[off:off + 2] = np.float16(val).tobytes()
            elif length == 4:
                val = float(rng.uniform(1e-4, 3e-2))
                blk[off:off + 4] = struct.pack("<f", val)
        out += blk
    return bytes(out)


def test_against_literal_reference():
    print("\n— NumPy vs literal C reference —")
    rng = np.random.default_rng(1234)
    nb = 7

    # Q4_0
    raw = make_blocks(nb, 18, [(0, 2)], rng)
    mine = gq.dequantize(raw, 2, nb * 32)
    ref = []
    for i in range(nb):
        ref += ref_q4_0(raw[i * 18:(i + 1) * 18])
    check("Q4_0 matches reference", np.allclose(mine, ref, atol=1e-6), f"maxΔ={np.abs(mine - np.array(ref)).max():.2e}")

    # Q4_1
    raw = make_blocks(nb, 20, [(0, 2), (2, 2)], rng)
    mine = gq.dequantize(raw, 3, nb * 32)
    ref = []
    for i in range(nb):
        ref += ref_q4_1(raw[i * 20:(i + 1) * 20])
    check("Q4_1 matches reference", np.allclose(mine, ref, atol=1e-6), f"maxΔ={np.abs(mine - np.array(ref)).max():.2e}")

    # Q5_0
    raw = make_blocks(nb, 22, [(0, 2)], rng)
    mine = gq.dequantize(raw, 6, nb * 32)
    ref = []
    for i in range(nb):
        ref += ref_q5_0(raw[i * 22:(i + 1) * 22])
    check("Q5_0 matches reference", np.allclose(mine, ref, atol=1e-6), f"maxΔ={np.abs(mine - np.array(ref)).max():.2e}")

    # Q8_0
    raw = make_blocks(nb, 34, [(0, 2)], rng)
    mine = gq.dequantize(raw, 8, nb * 32)
    ref = []
    for i in range(nb):
        ref += ref_q8_0(raw[i * 34:(i + 1) * 34])
    check("Q8_0 matches reference", np.allclose(mine, ref, atol=1e-6), f"maxΔ={np.abs(mine - np.array(ref)).max():.2e}")

    # Q4_K
    raw = make_blocks(nb, 144, [(0, 2), (2, 2)], rng)
    mine = gq.dequantize(raw, 12, nb * 256)
    ref = []
    for i in range(nb):
        ref += ref_q4_k(raw[i * 144:(i + 1) * 144])
    d = np.abs(mine - np.array(ref, dtype=np.float32)).max()
    check("Q4_K matches reference", np.allclose(mine, ref, atol=1e-4), f"maxΔ={d:.2e}")

    # Q5_K
    raw = make_blocks(nb, 176, [(0, 2), (2, 2)], rng)
    mine = gq.dequantize(raw, 13, nb * 256)
    ref = []
    for i in range(nb):
        ref += ref_q5_k(raw[i * 176:(i + 1) * 176])
    d = np.abs(mine - np.array(ref, dtype=np.float32)).max()
    check("Q5_K matches reference", np.allclose(mine, ref, atol=1e-4), f"maxΔ={d:.2e}")

    # Q6_K
    raw = make_blocks(nb, 210, [(208, 2)], rng)
    mine = gq.dequantize(raw, 14, nb * 256)
    ref = []
    for i in range(nb):
        ref += ref_q6_k(raw[i * 210:(i + 1) * 210])
    d = np.abs(mine - np.array(ref, dtype=np.float32)).max()
    check("Q6_K matches reference", np.allclose(mine, ref, atol=1e-4), f"maxΔ={d:.2e}")


def test_round_trip():
    """quantize → dequantize → requantize must reproduce the bytes."""
    print("\n— round-trip byte identity —")
    rng = np.random.default_rng(99)

    vals = (rng.standard_normal(32 * 4).astype(np.float32) * 0.05)
    packed = quant_q8_0(vals)
    back = gq.dequantize(packed, 8, len(vals))
    repacked = quant_q8_0(back)
    check("Q8_0 requantizes to identical bytes", packed == repacked)

    vals = (rng.standard_normal(32 * 4).astype(np.float32) * 0.05)
    packed = quant_q4_0(vals)
    back = gq.dequantize(packed, 2, len(vals))
    repacked = quant_q4_0(back)
    check("Q4_0 requantizes to identical bytes", packed == repacked)

    # Reconstruction error must be within the quantisation step.
    err = np.abs(back - vals).max()
    step = np.abs(back).max() / 7.0
    check("Q4_0 reconstruction within one quantisation step", err <= step * 1.01,
          f"err={err:.5f} step={step:.5f}")


def test_unsupported_is_refused():
    print("\n— unsupported types must refuse, not guess —")
    for t, name in [(10, "Q2_K"), (11, "Q3_K"), (16, "IQ2_XXS"), (34, "TQ1_0")]:
        try:
            gq.dequantize(b"\x00" * 512, t, 256)
            check(f"{name} raises UnsupportedQuantType", False, "returned data instead")
        except gq.UnsupportedQuantType:
            check(f"{name} raises UnsupportedQuantType", True)
        except Exception as e:
            check(f"{name} raises UnsupportedQuantType", False, f"raised {type(e).__name__}")


def test_truncated_input():
    print("\n— malformed input —")
    try:
        gq.dequantize(b"\x00" * 8, 12, 256)  # needs 144 bytes
        check("truncated Q4_K raises ValueError", False)
    except ValueError:
        check("truncated Q4_K raises ValueError", True)


def test_real_model_tensor(gguf_path):
    """Dequantize a real tensor from the user's GGUF and sanity-check it."""
    print(f"\n— real model: {os.path.basename(gguf_path)} —")
    if not os.path.exists(gguf_path):
        print(f"SKIP  {gguf_path} not found")
        return

    import model_loader
    loader = model_loader.ModelLoader()
    model, meta = loader.load(gguf_path)
    info = meta.get("tensor_info", {})
    check("GGUF parsed", bool(info), f"{len(info)} tensors")

    # Verify every tensor's declared byte size matches the layout table for
    # the types we support — catches a wrong BLOCK_LAYOUT entry.
    mismatch = []
    unsupported = {}
    for name, ti in info.items():
        t = ti.get("type_id")
        n = 1
        for d in ti.get("shape", []):
            n *= d
        if t in gq.BLOCK_LAYOUT:
            be, bb = gq.BLOCK_LAYOUT[t]
            expected = ((n + be - 1) // be) * bb
            actual = ti.get("byte_count")
            if actual is not None and actual != expected:
                mismatch.append((name, t, expected, actual))
        else:
            unsupported[gq.type_name(t)] = unsupported.get(gq.type_name(t), 0) + 1

    check("declared tensor sizes match the block layout table", not mismatch,
          f"{len(mismatch)} mismatches" + (f" e.g. {mismatch[0]}" if mismatch else ""))
    print(f"      unsupported types present: {unsupported or 'none'}")

    # Dequantize a real supported tensor.
    supported = [(n, ti) for n, ti in info.items() if ti.get("type_id") in gq.BLOCK_LAYOUT]
    if not supported:
        check("at least one tensor is dequantizable", False)
        return
    name, ti = max(supported, key=lambda kv: kv[1].get("byte_count", 0))
    tensor = loader.get_tensor_data(name)
    check(f"read raw bytes for '{name}'", tensor is not None and len(tensor) > 0,
          f"{gq.type_name(ti['type_id'])} {ti.get('shape')}")

    if tensor:
        n = 1
        for d in ti["shape"]:
            n *= d
        vals = gq.dequantize(tensor, ti["type_id"], n)
        check("dequantized length matches element count", len(vals) == n, f"{len(vals)} == {n}")
        check("all values finite", bool(np.isfinite(vals).all()))
        check("not degenerate (has variance)", float(vals.std()) > 1e-6,
              f"std={vals.std():.5f} mean={vals.mean():.5f}")
        # Real LLM weights are roughly zero-mean and bounded; a scrambled
        # dequant would blow past this.
        check("standard deviation is plausible for LLM weights",
              1e-5 < float(vals.std()) < 10.0, f"std={vals.std():.5f}")

        torch_shape = gq.reshape_to_torch(vals, ti["shape"])
        check("reshapes to a torch-order tensor", torch_shape.shape == tuple(reversed(ti["shape"])),
              f"{tuple(ti['shape'])} → {torch_shape.shape}")


if __name__ == "__main__":
    print("GGUF dequantization verification")
    test_unquantized()
    test_against_literal_reference()
    test_round_trip()
    test_unsupported_is_refused()
    test_truncated_input()

    default_model = os.path.expanduser(
        "~/Downloads/remap-studio-models/qwen2.5-coder-0.5b-q4_k_m.gguf"
    )
    model_path = sys.argv[1] if len(sys.argv) > 1 else default_model
    test_real_model_tensor(model_path)

    print()
    if FAILURES:
        print(f"{len(FAILURES)} of {CHECKS} check(s) FAILED:")
        for f in FAILURES:
            print(f"  - {f}")
        sys.exit(1)
    print(f"All {CHECKS} checks passed")
