"use strict";

/**
 * Firebase ID token verification.
 *
 * The API used to base64-decode the JWT payload and trust it, which let anyone
 * mint a token for any user id. This module verifies the RS256 signature
 * against Google's published signing certificates and checks the standard
 * Firebase claims (iss, aud, exp, iat, sub).
 *
 * No dependency beyond Node's own crypto: Node 22 ships fetch,
 * X509Certificate and crypto.verify, which is everything required.
 */

const crypto = require("crypto");

const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const ISSUER_PREFIX = "https://securetoken.google.com/";
const CERT_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const CLOCK_SKEW_SECONDS = 300;

// kid -> PEM certificate, cached for an hour. Google rotates these; an unknown
// kid on a valid-looking token triggers one forced refetch before rejecting.
let certificateCache = { certs: null, fetchedAt: 0 };

async function loadCertificates({ force = false, fetcher } = {}) {
  const isFresh =
    certificateCache.certs && Date.now() - certificateCache.fetchedAt < CERT_TTL_MS;
  if (isFresh && !force) return certificateCache.certs;

  const doFetch = fetcher || globalThis.fetch;
  const response = await doFetch(CERTS_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`certificate endpoint returned ${response.status}`);
  }
  const certs = await response.json();
  if (!certs || typeof certs !== "object" || Object.keys(certs).length === 0) {
    throw new Error("certificate endpoint returned no keys");
  }
  certificateCache = { certs, fetchedAt: Date.now() };
  return certs;
}

function decodeSegment(segment) {
  if (typeof segment !== "string" || segment.length === 0) {
    throw new Error("malformed token");
  }
  const json = Buffer.from(
    segment.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
  return JSON.parse(json);
}

function publicKeyFromPem(pem) {
  // Google serves X.509 certificates; tests may pass a bare public key.
  try {
    return new crypto.X509Certificate(pem).publicKey;
  } catch (e) {
    return crypto.createPublicKey(pem);
  }
}

/**
 * Verify a Firebase ID token and return its claims.
 *
 * @param {string} token raw JWT (without the "Bearer " prefix)
 * @param {object} [options]
 * @param {string} [options.projectId] expected audience; defaults to
 *   FIREBASE_PROJECT_ID, else derived from the issuer (they must agree)
 * @param {object} [options.certs] kid -> PEM map, for tests
 * @param {function} [options.now] seconds since epoch, for tests
 * @throws {Error} on any validation failure
 */
async function verifyFirebaseIdToken(token, options = {}) {
  const {
    projectId = process.env.FIREBASE_PROJECT_ID || null,
    certs: certificateOverride = null,
    now = () => Math.floor(Date.now() / 1000),
  } = options;

  const parts = typeof token === "string" ? token.split(".") : [];
  if (parts.length !== 3 || parts.some((p) => !p)) {
    throw new Error("malformed token");
  }

  const header = decodeSegment(parts[0]);
  const payload = decodeSegment(parts[1]);

  if (header.alg !== "RS256") throw new Error(`unexpected alg ${header.alg}`);
  if (typeof header.kid !== "string" || !header.kid) throw new Error("missing key id");

  let certs = certificateOverride;
  if (!certs) {
    certs = await loadCertificates();
    if (!certs[header.kid]) certs = await loadCertificates({ force: true });
  }
  const pem = certs[header.kid];
  if (!pem) throw new Error("unknown signing key");

  const signature = Buffer.from(
    parts[2].replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );
  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signatureValid = crypto.verify(
    "RSA-SHA256",
    signingInput,
    publicKeyFromPem(pem),
    signature
  );
  if (!signatureValid) throw new Error("invalid signature");

  const issuedAt = now();
  if (typeof payload.exp !== "number" || payload.exp <= issuedAt) {
    throw new Error("token expired");
  }
  if (
    typeof payload.iat !== "number" ||
    payload.iat > issuedAt + CLOCK_SKEW_SECONDS
  ) {
    throw new Error("token issued in the future");
  }

  const issuer = typeof payload.iss === "string" ? payload.iss : "";
  if (!issuer.startsWith(ISSUER_PREFIX)) throw new Error("unexpected issuer");
  const audience = projectId || issuer.slice(ISSUER_PREFIX.length);
  if (!audience || payload.aud !== audience) throw new Error("unexpected audience");

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("missing subject");
  }

  // Firebase puts the uid in both sub and user_id; they must not disagree.
  if (payload.user_id && payload.user_id !== payload.sub) {
    throw new Error("subject mismatch");
  }

  return payload;
}

module.exports = { verifyFirebaseIdToken, _resetCertificateCache() {
  certificateCache = { certs: null, fetchedAt: 0 };
} };
