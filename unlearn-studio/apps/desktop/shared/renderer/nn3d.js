// ══════════════════════════════════════════════════════════════════════
// REMAP STUDIOS — NN3D
// A self-contained WebGL2 neural-network visualizer.
//
// Zero dependencies on purpose: the renderer is served as plain <script>
// tags with no bundler, and the packaged app must work fully offline.
//
// Features
//   · 360° orbit camera (drag), pan (shift-drag / right-drag), zoom (wheel)
//   · Instanced icosphere "neurons" with fresnel rim-light + emissive core
//   · Connection fibres (instanced screen-space ribbons) with flow pulses
//   · Depth-cued starfield over the panel's own surface tone (no painted
//     backdrop: the reference grid is the only thing drawn behind the graph)
//   · HDR-style bloom (bright-pass → separable gaussian → tonemap)
//   · CPU picking (project node centres, nearest-in-screen-space wins)
//   · Three layouts: layered (transformer rings), helix, sphere
//   · Auto-degrading quality to hold frame rate on integrated GPUs
// ══════════════════════════════════════════════════════════════════════

(function (global) {
  "use strict";

  const TAU = Math.PI * 2;

  // ──────────────────────────────────────────────────────────────
  // mat4 (column-major, WebGL convention)
  // ──────────────────────────────────────────────────────────────

  function m4perspective(o, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    o[0] = f / aspect; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = f; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = (far + near) * nf; o[11] = -1;
    o[12] = 0; o[13] = 0; o[14] = 2 * far * near * nf; o[15] = 0;
    return o;
  }

  function m4lookAt(o, eye, center, up) {
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;
    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len; xy /= len; xz /= len;
    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    o[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    o[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    o[15] = 1;
    return o;
  }

  function m4mul(o, a, b) {
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return o;
  }

  // Project a world point to screen space. Returns null when behind camera.
  function projectPoint(vp, x, y, z, w, h) {
    const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
    const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (cw <= 0.0001) return null;
    return { x: (cx / cw * 0.5 + 0.5) * w, y: (1 - (cy / cw * 0.5 + 0.5)) * h, w: cw };
  }

  // ──────────────────────────────────────────────────────────────
  // GL helpers
  // ──────────────────────────────────────────────────────────────

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error("Shader compile failed: " + log);
    }
    return sh;
  }

  function program(gl, vsSrc, fsSrc) {
    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error("Program link failed: " + log);
    }
    // Cache uniform locations — getUniformLocation is a slow string lookup.
    p._u = new Proxy({}, {
      get(cache, name) {
        if (!(name in cache)) cache[name] = gl.getUniformLocation(p, name);
        return cache[name];
      },
    });
    return p;
  }

  function buffer(gl, target, data, usage) {
    const b = gl.createBuffer();
    gl.bindBuffer(target, b);
    gl.bufferData(target, data, usage || gl.STATIC_DRAW);
    return b;
  }

  function makeFBO(gl, w, h, internalFormat, format, type, filter) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }

  // ──────────────────────────────────────────────────────────────
  // Geometry
  // ──────────────────────────────────────────────────────────────

  // Icosphere via icosahedron subdivision — uniform triangles, no pole pinch.
  function icosphere(subdiv) {
    const t = (1 + Math.sqrt(5)) / 2;
    let verts = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ].map((v) => {
      const l = Math.hypot(v[0], v[1], v[2]);
      return [v[0] / l, v[1] / l, v[2] / l];
    });

    let faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];

    for (let s = 0; s < subdiv; s++) {
      const mid = new Map();
      const next = [];
      const midpoint = (a, b) => {
        const key = a < b ? a + "_" + b : b + "_" + a;
        if (mid.has(key)) return mid.get(key);
        const va = verts[a], vb = verts[b];
        let mx = va[0] + vb[0], my = va[1] + vb[1], mz = va[2] + vb[2];
        const l = Math.hypot(mx, my, mz) || 1;
        const idx = verts.push([mx / l, my / l, mz / l]) - 1;
        mid.set(key, idx);
        return idx;
      };
      for (const [a, b, c] of faces) {
        const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
        next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      }
      faces = next;
    }

    const positions = new Float32Array(verts.length * 3);
    const normals = new Float32Array(verts.length * 3);
    verts.forEach((v, i) => {
      positions[i * 3] = v[0]; positions[i * 3 + 1] = v[1]; positions[i * 3 + 2] = v[2];
      normals[i * 3] = v[0]; normals[i * 3 + 1] = v[1]; normals[i * 3 + 2] = v[2];
    });
    const indices = new Uint16Array(faces.length * 3);
    faces.forEach((f, i) => { indices[i * 3] = f[0]; indices[i * 3 + 1] = f[1]; indices[i * 3 + 2] = f[2]; });
    return { positions, normals, indices };
  }

  // ──────────────────────────────────────────────────────────────
  // Shaders (GLSL ES 3.00)
  // ──────────────────────────────────────────────────────────────

  // The viewport's surface tone, in linear light. 0.0016 is exactly what the
  // app's own --bg (#0d0d0d) resolves to through the composite exposure chain
  // (filmic shoulder + 2.2 gamma), so the scene sits on the panel surface
  // instead of on a black sheet of its own. Fading geometry dissolves into the
  // same value, so distant neurons neither pop nor sink.
  const SURFACE_TONE = "vec3(0.0016, 0.0017, 0.0020)";

  const VS_SPHERE = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aOffset;
layout(location=3) in float aRadius;
layout(location=4) in vec3 aColor;
layout(location=5) in vec4 aState;   // x=energy, y=selected, z=hover, w=unlearn-marked
uniform mat4 uViewProj;
uniform mat4 uView;
uniform float uTime;
uniform vec2 uFog;
out vec3 vNormal;
out vec3 vViewPos;
out vec3 vColor;
out vec4 vState;
void main() {
  // Selected and hovered neurons grow slightly so they stand out inside a
  // dense cluster — purely a view affordance, no change to the data.
  float grow = 1.0 + aState.y * 0.30 + aState.z * 0.12;
  vec3 world = aPos * aRadius * grow + aOffset;
  vec4 vp = uView * vec4(world, 1.0);
  vViewPos = vp.xyz;
  vNormal = mat3(uView) * aNormal;
  vColor = aColor;
  vState = aState;
  gl_Position = uViewProj * vec4(world, 1.0);
}`;

  const FS_SPHERE = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vViewPos;
in vec3 vColor;
in vec4 vState;
uniform float uTime;
uniform vec2 uFog;        // x = near, y = far (view-space distance)
out vec4 fragColor;
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(-vViewPos);

  // Two-light studio setup: a soft key from the upper left and a cool fill
  // from the lower right. Gives each neuron a readable spherical form rather
  // than the flat glowing disc an emissive-only shader produces.
  vec3 keyDir  = normalize(vec3(-0.42, 0.78, 0.55));
  vec3 fillDir = normalize(vec3(0.68, -0.28, -0.32));
  float key  = max(dot(N, keyDir), 0.0);
  float fill = max(dot(N, fillDir), 0.0);

  // Tight specular reads as a polished surface.
  vec3 H = normalize(keyDir + V);
  float spec = pow(max(dot(N, H), 0.0), 56.0);

  // Fresnel term doubles as the rim light and the halo falloff.
  float fres = 1.0 - clamp(dot(N, V), 0.0, 1.0);
  float rim = pow(fres, 3.5);

  // Deliberately below the tonemap shoulder: colours stay saturated instead
  // of clipping toward white as they brighten.
  vec3 ambient = vec3(0.055, 0.064, 0.090);
  vec3 col = vColor * (ambient + key * 0.60 + fill * 0.16);
  col += vec3(1.0) * spec * 0.22;
  col += vColor * rim * 0.40;

  // Emissive core: a soft inner luminance so each neuron reads as a luminous
  // particle rather than a matte sphere.
  col += vColor * 0.12;

  // Selection: brighter core plus a subtle halo around the silhouette.
  col += vColor * pow(fres, 2.2) * vState.y * 1.45;
  col = mix(col, vec3(1.0), vState.y * 0.30);
  col = mix(col, vec3(0.90, 0.95, 1.0), vState.z * 0.22);

  // Unlearning marks: the node shifts to orange/red with an ember halo.
  col = mix(col, vec3(1.00, 0.42, 0.14), vState.w * 0.85);
  col += vec3(1.0, 0.30, 0.08) * pow(fres, 2.0) * vState.w * 0.85;

  // Depth cueing: the far side of the network recedes instead of turning into
  // a wall of overlapping dots.
  float dist = length(vViewPos);
  float fog = clamp((dist - uFog.x) / max(uFog.y - uFog.x, 1e-3), 0.0, 1.0);
  col = mix(col, ${SURFACE_TONE}, fog * 0.82);

  fragColor = vec4(col, 1.0);
}`;

  const VS_LINE = `#version 300 es
precision highp float;
layout(location=0) in vec3 aA;
layout(location=1) in vec3 aB;
layout(location=2) in vec2 aSideT;    // x = side (-1|1), y = t along this segment
layout(location=3) in vec3 aColorA;
layout(location=4) in vec3 aColorB;
layout(location=5) in float aSeed;
layout(location=6) in vec2 aGlobalT;  // t along the whole edge at the segment ends
layout(location=7) in vec2 aWMark;    // x = connection strength, y = unlearn mark
uniform mat4 uViewProj;
uniform mat4 uView;
uniform vec2 uResolution;
uniform float uThickness;
out float vT;
out vec3 vColor;
out float vSeed;
out float vDepth;
out float vWeight;
out float vMark;
void main() {
  vec4 clipA = uViewProj * vec4(aA, 1.0);
  vec4 clipB = uViewProj * vec4(aB, 1.0);

  // Screen-space expansion: constant pixel width regardless of distance.
  vec2 ndcA = clipA.xy / max(abs(clipA.w), 1e-4) * sign(clipA.w);
  vec2 ndcB = clipB.xy / max(abs(clipB.w), 1e-4) * sign(clipB.w);
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 d = (ndcB - ndcA) * vec2(aspect, 1.0);
  float len = max(length(d), 1e-5);
  vec2 nrm = vec2(-d.y, d.x) / len;
  nrm.x /= aspect;

  // Strong (high-magnitude) connections draw a touch thicker.
  float thick = uThickness * (1.05 + aWMark.x * 0.55 + aWMark.y * 0.5);

  vec4 clip = mix(clipA, clipB, aSideT.y);
  clip.xy += nrm * aSideT.x * thick * clip.w * 2.0 / max(uResolution.y, 1.0);

  // View-space depth drives the fog below.
  vDepth = (uView * mix(vec4(aA, 1.0), vec4(aB, 1.0), aSideT.y)).z;

  // Global t (0..1 over the whole fibre) keeps the end fades on the fibre
  // endpoints instead of at every segment joint.
  vT = mix(aGlobalT.x, aGlobalT.y, aSideT.y);
  vColor = mix(aColorA, aColorB, aSideT.y);
  vSeed = aSeed;
  vWeight = aWMark.x;
  vMark = aWMark.y;
  gl_Position = clip;
}`;

  const FS_LINE = `#version 300 es
precision highp float;
in float vT;
in vec3 vColor;
in float vSeed;
in float vDepth;
in float vWeight;
in float vMark;
uniform float uTime;
uniform float uOpacity;
uniform vec2 uFog;
out vec4 fragColor;
void main() {
  // Fibres only fade in the last few percent at each end, so the run between
  // two neurons stays fully lit. The old 16% fade ate a third of every short
  // connection and made them read as missing strings.
  float ends = smoothstep(0.0, 0.08, vT) * smoothstep(1.0, 0.92, vT);
  float dir  = mix(0.78, 1.0, vT);

  // Depth fade: the far half of the network recedes instead of stacking into
  // an opaque mesh.
  float dist = abs(vDepth);
  float fog = clamp((dist - uFog.x) / max(uFog.y - uFog.x, 1e-3), 0.0, 1.0);

  // Weight-aware: important pathways read brighter than incidental ones.
  float w = 0.74 + vWeight * 0.85;

  // Unlearning marks light the affected paths orange.
  vec3 col = mix(vColor, vec3(1.0, 0.42, 0.16), vMark * 0.9);

  float a = uOpacity * ends * dir * w * (1.0 - fog * 0.5) * (1.0 + vMark * 1.1);
  // Straight (non-premultiplied) output: the old col * a was multiplied by
  // alpha a second time by the SRC_ALPHA blend, which is exactly why so many
  // strings were barely visible.
  fragColor = vec4(col, a);
}`;

  const VS_POINT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in float aSize;
layout(location=2) in float aSeed;
uniform mat4 uViewProj;
uniform float uTime;
out float vAlpha;
void main() {
  vec3 p = aPos;
  p.y += sin(uTime * 0.12 + aSeed * 6.2831) * 0.6;
  p.x += cos(uTime * 0.09 + aSeed * 4.1) * 0.6;
  gl_Position = uViewProj * vec4(p, 1.0);
  gl_PointSize = aSize;
  vAlpha = 0.25 + 0.75 * abs(sin(uTime * 0.5 + aSeed * 6.2831));
}`;

  const FS_POINT = `#version 300 es
precision highp float;
in float vAlpha;
out vec4 fragColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(d)) * vAlpha;
  fragColor = vec4(vec3(0.50, 0.60, 0.72) * a * 0.35, a * 0.35);
}`;

  // ── Flow particles: information travelling along a fibre (or along an ──
  // input/output stream). Each particle carries its own quadratic bezier so
  // the motion follows the curve, not a straight chord.
  const VS_FLOW = `#version 300 es
precision highp float;
layout(location=0) in vec3 aA;      // path start
layout(location=1) in vec3 aC;      // bezier control
layout(location=2) in vec3 aB;      // path end
layout(location=3) in vec4 aConf;   // x=seed, y=speed, z=size, w=alpha
layout(location=4) in vec3 aColor;
uniform mat4 uViewProj;
uniform float uTime;
out float vAlpha;
out vec3 vColor;
void main() {
  float t = fract(uTime * aConf.y + aConf.x);
  vec3 p = mix(mix(aA, aC, t), mix(aC, aB, t), t);
  gl_Position = uViewProj * vec4(p, 1.0);
  gl_PointSize = aConf.z;
  float ends = smoothstep(0.0, 0.12, t) * smoothstep(1.0, 0.86, t);
  vAlpha = ends * aConf.w;
  vColor = aColor;
}`;

  const FS_FLOW = `#version 300 es
precision highp float;
in float vAlpha;
in vec3 vColor;
out vec4 fragColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(d)) * vAlpha;
  fragColor = vec4(vColor * a, a);
}`;

  const VS_QUAD = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  // Backdrop pass: the app's own surface tone plus the spatial-reference grid —
  // that is all. It used to add a vertical charcoal gradient (down to #070707 at
  // the bottom), which read as a black image laid over the viewport and did not
  // match the panel around it; the grid is the only thing worth painting here.
  const FS_BG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec3 col = ${SURFACE_TONE};

  // Spatial-reference grid, kept faint on purpose (lines land ~#1a1c22 on the
  // #0d0d0d surface).
  vec2 g = abs(fract(vUv * vec2(24.0, 14.0)) - 0.5) / fwidth(vUv * vec2(24.0, 14.0));
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  col += vec3(0.0055, 0.0062, 0.0080) * line;

  fragColor = vec4(col, 1.0);
}`;

  const FS_BRIGHT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform float uThreshold;
out vec4 fragColor;
void main() {
  vec3 c = texture(uTex, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = max(0.0, l - uThreshold) / max(l, 1e-4);
  fragColor = vec4(c * k, 1.0);
}`;

  const FS_BLUR = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
out vec4 fragColor;
void main() {
  float w0 = 0.227027, w1 = 0.194595, w2 = 0.121622, w3 = 0.054054, w4 = 0.016216;
  vec3 sum = texture(uTex, vUv).rgb * w0;
  vec2 o1 = uDir * 1.5, o2 = uDir * 3.0, o3 = uDir * 4.5, o4 = uDir * 6.0;
  sum += texture(uTex, vUv + o1).rgb * w1;
  sum += texture(uTex, vUv - o1).rgb * w1;
  sum += texture(uTex, vUv + o2).rgb * w2;
  sum += texture(uTex, vUv - o2).rgb * w2;
  sum += texture(uTex, vUv + o3).rgb * w3;
  sum += texture(uTex, vUv - o3).rgb * w3;
  sum += texture(uTex, vUv + o4).rgb * w4;
  sum += texture(uTex, vUv - o4).rgb * w4;
  fragColor = vec4(sum, 1.0);
}`;

  const FS_COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uTime;
out vec4 fragColor;
void main() {
  vec3 scene = texture(uScene, vUv).rgb;
  vec3 bloom = texture(uBloom, vUv).rgb;

  // Bloom is a subtle highlight lift, not a haze over the whole image.
  vec3 col = scene + bloom * uBloomStrength;

  // Filmic shoulder keeps the brightest cores from clipping to flat white
  // while leaving room for saturated mid-tones.
  col = col / (col + vec3(1.12));
  col = pow(col, vec3(1.0 / 2.2));

  // Soft vignette for focus.
  float vig = smoothstep(1.25, 0.35, length(vUv - 0.5));
  col *= mix(0.88, 1.0, vig);

  fragColor = vec4(col, 1.0);
}`;

  // ──────────────────────────────────────────────────────────────
  // Model → graph
  // ──────────────────────────────────────────────────────────────

  // Pull the repeating-block index out of a layer name so a 200-layer
  // transformer collapses into its ~24–32 real stages. Handles the common
  // naming schemes: blk.5.*, model.layers.5.*, h.5.*, encoder.layer.5.*
  function extractBlockIndex(name) {
    const patterns = [
      /\bblk\.(\d+)/i,
      /\blayers?\.(\d+)/i,
      /\bh\.(\d+)\b/i,
      /\bblock[s]?\.(\d+)/i,
      /\bencoder\.layer\.(\d+)/i,
      /\bdecoder\.layer\.(\d+)/i,
      /\.(\d+)\./,
    ];
    for (const re of patterns) {
      const m = name.match(re);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  }

  // Depth ramp for the network: the cinematic input → output progression from
  // the reference design — cool white → ice → electric blue → indigo → violet
  // → magenta → coral. Ordered strictly by architecture depth, so the colour
  // itself tells you where a tensor sits in the model.
  function depthColor(t) {
    const stops = [
      [0 / 7, [0.945, 0.957, 0.980]],  // #F1F4FA  input / cool white
      [1 / 7, [0.722, 0.851, 1.000]],  // #B8D9FF  ice blue
      [2 / 7, [0.373, 0.659, 1.000]],  // #5FA8FF  electric blue
      [3 / 7, [0.345, 0.396, 0.949]],  // #5865F2  indigo
      [4 / 7, [0.463, 0.341, 1.000]],  // #7657FF  violet
      [5 / 7, [0.659, 0.333, 0.969]],  // #A855F7  purple
      [6 / 7, [0.816, 0.361, 1.000]],  // #D05CFF  magenta
      [7 / 7, [1.000, 0.561, 0.639]],  // #FF8FA3  coral / soft pink
    ];
    t = Math.max(0, Math.min(1, t));
    for (let i = 0; i < stops.length - 1; i++) {
      const [p0, c0] = stops[i], [p1, c1] = stops[i + 1];
      if (t <= p1) {
        const k = (t - p0) / Math.max(p1 - p0, 1e-6);
        return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
      }
    }
    return stops[stops.length - 1][1];
  }

  const DTYPE_COLORS = {
    float32: [0.36, 0.60, 0.92], float16: [0.36, 0.78, 0.66],
    bfloat16: [0.40, 0.66, 0.90], int8: [0.90, 0.72, 0.36],
    uint8: [0.88, 0.62, 0.34], int32: [0.86, 0.54, 0.42],
  };

  function dtypeColor(dtype) {
    const d = String(dtype || "").toLowerCase();
    if (d.startsWith("quantized") || d.startsWith("q") || d.startsWith("iq") || d.startsWith("tq")) {
      return [0.93, 0.68, 0.32]; // quantized → amber
    }
    for (const key in DTYPE_COLORS) {
      if (d.includes(key)) return DTYPE_COLORS[key];
    }
    return [0.56, 0.63, 0.74];
  }

  /**
   * Build the renderable graph from the renderer's model state.
   * @param {{layers:Array, tensors:Array, summary:Object}} model
   * @param {number} maxEdges  hard cap so huge models still run at 60fps
   */
  function buildGraph(model, maxEdges) {
    maxEdges = maxEdges || 5200;
    const layers = (model && model.layers) || [];
    const tensors = (model && model.tensors) || [];

    // Which layer owns each tensor, and the order layers appear in.
    const layerOfTensor = new Map();
    layers.forEach((layer, li) => {
      (layer.tensors || []).forEach((tn) => layerOfTensor.set(tn, li));
    });

    // Group layers into visual stages by repeating block index, then order the
    // stages the way the architecture actually reads: inputs first, blocks in
    // ascending order, outputs last. Without this the stage order is just the
    // tensor-list order (alphabetical for GGUF), which can put "output.weight"
    // before "token_embd.weight" — the opposite of the dataflow.
    const firstKeyOfLayer = new Array(layers.length).fill(null);
    const keyOrder = [];
    const keySeen = new Set();
    let sawIndex = false;
    layers.forEach((layer, li) => {
      const name = layer.name || "";
      const bi = extractBlockIndex(name);
      if (bi !== null) sawIndex = true;
      const key = bi !== null ? "b" + bi : "s" + li;
      firstKeyOfLayer[li] = key;
      if (!keySeen.has(key)) {
        keySeen.add(key);
        keyOrder.push({ key, bi, name });
      }
    });

    const isInputName = (n) => /token_embd|embed_tokens|wte\.|word_embeddings|embedding/i.test(n);
    const isOutputName = (n) => /^output|lm_head|final_norm/i.test(n);
    const blockRank = (k) => {
      if (isInputName(k.name)) return 0;
      if (k.bi !== null) return 1;
      if (isOutputName(k.name)) return 3;
      return 2;
    };

    let orderedKeys = keyOrder;
    if (sawIndex) {
      const pos = new Map(keyOrder.map((k, i) => [k.key, i]));
      orderedKeys = keyOrder.slice().sort((a, b) => {
        const ra = blockRank(a), rb = blockRank(b);
        if (ra !== rb) return ra - rb;
        if (ra === 1 && a.bi !== b.bi) return (a.bi || 0) - (b.bi || 0);
        return (pos.get(a.key) || 0) - (pos.get(b.key) || 0);
      });
    }

    const stageOfKey = new Map();
    orderedKeys.forEach((k, i) => stageOfKey.set(k.key, i));
    const stageOfLayer = new Array(layers.length).fill(0);
    layers.forEach((_, li) => { stageOfLayer[li] = stageOfKey.get(firstKeyOfLayer[li]); });

    // No recognisable block numbering (e.g. a flat state dict): chunk the
    // layers into ~24 even stages so the shape still reads as a network.
    let stageCount = orderedKeys.length;
    if (!sawIndex || stageCount < 3) {
      stageCount = Math.max(3, Math.min(24, layers.length || 1));
      const per = Math.max(1, Math.ceil(layers.length / stageCount));
      layers.forEach((_, li) => { stageOfLayer[li] = Math.floor(li / per); });
      stageCount = Math.max(1, Math.ceil(layers.length / per));
    }

    // Nodes = tensors (each weight matrix is one synapse bundle).
    const nodes = tensors.map((t, i) => {
      const li = layerOfTensor.has(t.name) ? layerOfTensor.get(t.name) : 0;
      return {
        id: i,
        name: t.name,
        shape: t.shape || [],
        dtype: t.dtype || "unknown",
        params: t.param_count || 0,
        bytes: t.byte_count || 0,
        layerIndex: li,
        stage: stageOfLayer[li] || 0,
        color: [0.5, 0.7, 1.0],
      };
    });

    // Fallback: no tensor list but we do have layers — one node per layer.
    if (nodes.length === 0 && layers.length > 0) {
      layers.forEach((layer, li) => {
        nodes.push({
          id: li,
          name: layer.name,
          shape: [],
          dtype: (layer.dtypes && layer.dtypes[0]) || "unknown",
          params: layer.total_params || 0,
          bytes: layer.total_bytes || 0,
          layerIndex: li,
          stage: stageOfLayer[li] || 0,
          color: [0.5, 0.7, 1.0],
        });
      });
    }

    const maxStage = Math.max(1, stageCount - 1);
    nodes.forEach((n) => {
      n.depthT = n.stage / maxStage;
      n.baseColor = depthColor(n.depthT);
      n.dtypeColor = dtypeColor(n.dtype);
    });

    // ── Edges ──
    // Only layer-to-layer edges are drawn. Real architecture diagrams connect
    // successive layers; chaining tensors within a block is not a real
    // dependency and it turned the view into a hairball.
    //
    // The fan-out is spread across the target stage (round-robin by source
    // index) so the result reads as structured bundles rather than a bundle
    // converging on a few nodes.
    const edges = [];
    const byStage = new Map();
    nodes.forEach((n) => {
      if (!byStage.has(n.stage)) byStage.set(n.stage, []);
      byStage.get(n.stage).push(n);
    });
    const stageIds = Array.from(byStage.keys()).sort((a, b) => a - b);

    const FAN = 2;
    for (let si = 0; si < stageIds.length - 1 && edges.length < maxEdges; si++) {
      const from = byStage.get(stageIds[si]);
      const to = byStage.get(stageIds[si + 1]);
      if (!from.length || !to.length) continue;

      for (let i = 0; i < from.length && edges.length < maxEdges; i++) {
        // Where this source sits along its stage, 0..1.
        const t = from.length > 1 ? i / (from.length - 1) : 0.5;
        const anchor = t * (to.length - 1);
        for (let k = 0; k < FAN && edges.length < maxEdges; k++) {
          const idx = Math.round(anchor) + (k === 0 ? 0 : 1);
          const target = to[Math.min(Math.max(idx, 0), to.length - 1)];
          if (target && target.id !== from[i].id) {
            edges.push({ a: from[i].id, b: target.id, kind: "inter" });
          }
        }
      }
    }

    return {
      nodes, edges,
      stageCount,
      maxStage,
      hasStructure: nodes.length > 0,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // Layouts
  // ──────────────────────────────────────────────────────────────

  function applyLayout(nodes, stageCount, mode, extent, ctx) {
    const byStage = new Map();
    nodes.forEach((n) => {
      if (!byStage.has(n.stage)) byStage.set(n.stage, []);
      byStage.get(n.stage).push(n);
    });
    const stageIds = Array.from(byStage.keys()).sort((a, b) => a - b);
    const S = Math.max(stageIds.length, 1);

    if (mode === "sphere") {
      // Fibonacci sphere — even distribution, no clustering at the poles.
      const N = nodes.length || 1;
      const golden = Math.PI * (3 - Math.sqrt(5));
      nodes.forEach((n, i) => {
        const y = 1 - (i / Math.max(N - 1, 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const th = golden * i;
        const R = extent * 0.62;
        n.pos = [Math.cos(th) * r * R, y * R, Math.sin(th) * r * R];
      });
      return;
    }

    if (mode === "helix") {
      const R = extent * 0.42;
      const turns = 3.2;
      nodes.forEach((n) => {
        const t = n.depthT;
        const a = t * TAU * turns + (n.id % 7) * 0.12;
        const lift = (t - 0.5) * extent * 1.5;
        const ring = 1 + ((n.id % 5) - 2) * 0.07;
        n.pos = [Math.cos(a) * R * ring, lift, Math.sin(a) * R * ring];
      });
      return;
    }

    // Default: one straight stage line — input embedding on the left, blocks
    // in order, output layer on the right, every layer visible at once.
    //
    // The layout used to wrap the stages into a serpentine grid to keep the
    // aspect ratio comfortable, but that turned the dataflow into a zig-zag
    // (input top-left, output bottom-left) that no longer read as a network.
    // The line is what the architecture actually is, so it wins.
    //
    // A straight line of 27 stages is very wide and very short, so fitting it
    // to the window used to shrink the network into a thin necklace of beads
    // lost in the middle of an empty viewport. The line leaves all of the
    // viewport's height unused — the columns spend it instead: every stage
    // becomes a tall, slightly deep sheet of neurons, sized from the
    // world-space height that is visible once frameGraph() has fitted the
    // row's width. The result reads like an architecture diagram — tall
    // luminous layer columns with fibres sweeping between them — rather than a
    // thumbnail.
    const maxN = Math.max(...stageIds.map((id) => byStage.get(id).length), 1);
    // Horizontal half-thickness of one column, and the pitch between columns.
    const discR = extent * (0.13 + 0.062 * Math.sqrt(maxN));
    const spacing = discR * 2.35;      // horizontal gap between stages
    const width = (S - 1) * spacing;

    // frameGraph() fits the row's half-width, so the world-space half-height
    // left visible beside it is (halfX * fitMargin / aspect). Columns are
    // built from that budget: ~60% of it becomes node volume, the rest carries
    // the captions above and below the line.
    const halfX = width / 2 + discR * 0.7;
    const aspect = Math.max((ctx && ctx.aspect) || 1.6, 0.5);
    const visHalf = (halfX * 1.07) / aspect;
    // ~52% of the visible height: the columns dominate the viewport, and the
    // captions that alternate above/below the line still get clear lanes.
    const spreadY = Math.min(visHalf * 0.52, spacing * 9.0);
    // Shallower than the height: the column should read as a tall blade with
    // depth, not a cubic block — and depth costs neuron size, which is set by
    // the distance between siblings on the sheet.
    const spreadZ = Math.min(visHalf * 0.22, spacing * 2.2);

    const hash = (v) => (Math.sin(v) + 1) / 2;
    const GOLDEN_ANGLE = 2.399963229728653;   // 137.5°

    stageIds.forEach((sid, si) => {
      const group = byStage.get(sid);
      const cx = -width / 2 + si * spacing;
      const n = group.length;

      // Busier stages get a taller sheet. A lone embedding tensor or the
      // output head stays compact — exactly like the reference architecture
      // diagrams, where the busiest layer is also the tallest column.
      const sizeT = 0.40 + 0.60 * Math.sqrt(n / maxN);
      const hy = spreadY * sizeT;
      const hz = spreadZ * sizeT;
      const phase = si * 0.9;

      // A stage with a single tensor (input embedding, output head) has
      // nothing to spread: it belongs exactly on the row's centre line.
      if (n <= 1) {
        const only = group[0];
        if (only) only.pos = [cx, 0, 0];
        return;
      }

      // Sunflower (Vogel) coverage of the sheet: even spacing, no seams and no
      // crowding at the rim.
      const pts = [];
      for (let k = 0; k < n; k++) {
        const rad = Math.sqrt((k + 0.55) / n);
        const ang = k * GOLDEN_ANGLE + phase;
        pts.push([Math.cos(ang) * rad, Math.sin(ang) * rad]);
      }
      // Rank the sheet top-to-bottom before assigning, so a stage's nodes are
      // ordered by height: the fibre bundles then flow down the line the way
      // the data flows, instead of crossing each other at random.
      pts.sort((a, b) => b[0] - a[0]);

      // Per-neuron height/depth jitter, so a column is never a flat card...
      const offs = [];
      let my = 0, mz = 0;
      group.forEach((node, k) => {
        const oy = pts[k][0] * hy + (hash(node.id * 78.233) - 0.5) * hy * 0.10;
        const oz = pts[k][1] * hz + (hash(node.id * 4.1) - 0.5) * hz * 0.16;
        offs.push([oy, oz]);
        my += oy; mz += oz;
      });
      // ...but the column as a whole is re-centred on its line. A dozen points
      // are not a perfectly balanced pattern, and a column that drifts off the
      // line would shift in perspective and break the even rhythm of the row.
      my /= n; mz /= n;
      group.forEach((node, k) => {
        node.pos = [
          cx + (hash(node.id * 12.9898) - 0.5) * discR * 0.9,
          offs[k][0] - my,
          offs[k][1] - mz,
        ];
      });
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Main factory
  // ──────────────────────────────────────────────────────────────

  function create(canvas, options) {
    options = options || {};

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,      // bloom + tonemap make MSAA unnecessary
      depth: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("WebGL2 is not available in this build.");

    const hasFloat = !!gl.getExtension("EXT_color_buffer_float");
    const SCENE_FMT = hasFloat ? gl.RGBA16F : gl.RGBA8;
    const SCENE_TYPE = hasFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

    // ── Programs ──
    const progSphere = program(gl, VS_SPHERE, FS_SPHERE);
    const progLine = program(gl, VS_LINE, FS_LINE);
    const progPoint = program(gl, VS_POINT, FS_POINT);
    const progFlow = program(gl, VS_FLOW, FS_FLOW);
    const progBg = program(gl, VS_QUAD, FS_BG);
    const progBright = program(gl, VS_QUAD, FS_BRIGHT);
    const progBlur = program(gl, VS_QUAD, FS_BLUR);
    const progComposite = program(gl, VS_QUAD, FS_COMPOSITE);

    // ── Shared fullscreen triangle ──
    const quadBuf = buffer(gl, gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]));
    const quadVAO = gl.createVertexArray();
    gl.bindVertexArray(quadVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // ── Sphere mesh (shared across instances) ──
    let sphereGeo = icosphere(2);
    const sphereVAO = gl.createVertexArray();
    const spherePosBuf = gl.createBuffer();
    const sphereNrmBuf = gl.createBuffer();
    const sphereIdxBuf = gl.createBuffer();
    const instOffsetBuf = gl.createBuffer();
    const instRadiusBuf = gl.createBuffer();
    const instColorBuf = gl.createBuffer();
    const instStateBuf = gl.createBuffer();
    let sphereIndexCount = 0;
    let nodeCount = 0;

    function uploadSphereGeometry(subdiv) {
      sphereGeo = icosphere(subdiv);
      gl.bindVertexArray(sphereVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, spherePosBuf);
      gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.positions, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, sphereNrmBuf);
      gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.normals, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIdxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereGeo.indices, gl.STATIC_DRAW);
      sphereIndexCount = sphereGeo.indices.length;
      gl.bindVertexArray(null);
    }
    uploadSphereGeometry(2);

    function bindInstancedAttribs() {
      gl.bindVertexArray(sphereVAO);
      const bind = (buf, loc, size) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(loc, 1);
      };
      bind(instOffsetBuf, 2, 3);
      bind(instRadiusBuf, 3, 1);
      bind(instColorBuf, 4, 3);
      bind(instStateBuf, 5, 4);
      gl.bindVertexArray(null);
    }

    // ── Line geometry ──
    const lineVAO = gl.createVertexArray();
    const lineBufs = {
      a: gl.createBuffer(), b: gl.createBuffer(), sideT: gl.createBuffer(),
      ca: gl.createBuffer(), cb: gl.createBuffer(), seed: gl.createBuffer(),
    };
    let lineVertexCount = 0;
    const lineSeedBuf = gl.createBuffer();
    const lineGTBuf = gl.createBuffer();   // t along the whole edge
    const lineWMBuf = gl.createBuffer();   // connection strength + unlearn mark
    let lineMarkData = null;               // kept for cheap mark-only updates

    // ── Flow particles (fibre flow + input/output streams) ──
    const flowVAO = gl.createVertexArray();
    const flowABuf = gl.createBuffer();
    const flowCBuf = gl.createBuffer();
    const flowBBuf = gl.createBuffer();
    const flowConfBuf = gl.createBuffer();
    const flowColorBuf = gl.createBuffer();
    let flowCount = 0;

    // ── Starfield ──
    const starVAO = gl.createVertexArray();
    const starPosBuf = gl.createBuffer();
    const starSizeBuf = gl.createBuffer();
    const starSeedBuf = gl.createBuffer();
    let starCount = 0;

    function uploadStars(count) {
      const pos = new Float32Array(count * 3);
      const size = new Float32Array(count);
      const seed = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        // Shell distribution so stars don't clump at the origin.
        const th = Math.random() * TAU;
        const ph = Math.acos(2 * Math.random() - 1);
        const r = 55 + Math.random() * 95;
        pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
        pos[i * 3 + 1] = Math.cos(ph) * r * 0.75;
        pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
        size[i] = 0.7 + Math.random() * 2.1;
        seed[i] = Math.random();
      }
      gl.bindVertexArray(starVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, starPosBuf);
      gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, starSizeBuf);
      gl.bufferData(gl.ARRAY_BUFFER, size, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, starSeedBuf);
      gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      starCount = count;
    }
    uploadStars(420);

    // ── Camera / interaction state ──
    const cam = {
      // theta = pi/2 puts +Z toward the viewer, so the X axis (the layer
      // progression) runs horizontally on screen.
      theta: Math.PI / 2, phi: 0.20, radius: 34,
      target: [0, 0, 0],
      // Distance frameGraph() chose; the zoom-out clamp is relative to it.
      fitRadius: 34,
      // Damped values actually used for rendering.
      dTheta: Math.PI / 2, dPhi: 0.20, dRadius: 34, dTarget: [0, 0, 0],
      autoRotate: true,
      autoRotateSpeed: 0.055,
    };

    const state = {
      nodes: [],
      edges: [],
      positions: null,
      colorMode: "depth",     // depth | dtype | params
      layout: "layered",
      extent: 22,
      // Bounding radius of the laid-out graph (centres + neuron radii). The
      // camera's near/far range is derived from it on every frame.
      worldRadius: 2,
      hoverId: -1,
      selectedId: -1,
      bloomStrength: 0.30,
      quality: options.quality || "high",
      paused: false,
      dirty: true,
    };

    let nodeColors = null;   // Float32Array(n*3)
    let nodeStates = null;   // Float32Array(n*3)
    let nodeRadii = null;    // Float32Array(n)
    let nodeOffsets = null;  // Float32Array(n*3)

    // ── Render targets ──
    let scene = null, bright = null, blurA = null, blurB = null, readback = null;
    let bloomResult = null;   // texture holding the final blurred bloom
    let fbW = 0, fbH = 0;

    // Aspect the straight-line columns were sized for. The columns are built
    // from the world-space height that stays visible once the camera fits the
    // row's width, so a materially different canvas shape needs a rebuild.
    let layoutAspect = 0;
    // Set by orbit / pan / zoom / focus. A reshape rebuilds the columns either
    // way, but it only re-frames while the camera is still the default one, so
    // a deliberate zoom survives a window or dock resize.
    let camUserAdjusted = false;

    /**
     * The canvas aspect ratio the graph is composed for. A hidden canvas (2D
     * tab active, panel collapsed) reports a 0×0 box, so the host element —
     * which already has its final size — is used as the fallback.
     */
    function canvasAspect() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w > 8 && h > 8) return w / h;
      const host = canvas.parentElement;
      if (host && host.getBoundingClientRect) {
        const r = host.getBoundingClientRect();
        if (r.width > 8 && r.height > 8) return r.width / r.height;
      }
      return 1.6;
    }

    /**
     * Rebuild everything derived from node positions. Used by setModel,
     * setLayout and — when the viewport shape changes materially — resize().
     */
    function relayout(refit) {
      if (!state.nodes.length || !nodeOffsets) return;
      const aspect = canvasAspect();
      layoutAspect = aspect;
      applyLayout(state.nodes, state.stageCount, state.layout, state.extent, { aspect });
      state.nodes.forEach((nd, i) => {
        nodeOffsets[i * 3] = nd.pos[0];
        nodeOffsets[i * 3 + 1] = nd.pos[1];
        nodeOffsets[i * 3 + 2] = nd.pos[2];
      });
      computeNodeRadii();
      measureWorldRadius();
      uploadNodeBuffers();
      refreshStageMeta();
      rebuildEdgeGeometry();
      buildFlowParticles();
      if (refit) frameGraph();
      state.dirty = true;
    }

    function resize() {
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h && fbW === w && fbH === h) return false;
      canvas.width = w;
      canvas.height = h;
      fbW = w; fbH = h;

      for (const rt of [scene, bright, blurA, blurB]) {
        if (rt) { gl.deleteFramebuffer(rt.fb); gl.deleteTexture(rt.tex); }
      }
      bloomResult = null;
      if (readback) { gl.deleteFramebuffer(readback.fb); gl.deleteTexture(readback.tex); readback = null; }
      const hw = Math.max(1, Math.floor(w / 2)), hh = Math.max(1, Math.floor(h / 2));
      scene = makeFBO(gl, w, h, SCENE_FMT, gl.RGBA, SCENE_TYPE, gl.LINEAR);
      bright = makeFBO(gl, hw, hh, SCENE_FMT, gl.RGBA, SCENE_TYPE, gl.LINEAR);
      blurA = makeFBO(gl, hw, hh, SCENE_FMT, gl.RGBA, SCENE_TYPE, gl.LINEAR);
      blurB = makeFBO(gl, hw, hh, SCENE_FMT, gl.RGBA, SCENE_TYPE, gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      state.dirty = true;
      // Only the straight line sizes itself from the canvas shape, and only a
      // real change of shape (window resized, dock dragged, panels toggled) is
      // worth rebuilding the fibres for — not every pixel of a slow drag.
      if (state.layout === "layered" && layoutAspect > 0) {
        const a = canvasAspect();
        if (Math.abs(Math.log(a / layoutAspect)) > 0.10) relayout(!camUserAdjusted);
      }
      return true;
    }

    // ── Graph upload ──
    function setModel(model) {
      const g = buildGraph(model, state.quality === "low" ? 2400 : 5200);
      state.nodes = g.nodes;
      state.edges = g.edges;
      state.stageCount = g.stageCount;

      const n = state.nodes.length;
      nodeCount = n;

      // Extent scales with the graph so the camera framing stays sensible.
      state.extent = Math.max(12, Math.min(34, 14 + Math.sqrt(Math.max(n, 1)) * 0.75));
      const aspect = canvasAspect();
      layoutAspect = aspect;
      applyLayout(state.nodes, g.stageCount, state.layout, state.extent, { aspect });

      nodeOffsets = new Float32Array(n * 3);
      nodeRadii = new Float32Array(n);
      nodeColors = new Float32Array(n * 3);
      nodeStates = new Float32Array(n * 4);

      computeNodeRadii();
      measureWorldRadius();
      refreshStageMeta();
      rebuildEdgeGeometry();
      buildFlowParticles();

      applyColors();
      uploadNodeBuffers();
      frameGraph();
      state.dirty = true;
    }

    // ──────────────────────────────────────────────────────────
    // Stage metadata — the floating architectural labels
    // ──────────────────────────────────────────────────────────

    // A short human title for a stage, derived from the real tensor names it
    // contains. Nothing is invented: unrecognised names fall back to the name
    // itself.
    function stageTitle(name) {
      const n = String(name || "");
      if (/token_embd|embed_tokens|wte\.|word_embeddings|embedding/i.test(n)) return "INPUT EMBEDDING";
      // The final norm is its own stage in most checkpoints — naming it
      // separately keeps the last two stages readable (output.weight and
      // output_norm.weight would otherwise both read "OUTPUT LAYER").
      if (/output_norm|final_norm|norm_f|ln_f|final_layernorm/i.test(n)) return "FINAL NORM";
      if (/^output|lm_head/i.test(n)) return "OUTPUT LAYER";
      const m = n.match(/\bblk\.(\d+)/i) || n.match(/\blayers?\.(\d+)/i) ||
        n.match(/\bh\.(\d+)\b/i) || n.match(/\bblock[s]?\.(\d+)/i);
      if (m) return "BLOCK " + String(parseInt(m[1], 10) + 1).padStart(2, "0");
      const seg = n.split(".").filter(Boolean)[0] || "LAYER";
      return seg.replace(/[_-]+/g, " ").toUpperCase().slice(0, 18);
    }

    function refreshStageMeta() {
      const byStage = new Map();
      state.nodes.forEach((nd, i) => {
        if (!byStage.has(nd.stage)) byStage.set(nd.stage, []);
        byStage.get(nd.stage).push(i);
      });
      const ids = Array.from(byStage.keys()).sort((a, b) => a - b);
      state.stageMeta = ids.map((sid, order) => {
        const idxs = byStage.get(sid);
        let cx = 0, cy = 0, cz = 0;
        idxs.forEach((i) => {
          const p = state.nodes[i].pos;
          cx += p[0]; cy += p[1]; cz += p[2];
        });
        cx /= idxs.length; cy /= idxs.length; cz /= idxs.length;
        let radius = 0, extentY = 0, nodeR = 0;
        idxs.forEach((i) => {
          const p = state.nodes[i].pos;
          radius = Math.max(radius, Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz));
          nodeR = Math.max(nodeR, state.nodes[i].radius || 0);
          // Vertical half-extent: how tall the stage reads on screen. The
          // captions clear this so a tall straight-line column never gets its
          // callout sitting on top of the stage's own neurons.
          extentY = Math.max(extentY, Math.abs(p[1] - cy));
        });
        return {
          stage: sid,
          order: order + 1,
          label: stageTitle(state.nodes[idxs[0]].name),
          count: idxs.length,
          color: state.nodes[idxs[0]].baseColor,
          center: [cx, cy, cz],
          radius: radius || state.extent * 0.12,
          extentY: extentY || (radius || state.extent * 0.12) * 0.6,
          nodeR,
          members: idxs,
        };
      });
    }

    // ──────────────────────────────────────────────────────────
    // Connections — sagging quadratic-bezier fibres
    // ──────────────────────────────────────────────────────────

    // Each fibre is sampled into this many screen-space chords. Rebuilt
    // whenever node positions change (model load, layout switch). The straight
    // line sweeps fibres across tall columns, so the old 8 chords read as
    // visibly faceted arcs — 12 keeps the bundles smooth.
    const EDGE_SEG = 12;

    function rebuildEdgeGeometry() {
      const m = state.edges.length;
      const vpe = EDGE_SEG * 6;
      const total = m * vpe;
      const A = new Float32Array(total * 3);
      const B = new Float32Array(total * 3);
      const sideT = new Float32Array(total * 2);
      const CA = new Float32Array(total * 3);
      const CB = new Float32Array(total * 3);
      const seed = new Float32Array(total);
      const gt = new Float32Array(total * 2);
      const wm = new Float32Array(total * 2);

      // Corner order for a quad: (0,-1) (0,+1) (1,-1) (1,-1) (0,+1) (1,+1)
      const CORNERS = [[0, -1], [0, 1], [1, -1], [1, -1], [0, 1], [1, 1]];

      // Connection strength is normalised across the whole graph once.
      state.maxParams = Math.max(1, ...state.nodes.map((nd) => nd.params || 0));
      const maxParams = state.maxParams;
      const pts = new Float32Array((EDGE_SEG + 1) * 3);

      state.edges.forEach((e, ei) => {
        const na = state.nodes[e.a], nb = state.nodes[e.b];
        if (!na || !nb) return;
        const p0 = na.pos, p1 = nb.pos;
        const s = (ei % 997) / 997;
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) || 1;

        // Sag below the chord plus a lateral weave, so parallel bundles
        // separate instead of stacking into one line.
        const sag = len * (0.055 + 0.05 * s);
        const weave = (s - 0.5) * len * 0.16;
        const cp = [
          (p0[0] + p1[0]) / 2,
          (p0[1] + p1[1]) / 2 - sag,
          (p0[2] + p1[2]) / 2 + weave,
        ];

        for (let k = 0; k <= EDGE_SEG; k++) {
          const t = k / EDGE_SEG, it = 1 - t;
          pts[k * 3] = it * it * p0[0] + 2 * it * t * cp[0] + t * t * p1[0];
          pts[k * 3 + 1] = it * it * p0[1] + 2 * it * t * cp[1] + t * t * p1[1];
          pts[k * 3 + 2] = it * it * p0[2] + 2 * it * t * cp[2] + t * t * p1[2];
        }

        const strength = Math.max(0, Math.min(1,
          ((na.params || 0) + (nb.params || 0)) / (2 * maxParams)));
        const mark = (na.unlearn || nb.unlearn) ? 1 : 0;
        const ca = na.baseColor, cb = nb.baseColor;

        for (let seg = 0; seg < EDGE_SEG; seg++) {
          const t0 = seg / EDGE_SEG, t1 = (seg + 1) / EDGE_SEG;
          for (let c = 0; c < 6; c++) {
            const v = ei * vpe + seg * 6 + c;
            const [t, side] = CORNERS[c];
            const lo = seg * 3, hi = (seg + 1) * 3;
            A[v * 3] = pts[lo]; A[v * 3 + 1] = pts[lo + 1]; A[v * 3 + 2] = pts[lo + 2];
            B[v * 3] = pts[hi]; B[v * 3 + 1] = pts[hi + 1]; B[v * 3 + 2] = pts[hi + 2];
            sideT[v * 2] = side; sideT[v * 2 + 1] = t;
            gt[v * 2] = t0; gt[v * 2 + 1] = t1;
            wm[v * 2] = strength; wm[v * 2 + 1] = mark;
            seed[v] = s;
            CA[v * 3] = ca[0]; CA[v * 3 + 1] = ca[1]; CA[v * 3 + 2] = ca[2];
            CB[v * 3] = cb[0]; CB[v * 3 + 1] = cb[1]; CB[v * 3 + 2] = cb[2];
          }
        }
      });

      gl.bindVertexArray(lineVAO);
      const put = (buf, arr, loc, size) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      };
      put(lineBufs.a, A, 0, 3);
      put(lineBufs.b, B, 1, 3);
      put(lineBufs.sideT, sideT, 2, 2);
      put(lineBufs.ca, CA, 3, 3);
      put(lineBufs.cb, CB, 4, 3);
      put(lineSeedBuf, seed, 5, 1);
      put(lineGTBuf, gt, 6, 2);
      put(lineWMBuf, wm, 7, 2);
      gl.bindVertexArray(null);
      lineVertexCount = total;
      lineMarkData = wm;
    }

    // ──────────────────────────────────────────────────────────
    // Flow particles — fibre motion + input/output streams
    // ──────────────────────────────────────────────────────────

    function buildFlowParticles() {
      const fibres = state.edges.length;
      const perFibre = 2;
      const metas = state.stageMeta || [];
      const first = metas.length ? metas[0] : null;
      const last = metas.length ? metas[metas.length - 1] : null;
      const streamCount = (first ? first.members.length * 5 : 0) + (last ? last.members.length * 4 : 0);
      const total = fibres * perFibre + streamCount;
      if (!total) { flowCount = 0; return; }

      const A = new Float32Array(total * 3);
      const C = new Float32Array(total * 3);
      const B = new Float32Array(total * 3);
      const conf = new Float32Array(total * 4);
      const col = new Float32Array(total * 3);
      const maxParams = state.maxParams || 1;

      let vi = 0;
      const putParticle = (a, c, b, seed, speed, size, alpha, color) => {
        if (vi >= total) return;
        A[vi * 3] = a[0]; A[vi * 3 + 1] = a[1]; A[vi * 3 + 2] = a[2];
        C[vi * 3] = c[0]; C[vi * 3 + 1] = c[1]; C[vi * 3 + 2] = c[2];
        B[vi * 3] = b[0]; B[vi * 3 + 1] = b[1]; B[vi * 3 + 2] = b[2];
        conf[vi * 4] = seed; conf[vi * 4 + 1] = speed;
        conf[vi * 4 + 2] = size; conf[vi * 4 + 3] = alpha;
        col[vi * 3] = color[0]; col[vi * 3 + 1] = color[1]; col[vi * 3 + 2] = color[2];
        vi++;
      };

      state.edges.forEach((e, ei) => {
        const na = state.nodes[e.a], nb = state.nodes[e.b];
        if (!na || !nb) return;
        const p0 = na.pos, p1 = nb.pos;
        const s = ((ei * 7919) % 1000) / 1000;
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) || 1;
        const sag = len * (0.055 + 0.05 * ((ei % 997) / 997));
        const ctrl = [
          (p0[0] + p1[0]) / 2,
          (p0[1] + p1[1]) / 2 - sag,
          (p0[2] + p1[2]) / 2 + (((ei % 997) / 997) - 0.5) * len * 0.16,
        ];
        const strength = Math.max(0, Math.min(1,
          ((na.params || 0) + (nb.params || 0)) / (2 * maxParams)));
        const c = [
          Math.min(1, (na.baseColor[0] + nb.baseColor[0]) * 0.45 + 0.12),
          Math.min(1, (na.baseColor[1] + nb.baseColor[1]) * 0.45 + 0.12),
          Math.min(1, (na.baseColor[2] + nb.baseColor[2]) * 0.45 + 0.12),
        ];
        for (let k = 0; k < perFibre; k++) {
          putParticle(p0, ctrl, p1, (s + k * 0.5) % 1,
            0.05 + strength * 0.07 + k * 0.02,
            1.7 + strength * 1.6,
            0.30 + strength * 0.35, c);
        }
      });

      if (first && last) {
        // Incoming information: a scattered field on the left that converges
        // on the first stage; and the same idea leaving the last one.
        let minX = Infinity, maxX = -Infinity;
        state.nodes.forEach((nd) => {
          minX = Math.min(minX, nd.pos[0]);
          maxX = Math.max(maxX, nd.pos[0]);
        });
        const inMargin = state.extent * 0.65;
        const outMargin = state.extent * 0.55;
        const inColor = [0.82, 0.88, 1.0];

        first.members.forEach((mi) => {
          const nd = state.nodes[mi];
          for (let k = 0; k < 5; k++) {
            const seed = ((mi * 31 + k * 17) % 1000) / 1000;
            const sy = (seed - 0.5) * state.extent * 0.55;
            const sz = (((seed * 7) % 1) - 0.5) * state.extent * 0.4;
            const a = [minX - inMargin * (0.5 + 0.5 * seed), nd.pos[1] + sy, nd.pos[2] + sz];
            const c = [
              a[0] + (nd.pos[0] - a[0]) * 0.45,
              a[1] * 0.6 + nd.pos[1] * 0.4,
              a[2] * 0.6 + nd.pos[2] * 0.4,
            ];
            putParticle(a, c, nd.pos, seed, 0.045 + 0.05 * seed,
              1.3 + seed * 1.3, 0.26 + 0.26 * seed, inColor);
          }
        });

        last.members.forEach((mi) => {
          const nd = state.nodes[mi];
          const oc = nd.baseColor;
          const outc = [Math.min(1, oc[0] * 0.65 + 0.34), Math.min(1, oc[1] * 0.72 + 0.18), Math.min(1, oc[2] * 0.65 + 0.22)];
          for (let k = 0; k < 4; k++) {
            const seed = ((mi * 53 + k * 29) % 1000) / 1000;
            const sy = (seed - 0.5) * state.extent * 0.45;
            const sz = (((seed * 11) % 1) - 0.5) * state.extent * 0.35;
            const b = [maxX + outMargin * (0.45 + 0.55 * seed), nd.pos[1] + sy, nd.pos[2] + sz];
            const c = [
              (nd.pos[0] + b[0]) / 2,
              nd.pos[1] * 0.6 + b[1] * 0.4,
              nd.pos[2] * 0.6 + b[2] * 0.4,
            ];
            putParticle(nd.pos, c, b, seed, 0.05 + 0.05 * seed,
              1.3 + seed * 1.3, 0.26 + 0.26 * seed, outc);
          }
        });
      }

      gl.bindVertexArray(flowVAO);
      const put = (buf, arr, loc, size) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      };
      put(flowABuf, A, 0, 3);
      put(flowCBuf, C, 1, 3);
      put(flowBBuf, B, 2, 3);
      put(flowConfBuf, conf, 3, 4);
      put(flowColorBuf, col, 4, 3);
      gl.bindVertexArray(null);
      flowCount = vi;
      state.flowCount = vi;
      state.dirty = true;
    }

    /**
     * Size every neuron from the distance to its nearest neighbour *within the
     * same stage*.
     *
     * A fixed world-space radius cannot work across layouts: the discs scale
     * with the model, so an absolute radius either leaves nodes as sparse dots
     * or makes them overlap into a blob. Deriving the radius from local spacing
     * keeps a stage reading as a tight cluster at any model size, while the
     * parameter count still modulates the size within a narrow band so big
     * tensors stand out without dominating.
     */
    function computeNodeRadii() {
      const nodes = state.nodes;
      const n = nodes.length;
      if (!n) return;

      const params = nodes.map((x) => x.params || 0);
      const maxP = Math.max(1, ...params);
      const positive = params.filter((p) => p > 0);
      const minP = positive.length ? Math.min(...positive) : 0;
      const sqrtMax = Math.sqrt(maxP);
      const sqrtMin = Math.sqrt(minP);

      // Group by stage so "neighbour" means a sibling in the same layer —
      // that is the spacing the eye actually compares.
      const byStage = new Map();
      nodes.forEach((nd, i) => {
        if (!byStage.has(nd.stage)) byStage.set(nd.stage, []);
        byStage.get(nd.stage).push(i);
      });

      const localSpacing = new Float32Array(n).fill(0);
      for (const members of byStage.values()) {
        for (const i of members) {
          const a = nodes[i].pos;
          let nearest = Infinity;
          for (const j of members) {
            if (i === j) continue;
            const b = nodes[j].pos;
            const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
            if (d < nearest) nearest = d;
          }
          localSpacing[i] = isFinite(nearest) ? nearest : 0;
        }
      }

      // Fallback spacing for singleton stages: the median of the rest, or a
      // fraction of the overall extent when there is nothing to compare with.
      const known = Array.from(localSpacing).filter((v) => v > 0).sort((x, y) => x - y);
      const median = known.length ? known[Math.floor(known.length / 2)] : state.extent * 0.25;

      for (let i = 0; i < n; i++) {
        const spacing = localSpacing[i] > 0 ? localSpacing[i] : median;
        // 0.30 leaves a visible gap between siblings at every zoom level.
        // The straight-line layout spreads a stage across a tall sheet, so its
        // neurons are drawn slightly larger — the columns need visible volume,
        // not beads on a wire — while staying clear of the next column: at 0.28
        // the largest neuron still fits inside the ~2.35-radius column pitch.
        const base = spacing * (state.layout === "layered" ? 0.28 : 0.30);

        const norm = sqrtMax > sqrtMin
          ? (Math.sqrt(nodes[i].params || 0) - sqrtMin) / (sqrtMax - sqrtMin)
          : 0.5;
        const clamped = Math.max(0, Math.min(1, norm));

        nodes[i].radius = base * (0.72 + clamped * 0.66);
        nodeRadii[i] = nodes[i].radius;

        // Larger tensors carry slightly more visual weight in the shader.
        nodes[i].energy = clamped;
      }
    }

    function uploadNodeBuffers() {
      gl.bindVertexArray(sphereVAO);
      const put = (buf, arr, loc, size) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(loc, 1);
      };
      put(instOffsetBuf, nodeOffsets, 2, 3);
      put(instRadiusBuf, nodeRadii, 3, 1);
      put(instColorBuf, nodeColors, 4, 3);
      put(instStateBuf, nodeStates, 5, 4);
      gl.bindVertexArray(null);
    }

    function updateStates() {
      if (!nodeStates) return;
      state.nodes.forEach((nd, i) => {
        const sel = nd.id === state.selectedId ? 1 : 0;
        const hov = nd.id === state.hoverId ? 1 : 0;
        nodeStates[i * 4] = nd.energy;
        nodeStates[i * 4 + 1] = sel;
        nodeStates[i * 4 + 2] = hov;
        nodeStates[i * 4 + 3] = nd.unlearn ? 1 : 0;
      });
      gl.bindVertexArray(sphereVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, instStateBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, nodeStates);
      gl.bindVertexArray(null);
    }

    function applyColors() {
      if (!nodeColors) return;
      state.nodes.forEach((nd, i) => {
        let c;
        if (state.colorMode === "dtype") c = nd.dtypeColor;
        else if (state.colorMode === "params") {
          c = depthColor(Math.max(0, Math.min(1, nd.energy)));
        } else c = nd.baseColor;
        nd.renderColor = c;
        nodeColors[i * 3] = c[0]; nodeColors[i * 3 + 1] = c[1]; nodeColors[i * 3 + 2] = c[2];
      });
      gl.bindVertexArray(sphereVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, instColorBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, nodeColors);
      gl.bindVertexArray(null);
      state.dirty = true;
    }

    // Bounding radius of the current layout. Refreshed whenever the node
    // positions or radii change; drawScene() turns it into the near/far range.
    function measureWorldRadius() {
      let r = 0;
      state.nodes.forEach((nd, i) => {
        const d = Math.hypot(nd.pos[0], nd.pos[1], nd.pos[2]) + (nodeRadii ? nodeRadii[i] : 0);
        if (d > r) r = d;
      });
      state.worldRadius = Math.max(1, r);
    }

    // Fit the camera to the graph bounds.
    function frameGraph() {
      if (!state.nodes.length) return;
      let maxX = 1, maxY = 1, maxZ = 1;
      for (const nd of state.nodes) {
        maxX = Math.max(maxX, Math.abs(nd.pos[0]));
        maxY = Math.max(maxY, Math.abs(nd.pos[1]));
        maxZ = Math.max(maxZ, Math.abs(nd.pos[2]));
      }
      // Fit the volumetric graph into the ~52 degree vertical FOV, leaving a
      // margin so the network fills the viewport without ever touching the UI.
      // The margins are deliberately tight: a straight stage line is very wide
      // and very short, so the horizontal fit decides how large every cluster
      // gets on screen.
      const fov = (52 * Math.PI) / 180;
      const aspect = canvasAspect();
      // The straight line is width-bound: its columns were built from the
      // height that is left over once the row's width is fitted, so the
      // vertical term must not fight them and the horizontal term is what
      // decides how large every neuron gets on screen.
      const line = state.layout === "layered";
      const xMargin = line ? 1.07 : 1.15;
      const yMargin = line ? 0.98 : 1.15;
      const distV = (maxY * yMargin) / Math.tan(fov / 2);
      const distH = (maxX * xMargin) / (Math.tan(fov / 2) * aspect);
      const distZ = (maxZ * 1.35) / Math.tan(fov / 2);
      cam.radius = cam.dRadius = Math.max(14, Math.max(distV, distH, distZ));
      // Zoom-out bound follows the framing distance (models differ hugely in
      // scale); the wheel must never snap the camera somewhere else.
      cam.fitRadius = cam.radius;
      camUserAdjusted = false;
      cam.target = [0, 0, 0];
      cam.dTarget = [0, 0, 0];
      state.dirty = true;
    }

    // ── Picking (CPU projection — cheap and exact enough at these counts) ──
    let lastVP = null;
    // Depth range the last frame was drawn with — exposed so tests can check
    // that no node falls outside the camera's near/far planes.
    let lastNear = 0.1, lastFar = 600;

    function pickAt(px, py) {
      if (!lastVP || !state.nodes.length) return null;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      let best = null, bestD = 22 * 22; // px radius
      state.nodes.forEach((nd, i) => {
        const s = projectPoint(lastVP, nd.pos[0], nd.pos[1], nd.pos[2], w, h);
        if (!s) return;
        const dx = s.x - px, dy = s.y - py;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = { node: nd, index: i }; }
      });
      return best;
    }

    // ── Draw ──
    let time = 0;
    let rafId = 0;
    let lastTs = 0;
    let frameAcc = 0, frameN = 0;
    let degraded = false;

    const vp = new Float32Array(16);
    const view = new Float32Array(16);
    const proj = new Float32Array(16);

    function drawScene() {
      const aspect = canvas.width / Math.max(canvas.height, 1);
      // The depth range tracks the camera and the graph's own radius. The old
      // fixed far plane (600) already cut past the far half of the network at
      // the framed distance, and two wheel notches further out the entire graph
      // fell outside the frustum — which read as the network sliding behind the
      // backdrop the moment you zoomed out.
      const sceneR = Math.max(1, state.worldRadius);
      const nearPlane = Math.max(0.1, cam.dRadius - sceneR * 1.9);
      const farPlane = cam.dRadius + sceneR * 2.8 + 20;
      lastNear = nearPlane; lastFar = farPlane;
      m4perspective(proj, (52 * Math.PI) / 180, aspect, nearPlane, farPlane);

      const cp = Math.cos(cam.dPhi), sp = Math.sin(cam.dPhi);
      const eye = [
        cam.dTarget[0] + cam.dRadius * cp * Math.cos(cam.dTheta),
        cam.dTarget[1] + cam.dRadius * sp,
        cam.dTarget[2] + cam.dRadius * cp * Math.sin(cam.dTheta),
      ];
      m4lookAt(view, eye, cam.dTarget, [0, 1, 0]);
      m4mul(vp, proj, view);
      lastVP = vp;

      const res = [canvas.width, canvas.height];

      // ── Pass 1: backdrop ──
      gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fb);
      gl.viewport(0, 0, scene.w, scene.h);
      // Fresh depth every frame. The depth buffer is shared between frames and
      // the connections are depth-tested *before* the neurons are drawn, so
      // last frame's spheres used to clip this frame's fibres — the bug behind
      // strings that disappeared as soon as the camera moved.
      gl.depthMask(true);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.useProgram(progBg);
      gl.bindVertexArray(quadVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // ── Pass 2: starfield (additive, no depth write) ──
      if (starCount > 0) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.useProgram(progPoint);
        gl.uniformMatrix4fv(progPoint._u.uViewProj, false, vp);
        gl.uniform1f(progPoint._u.uTime, time);
        gl.bindVertexArray(starVAO);
        gl.drawArrays(gl.POINTS, 0, starCount);
      }

      // ── Pass 3: connections (depth-tested, no depth write) ──
      if (lineVertexCount > 0) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        // Normal alpha blending. Additive blending made every crossing edge
        // stack into a bright haze, which is what read as "neon".
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(progLine);
        gl.uniformMatrix4fv(progLine._u.uViewProj, false, vp);
        gl.uniformMatrix4fv(progLine._u.uView, false, view);
        gl.uniform2fv(progLine._u.uResolution, res);
        gl.uniform2f(progLine._u.uFog, cam.dRadius * 1.15, cam.dRadius * 2.9);
        gl.uniform1f(progLine._u.uThickness, state.quality === "low" ? 1.0 : 1.5);
        gl.uniform1f(progLine._u.uTime, time);
        gl.uniform1f(progLine._u.uOpacity, 0.40);
        gl.bindVertexArray(lineVAO);
        gl.drawArrays(gl.TRIANGLES, 0, lineVertexCount);
      }

      // ── Pass 4: neurons (opaque-ish, depth write on) ──
      if (nodeCount > 0) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(progSphere);
        gl.uniformMatrix4fv(progSphere._u.uViewProj, false, vp);
        gl.uniformMatrix4fv(progSphere._u.uView, false, view);
        gl.uniform1f(progSphere._u.uTime, time);
        // Fog tracks the camera so framing stays consistent at any zoom.
        gl.uniform2f(progSphere._u.uFog, cam.dRadius * 1.10, cam.dRadius * 3.0);
        gl.bindVertexArray(sphereVAO);
        gl.drawElementsInstanced(gl.TRIANGLES, sphereIndexCount, gl.UNSIGNED_SHORT, 0, nodeCount);
      }

      // ── Pass 5: flow particles — information moving through the network ──
      if (flowCount > 0) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.depthMask(false);
        gl.useProgram(progFlow);
        gl.uniformMatrix4fv(progFlow._u.uViewProj, false, vp);
        gl.uniform1f(progFlow._u.uTime, time);
        gl.bindVertexArray(flowVAO);
        gl.drawArrays(gl.POINTS, 0, flowCount);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }

      // ── Pass 7: bloom bright-pass ──
      if (state.bloomStrength > 0.01) {
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bright.fb);
        gl.viewport(0, 0, bright.w, bright.h);
        gl.useProgram(progBright);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, scene.tex);
        gl.uniform1i(progBright._u.uTex, 0);
        gl.uniform1f(progBright._u.uThreshold, 0.80);
        gl.bindVertexArray(quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // ── Pass 7b: separable gaussian, two iterations for a wide falloff ──
        // Strict ping-pong between blurA and blurB. The final result lands in
        // `bloomResult` and is what the composite pass must sample.
        gl.useProgram(progBlur);
        gl.uniform1i(progBlur._u.uTex, 0);
        let srcTex = bright.tex;
        let dstRT = blurA;
        for (let i = 0; i < 2; i++) {
          const spread = i === 0 ? 1.0 : 2.2;

          // Horizontal
          gl.bindFramebuffer(gl.FRAMEBUFFER, dstRT.fb);
          gl.viewport(0, 0, dstRT.w, dstRT.h);
          gl.bindTexture(gl.TEXTURE_2D, srcTex);
          gl.uniform2f(progBlur._u.uDir, spread / dstRT.w, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          srcTex = dstRT.tex;
          dstRT = (dstRT === blurA) ? blurB : blurA;

          // Vertical
          gl.bindFramebuffer(gl.FRAMEBUFFER, dstRT.fb);
          gl.viewport(0, 0, dstRT.w, dstRT.h);
          gl.bindTexture(gl.TEXTURE_2D, srcTex);
          gl.uniform2f(progBlur._u.uDir, 0, spread / dstRT.h);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          srcTex = dstRT.tex;
          dstRT = (dstRT === blurA) ? blurB : blurA;
        }
        bloomResult = srcTex;
      } else {
        bloomResult = null;
      }

      // ── Pass 8: composite to screen ──
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.useProgram(progComposite);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, scene.tex);
      gl.uniform1i(progComposite._u.uScene, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bloomResult || scene.tex);
      gl.uniform1i(progComposite._u.uBloom, 1);
      gl.uniform1f(progComposite._u.uBloomStrength, state.bloomStrength > 0.01 ? state.bloomStrength : 0);
      gl.uniform1f(progComposite._u.uTime, time);
      gl.bindVertexArray(quadVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(null);
    }

    function step(ts) {
      rafId = requestAnimationFrame(step);
      if (state.paused) { lastTs = ts; return; }
      const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
      lastTs = ts;
      time += dt;

      // Auto-degrade once if we can't hold a usable frame rate.
      if (!degraded && state.quality === "high") {
        frameAcc += dt; frameN++;
        if (frameN >= 90) {
          const fps = frameN / frameAcc;
          if (fps < 32) {
            degraded = true;
            state.quality = "medium";
            state.bloomStrength = 0.22;
            uploadStars(500);
            uploadSphereGeometry(1);
            bindInstancedAttribs();
            uploadNodeBuffers();
          }
          frameAcc = 0; frameN = 0;
        }
      }

      if (cam.autoRotate) cam.theta += cam.autoRotateSpeed * dt;

      // Critically-damped-ish smoothing toward the target camera pose.
      const k = 1 - Math.pow(0.0016, dt);
      cam.dTheta += (cam.theta - cam.dTheta) * k;
      cam.dPhi += (cam.phi - cam.dPhi) * k;
      cam.dRadius += (cam.radius - cam.dRadius) * k;
      for (let i = 0; i < 3; i++) cam.dTarget[i] += (cam.target[i] - cam.dTarget[i]) * k;

      if (resize()) return; // resize reallocates targets; skip this frame
      drawScene();
    }

    function start() {
      if (rafId) return;
      lastTs = performance.now();
      rafId = requestAnimationFrame(step);
    }
    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    resize();

    // ── Public API ──
    return {
      gl,
      canvas,
      state,
      cam,

      setModel,
      start,
      stop,
      resize,
      frameGraph,

      setColorMode(mode) {
        state.colorMode = mode;
        applyColors();
      },
      setLayout(mode) {
        state.layout = mode;
        // Radii are spacing-derived, fibres/labels are anchored to node
        // positions, and each layout is framed on a completely different
        // world scale — so a layout switch rebuilds all of them and re-frames.
        relayout(true);
      },
      setAutoRotate(on) { cam.autoRotate = !!on; },
      setBloom(v) { state.bloomStrength = v; },
      setQuality(q) {
        state.quality = q;
        state.bloomStrength = q === "low" ? 0 : q === "medium" ? 0.22 : 0.30;
        uploadStars(q === "low" ? 0 : q === "medium" ? 220 : 420);
        uploadSphereGeometry(q === "high" ? 2 : 1);
        bindInstancedAttribs();
        uploadNodeBuffers();
        state.dirty = true;
      },
      setPaused(p) { state.paused = !!p; },

      orbit(dx, dy) {
        cam.theta -= dx * 0.006;
        cam.phi = Math.max(-1.45, Math.min(1.45, cam.phi + dy * 0.006));
        camUserAdjusted = true;
      },
      pan(dx, dy) {
        camUserAdjusted = true;
        // Pan in the camera's screen plane.
        const s = cam.radius * 0.0016;
        const ct = Math.cos(cam.dTheta), st = Math.sin(cam.dTheta);
        cam.target[0] += (-dx * ct + dy * st * Math.sin(cam.dPhi)) * s;
        cam.target[1] += dy * Math.cos(cam.dPhi) * s;
        cam.target[2] += (-dx * st - dy * ct * Math.sin(cam.dPhi)) * s;
      },
      zoom(delta) {
        const maxR = Math.max(80, (cam.fitRadius || cam.radius) * 3.2);
        cam.radius = Math.max(6, Math.min(maxR, cam.radius * (delta > 0 ? 1.1 : 0.91)));
        camUserAdjusted = true;
      },
      resetView() {
        cam.theta = Math.PI / 2; cam.phi = 0.20;
        cam.target = [0, 0, 0];
        frameGraph();
      },

      pick(px, py) { return pickAt(px, py); },
      setHover(nodeId) {
        if (state.hoverId === nodeId) return;
        state.hoverId = nodeId;
        updateStates();
        state.dirty = true;
      },
      setSelected(nodeId) {
        state.selectedId = nodeId;
        updateStates();
        state.dirty = true;
      },

      /**
       * Mark a set of nodes as unlearning targets. Marked neurons shift to
       * orange/red with an ember halo and every fibre touching them lights up,
       * so the user can see exactly what is being removed from the model.
       */
      setUnlearnTargets(ids) {
        const set = new Set(ids || []);
        state.nodes.forEach((nd) => {
          nd.unlearn = set.has(nd.id) ? 1 : 0;
        });
        updateStates();
        if (lineMarkData) {
          const vpe = EDGE_SEG * 6;
          state.edges.forEach((e, ei) => {
            const na = state.nodes[e.a], nb = state.nodes[e.b];
            const mark = (na && na.unlearn) || (nb && nb.unlearn) ? 1 : 0;
            for (let k = 0; k < vpe; k++) lineMarkData[(ei * vpe + k) * 2 + 1] = mark;
          });
          gl.bindVertexArray(lineVAO);
          gl.bindBuffer(gl.ARRAY_BUFFER, lineWMBuf);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, lineMarkData);
          gl.bindVertexArray(null);
        }
        state.dirty = true;
      },
      focusNode(nodeId) {
        const nd = state.nodes.find((x) => x.id === nodeId);
        if (!nd) return;
        cam.target = [nd.pos[0], nd.pos[1], nd.pos[2]];
        cam.radius = Math.max(8, cam.radius * 0.55);
        cam.autoRotate = false;
        camUserAdjusted = true;
      },

      nodeAt(index) { return state.nodes[index]; },

      /**
       * Projected anchors for the floating stage labels (DOM overlay). Each
       * entry carries the real stage number, title, node count, colour and the
       * screen position above the cluster. Visibility is left to the caller so
       * it can implement its own level-of-detail rules.
       */
      stageAnchors() {
        if (!lastVP || !state.stageMeta) return [];
        const w = canvas.clientWidth, h = canvas.clientHeight;
        return state.stageMeta.map((meta) => {
          const [cx, cy, cz] = meta.center;
          // The caption clears the stage's own volume — its height, but never
          // less than one neuron radius, so a single-tensor stage (input
          // embedding, output head) still gets a readable callout.
          const span = Math.max(meta.extentY || 0, (meta.nodeR || 0) * 1.25);
          const off = span * 1.06 + 0.5;
          const s = projectPoint(lastVP, cx, cy + off, cz, w, h);
          const sb = projectPoint(lastVP, cx, cy - off, cz, w, h);
          if (!s && !sb) return null;
          const cProj = projectPoint(lastVP, cx, cy, cz, w, h);
          const sSpan = projectPoint(lastVP, cx, cy + span, cz, w, h);
          const onScreen = (p) => p && p.x > -80 && p.x < w + 80 && p.y > -40 && p.y < h + 40;
          // How large the stage reads on screen (its own half-height, not the
          // caption's offset) — the level-of-detail gate below.
          const rPx = cProj && sSpan ? Math.hypot(sSpan.x - cProj.x, sSpan.y - cProj.y) : 0;
          return {
            stage: meta.stage,
            order: meta.order,
            label: meta.label,
            count: meta.count,
            color: meta.color,
            // The caption sits directly above (or below) its column: the
            // horizontal position comes from the column itself, not from the
            // offset point — with the camera slightly above the row a raised
            // point projects further outwards, which would fan the captions
            // away from the columns they belong to.
            x: Math.round(cProj ? cProj.x : (s ? s.x : sb.x)),
            y: Math.round(s ? s.y : sb.y),
            // Mirror anchor for captions placed under the row (straight-line
            // layout alternates captions above/below so none overlap).
            belowY: Math.round(sb ? sb.y : s.y),
            rPx: Math.round(rPx),
            visible: (onScreen(s) || onScreen(sb)) && rPx > 4,
          };
        }).filter(Boolean);
      },

      /**
       * Read back the final composited image as RGBA8 pixels (bottom-up, as
       * WebGL returns it).
       *
       * Two details make this reliable where a naive readPixels is not:
       *  1. The scene target may be RGBA16F, and readPixels with UNSIGNED_BYTE
       *     from a float attachment is an INVALID_OPERATION that yields zeros.
       *     So the composite pass is re-run into a dedicated RGBA8 target.
       *  2. With `preserveDrawingBuffer: false` the default framebuffer is
       *     cleared once the compositor takes it, so reading the canvas outside
       *     the drawing frame also yields zeros.
       * Returns null before the first frame has been drawn.
       */
      readScenePixels() {
        if (!scene) return null;
        if (!readback || readback.w !== scene.w || readback.h !== scene.h) {
          if (readback) { gl.deleteFramebuffer(readback.fb); gl.deleteTexture(readback.tex); }
          readback = makeFBO(gl, scene.w, scene.h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, readback.fb);
        gl.viewport(0, 0, readback.w, readback.h);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.useProgram(progComposite);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, scene.tex);
        gl.uniform1i(progComposite._u.uScene, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, bloomResult || scene.tex);
        gl.uniform1i(progComposite._u.uBloom, 1);
        gl.uniform1f(progComposite._u.uBloomStrength, bloomResult ? state.bloomStrength : 0);
        gl.uniform1f(progComposite._u.uTime, time);
        gl.bindVertexArray(quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);

        const px = new Uint8Array(readback.w * readback.h * 4);
        gl.readPixels(0, 0, readback.w, readback.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.activeTexture(gl.TEXTURE0);
        return { data: px, width: readback.w, height: readback.h };
      },

      /** Render exactly one frame (used by tests and screenshot export). */
      renderOnce() { drawScene(); },

      /** Near/far planes the last rendered frame used. */
      depthRange() { return { near: lastNear, far: lastFar }; },

      /**
       * Project a node to viewport CSS pixels. Returns null when off-screen or
       * behind the camera. Useful for anchoring DOM labels to 3D nodes.
       */
      projectNode(nodeId) {
        if (!lastVP) return null;
        const nd = state.nodes.find((x) => x.id === nodeId);
        if (!nd) return null;
        return projectPoint(lastVP, nd.pos[0], nd.pos[1], nd.pos[2],
          canvas.clientWidth, canvas.clientHeight);
      },

      dispose() {
        stop();
        for (const rt of [scene, bright, blurA, blurB, readback]) {
          if (rt) { gl.deleteFramebuffer(rt.fb); gl.deleteTexture(rt.tex); }
        }
        [progSphere, progLine, progPoint, progFlow, progBg, progBright, progBlur, progComposite]
          .forEach((p) => gl.deleteProgram(p));
        [sphereVAO, lineVAO, starVAO, flowVAO, quadVAO].forEach((v) => gl.deleteVertexArray(v));
      },
    };
  }

  global.NN3D = {
    create,
    buildGraph,
    depthColor,
    dtypeColor,
    extractBlockIndex,
    version: "1.3.2",
  };
})(window);
