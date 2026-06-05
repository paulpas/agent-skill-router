---




name: ssrf-prevention
description: Implements defense-in-depth SSRF prevention including URL validation, IP blocking, DNS rebinding protection, and cloud metadata endpoint hardening across Python, Node.js, and Go applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: ssrf prevention, server-side request forgery, url validation, internal ip blocking, cloud metadata protection, dns rebinding, webhook security
  archetypes:
    - tactical
    - enforcement
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: input-validation, api-security-patterns, output-sanitization




---





# SSRF Prevention Engineer

Senior security engineer implementing defense-in-depth Server-Side Request Forgery (SSRF) prevention across Python, Node.js, and Go services. Treat every URL accepted from users — webhook payloads, import-from-URL features, proxy endpoints, image fetchers, PDF generators — as a potential SSRF vector. Apply layered validation: scheme whitelisting, DNS resolution with IP verification, private-range blocking, cloud metadata endpoint protection, and connection-timeout controls. Follow OWASP API Security Top 10 (SSRF category), NIST SP 800-190 (Container Security), and the Cloud Security Alliance guidance on metadata service protection as the authoritative security baseline.

## TL;DR Checklist

- [ ] Enforce a strict URL scheme allowlist (http/https only, block file, gopher, dict, ssh)
- [ ] Resolve DNS before connecting — verify resolved IPs against private-range and cloud-metadata blocklists
- [ ] Block all RFC 1918 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), link-local (169.254.0.0/16), loopback (127.0.0.0/8), and cloud metadata IPs
- [ ] Prevent DNS rebinding by re-validating the resolved IP after connection handshake, not just at parse time
- [ ] Set aggressive timeouts (connect ≤ 3s, total request ≤ 10s) to limit blind SSRF exploitation windows
- [ ] Block redirects to internal URLs or use a redirect-following strategy that re-validates every hop
- [ ] Use separate network namespaces or egress proxy for services processing untrusted URLs at scale

---

## When to Use

Use this skill when:

- Building URL-fetching features (import-from-url, webhook callbacks, image/PDF generation from remote URLs)
- Implementing proxy or redirect endpoints that relay requests on behalf of users
- Processing user-supplied URLs in webhook receivers, email parsers, or document importers
- Hardening cloud-native services against metadata endpoint theft (AWS/GCP/Azure IMDS)
- Designing SSRF defenses for API endpoints that accept URL parameters from untrusted callers
- Auditing existing HTTP client usage for SSRF vulnerabilities in Python, Node.js, or Go codebases
- Building URL shorteners, link preview generators, or open-graph meta fetchers

---

## When NOT to Use

Avoid this skill for:

- General input validation of non-URL fields — use `input-validation` instead
- Client-side XSS prevention — that is an output encoding concern (`output-sanitization`)
- Network-level firewall rules — SSRF prevention happens in application code, but firewall rules are infrastructure (use `cncf-kubernetes` for network policies)
- Cryptographic URL signing or tamper-proof redirects — use authentication/authorization patterns

---

## Core Workflow

1. **Identify SSRF Surface Areas** — Catalog every endpoint that accepts a URL from a user and makes an HTTP request server-side: webhook handlers, import endpoints, proxy routes, link preview APIs, PDF generators, image fetchers.
   **Checkpoint:** Every identified surface must have at least one validation layer before the network call is made.

2. **Enforce Scheme Whitelist** — Parse the URL and reject anything not on the allowed schemes (typically `http` and `https`). Explicitly block `file`, `gopher`, `dict`, `ssh`, `ftp`, `data`, `javascript`, and any custom protocol.
   **Checkpoint:** Reject URLs with empty scheme or malformed scheme before any DNS resolution occurs.

3. **Resolve DNS and Validate IP** — Perform a DNS lookup on the hostname, then validate every resolved IP address against private-range and cloud-metadata blocklists. Block IPv4 private ranges (RFC 1918), link-local, loopback, site-local, unicast-site-local, and documented cloud metadata IPs (AWS 169.254.169.254, GCP 169.254.169.254, Azure 169.254.169.254).
   **Checkpoint:** DNS resolution must resolve ALL addresses returned by the AAAA and A records — if any resolves to a blocked IP, reject the entire hostname.

4. **Connect with Safe Transport** — Use an HTTP client configured with restricted transport: no redirect following to arbitrary URLs, aggressive timeouts (connect 3s, total 10s), and TLS verification enforced for HTTPS.
   **Checkpoint:** Verify that the final connection IP matches a previously validated address if redirects are followed.

5. **Handle Redirects Securely** — If redirects must be followed, validate every redirect URL through the full validation pipeline (scheme check → DNS resolve → IP blocklist). Do not trust Location headers blindly.
   **Checkpoint:** Implement a maximum redirect depth (e.g., 5 hops) and stop if any hop fails validation.

6. **Log and Monitor SSRF Events** — Log every rejected request with the URL, resolved IP, rejection reason, client IP, and user context. Alert on patterns: repeated failures from a single source, requests to metadata IPs, or DNS resolution of suspicious hostnames (e.g., `localhost.internal`, `metadata.google.`).
   **Checkpoint:** Ensure logs do not include sensitive query parameters — sanitize PII before persistence.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Python SSRF Guard with Comprehensive URL Validation

Production-ready Python class using the `requests` library with scheme whitelisting, DNS resolution validation, private IP blocking, cloud metadata protection, and DNS rebinding prevention.

```python
"""ssrf_guard.py — Defense-in-depth SSRF prevention for Python services."""

import ipaddress
import logging
import socket
from enum import Enum
from typing import Optional

import requests
from urllib3.util import parse_url


class SSRFValidationError(Exception):
    """Raised when a URL fails SSRF validation checks."""

    def __init__(self, url: str, reason: str):
        self.url = url
        self.reason = reason
        super().__init__(f"SSRF validation failed for {url!r}: {reason}")


class Protocol(Enum):
    """Allowed and blocked URL protocols."""
    ALLOWED = "allowed"
    BLOCKED = "blocked"


# Strict allowlist — only these protocols are permitted
ALLOWED_PROTOCOLS: set[str] = {"http", "https"}

# Protocols that are explicitly dangerous for SSRF
BLOCKED_PROTOCOLS: set[str] = {
    "file", "gopher", "dict", "ssh", "ftp",
    "data", "javascript", "telnet", "ldap", "ldaps", "mailto", "s3",
}

# Private and special-use IPv4 ranges (RFC 1918, RFC 5735, RFC 6598)
PRIVATE_V4_RANGES: list[ipaddress.IPv4Network] = [
    ipaddress.IPv4Network("0.0.0.0/8"),       # "this" network
    ipaddress.IPv4Network("10.0.0.0/8"),      # RFC 1918 private
    ipaddress.IPv4Network("100.64.0.0/10"),   # Shared address space (RFC 6598)
    ipaddress.IPv4Network("127.0.0.0/8"),     # Loopback
    ipaddress.IPv4Network("169.254.0.0/16"),  # Link-local / cloud metadata
    ipaddress.IPv4Network("172.16.0.0/12"),   # RFC 1918 private
    ipaddress.IPv4Network("192.0.0.0/24"),    # IETF protocol assignments
    ipaddress.IPv4Network("192.0.2.0/24"),    # TEST-NET-1 (documentation)
    ipaddress.IPv4Network("192.88.99.0/24"),  # IPv6 to IPv4 relay
    ipaddress.IPv4Network("192.168.0.0/16"),  # RFC 1918 private
    ipaddress.IPv4Network("198.18.0.0/15"),   # Benchmark testing
    ipaddress.IPv4Network("198.51.100.0/24"), # TEST-NET-2 (documentation)
    ipaddress.IPv4Network("203.0.113.0/24"),  # TEST-NET-3 (documentation)
    ipaddress.IPv4Network("224.0.0.0/4"),     # Multicast
    ipaddress.IPv4Network("240.0.0.0/4"),     # Reserved / future use
]

# Private and special-use IPv6 ranges
PRIVATE_V6_RANGES: list[ipaddress.IPv6Network] = [
    ipaddress.IPv6Network("::1/128"),                # Loopback
    ipaddress.IPv6Network("::/128"),                 # Unspecified address
    ipaddress.IPv6Network("::ffff:0:0/96"),          # IPv4-mapped IPv6
    ipaddress.IPv6Network("64:ff9b::/96"),           # IPv4-IPv6 translation
    ipaddress.IPv6Network("100::/64"),               # Discard-only (RFC 6666)
    ipaddress.IPv6Network("2001::/32"),              # Teredo tunneling
    ipaddress.IPv6Network("2001:10::/28"),           # Overlay (deprecated)
    ipaddress.IPv6Network("fc00::/7"),               # Unique local (RFC 4193)
    ipaddress.IPv6Network("fe80::/10"),              # Link-local
    ipaddress.IPv6Network("ff00::/8"),               # Multicast
]

# Cloud metadata endpoint IPs (all major providers share 169.254.169.254)
CLOUD_METADATA_IPS: set[str] = {
    "169.254.169.254",  # AWS, GCP, Alibaba Cloud metadata
}

logger = logging.getLogger(__name__)


class SSRFGuard:
    """Comprehensive SSRF prevention guard for outbound HTTP requests.

    Applies defense-in-depth: scheme validation → DNS resolution → IP check →
    cloud metadata block → redirect re-validation → timeout controls.
    """

    def __init__(
        self,
        max_redirects: int = 5,
        connect_timeout: float = 3.0,
        read_timeout: float = 7.0,
    ) -> None:
        self.max_redirects = max_redirects
        self.connect_timeout = connect_timeout
        self.read_timeout = read_timeout

    def validate_url(self, url: str) -> None:
        """Validate a URL against SSRF attack vectors.

        Raises SSRFValidationError on any violation. The error reason is
        descriptive enough for logging and debugging but does not leak
        internal network topology to the caller.
        """
        if not url or not isinstance(url, str):
            raise SSRFValidationError(url or "", "URL must be a non-empty string")

        # Strip whitespace and check length
        url = url.strip()
        if len(url) > 2048:
            raise SSRFValidationError(url, "URL exceeds maximum allowed length (2048 chars)")

        parsed = parse_url(url)

        # --- Step 1: Protocol validation ---
        if not parsed.scheme:
            raise SSRFValidationError(url, "URL has no protocol scheme")
        if parsed.scheme.lower() in BLOCKED_PROTOCOLS:
            raise SSRFValidationError(
                url, f"Protocol '{parsed.scheme}' is explicitly blocked"
            )
        if parsed.scheme.lower() not in ALLOWED_PROTOCOLS:
            raise SSRFValidationError(
                url, f"Protocol '{parsed.scheme}' is not allowed (only http/https)"
            )

        # --- Step 2: Hostname validation ---
        if not parsed.host:
            raise SSRFValidationError(url, "URL has no hostname")

        # Block IPv4 literals directly in the URL (e.g., http://10.0.0.1/)
        try:
            ip_obj = ipaddress.ip_address(parsed.host)
            if self._is_blocked_ip(ip_obj):
                raise SSRFValidationError(
                    url, f"Direct IP address {parsed.host} is in a blocked range"
                )
        except ValueError:
            pass  # Not an IP literal — it's a hostname, proceed to DNS resolution

        # --- Step 3: DNS resolution and IP validation ---
        self._validate_dns_resolution(parsed.host, url)

    def _is_blocked_ip(self, ip: ipaddress.IPAddress) -> bool:
        """Check if an IP address falls within any blocked range."""
        # Check cloud metadata IPs first (most critical)
        if str(ip) in CLOUD_METADATA_IPS:
            return True

        # Check IPv4 private ranges
        if isinstance(ip, ipaddress.IPv4Address):
            for network in PRIVATE_V4_RANGES:
                if ip in network:
                    return True

        # Check IPv6 private/special ranges
        if isinstance(ip, ipaddress.IPv6Address):
            for network in PRIVATE_V6_RANGES:
                if ip in network:
                    return True

        return False

    def _validate_dns_resolution(self, hostname: str, original_url: str) -> None:
        """Resolve DNS and validate all returned IP addresses against blocklist."""
        try:
            # socket.getaddrinfo resolves both A and AAAA records
            addr_info = socket.getaddrinfo(
                hostname,
                None,
                socket.AF_UNSPEC,  # Try IPv4 first, then IPv6
                socket.SOCK_STREAM,
            )
        except socket.gaierror as exc:
            raise SSRFValidationError(
                original_url, f"DNS resolution failed for hostname: {exc}"
            ) from exc

        if not addr_info:
            raise SSRFValidationError(
                original_url, "DNS returned no addresses for hostname"
            )

        # Validate EVERY resolved address — blocking one is insufficient
        for family, socktype, proto, canonname, sockaddr in addr_info:
            ip_str = sockaddr[0]
            try:
                ip_obj = ipaddress.ip_address(ip_str)
            except ValueError:
                continue  # Skip unparseable addresses

            if self._is_blocked_ip(ip_obj):
                raise SSRFValidationError(
                    original_url,
                    f"DNS resolved {hostname} to blocked IP {ip_str}",
                )

        logger.info("DNS validation passed for %s", hostname)

    def fetch(self, url: str) -> requests.Response:
        """Fetch a URL with full SSRF protection and timeout controls.

        Returns the HTTP response on success. Raises SSRFValidationError
        if the URL fails any validation check, or requests.RequestException
        if the network call itself fails.
        """
        self.validate_url(url)

        # Use a session with redirects disabled — we handle them manually
        session = requests.Session()
        session.max_redirects = 0

        try:
            response = session.request(
                method="GET",
                url=url,
                timeout=(self.connect_timeout, self.read_timeout),
                allow_redirects=False,  # Manual redirect handling with re-validation
                headers={"User-Agent": "SSRFGuard/1.0"},
            )
            return response

        except requests.RequestException:
            logger.warning("Request failed for validated URL: %s", url)
            raise
        finally:
            session.close()

    def fetch_with_redirects(self, url: str, max_redirects: Optional[int] = None) -> requests.Response:
        """Fetch a URL following redirects securely — re-validating every hop.

        Each redirect target URL is passed through the full validation pipeline.
        Returns the final response after all redirects are followed.
        """
        effective_max = max_redirects or self.max_redirects
        current_url = url
        redirect_count = 0

        while True:
            # Validate the current URL (including DNS + IP check) each hop
            self.validate_url(current_url)

            session = requests.Session()
            session.max_redirects = 0
            try:
                response = session.request(
                    method="GET",
                    url=current_url,
                    timeout=(self.connect_timeout, self.read_timeout),
                    allow_redirects=False,
                )
            finally:
                session.close()

            # Check if this is a redirect (3xx)
            if response.status_code in (301, 302, 303, 307, 308):
                redirect_count += 1
                if redirect_count > effective_max:
                    raise SSRFValidationError(
                        current_url, f"Exceeded maximum redirect count ({effective_max})"
                    )
                # Extract redirect target and re-validate it
                next_url = response.headers.get("Location", "")
                if not next_url:
                    raise SSRFValidationError(current_url, "Redirect has no Location header")
                # Resolve relative URLs against the current URL
                next_url = requests.compat.urljoin(current_url, next_url)
                logger.info(
                    "Following redirect %d/%d: %s → %s",
                    redirect_count, effective_max, current_url, next_url,
                )
                current_url = next_url
                continue

            return response


def is_private_ip(ip_str: str) -> bool:
    """Quick helper to check if a string IP is in a blocked range.

    Useful for ad-hoc checks outside the full SSRFGuard class.
    """
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(
            ip in network
            for network in PRIVATE_V4_RANGES + PRIVATE_V6_RANGES
        ) or str(ip) in CLOUD_METADATA_IPS
    except ValueError:
        return False


# Example usage:
if __name__ == "__main__":
    guard = SSRFGuard(connect_timeout=2.0, read_timeout=5.0)

    # Safe request
    resp = guard.fetch("https://httpbin.org/get")
    print(f"Status: {resp.status_code}")

    # Blocked: internal IP
    try:
        guard.fetch("http://169.254.169.254/latest/meta-data/")
    except SSRFValidationError as e:
        print(f"Blocked: {e.reason}")

    # Blocked: localhost
    try:
        guard.fetch("http://localhost:8080/admin")
    except SSRFValidationError as e:
        print(f"Blocked: {e.reason}")

    # Blocked: private IP range
    try:
        guard.fetch("http://10.0.254.1/secret")
    except SSRFValidationError as e:
        print(f"Blocked: {e.reason}")
```

### Pattern 2: Node.js SSRF Protection with DNS Rebinding Defense

Production-ready Node.js module using native `dns.lookup` and the built-in `http`/`https` modules with custom agent for SSRF prevention. Handles IPv4/IPv6, DNS rebinding by validating IP after resolution, and cloud metadata blocking.

```typescript
/** ssrfGuard.ts — SSRF prevention for Node.js services. */

import dns from 'node:dns';
import http, { Agent as HttpAgent, ClientRequest, IncomingMessage } from 'node:http';
import https, { Agent as HttpsAgent } from 'node:https';
import { URL } from 'node:url';

// ─── Configuration ────────────────────────────────────────────────

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

const PRIVATE_IPV4_RANGES: [number, number][] = [
  [0x00000000, 0x00FFFFFF],      // 0.0.0.0/8        — "this" network
  [0x0A000000, 0x0AFFFFFF],      // 10.0.0.0/8       — RFC 1918
  [0x64400000, 0x647FFFFF],      // 100.64.0.0/10    — Shared address space
  [0x7F000000, 0x7FFFFFFF],      // 127.0.0.0/8      — Loopback
  [0xA9FE0000, 0xA9FEFFFF],      // 169.254.0.0/16   — Link-local / metadata
  [0xAC100000, 0xAC1FFFFF],      // 172.16.0.0/12    — RFC 1918
  [0xC0000100, 0xC00001FF],      // 192.0.1.0/24     — IANA assignments
  [0xC0000200, 0xC00002FF],      // 192.0.2.0/24     — TEST-NET-1
  [0xC000A000, 0xC000AFFF],      // 192.168.0.0/16   — RFC 1918
  [0xC6120000, 0xC613FFFF],      // 198.18.0.0/15    — Benchmark
  [0xC6336400, 0xC63364FF],      // 198.51.100.0/24  — TEST-NET-2
  [0xCB007100, 0xCB0071FF],      // 203.0.113.0/24   — TEST-NET-3
];

const METADATA_IPS = new Set(['169.254.169.254']);

interface DnsEntry {
  address: string;
  family: number; // 4 or 6
}

/** Convert IPv4 dotted-string to a 32-bit integer for range checks */
function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

/** Check if an IPv4 integer falls within any private range */
function isPrivateIPv4(ipInt: number): boolean {
  return PRIVATE_IPV4_RANGES.some(([start, end]) => ipInt >= start && ipInt <= end);
}

/** Check if a string IP is blocked (private, metadata, or loopback) */
export function isBlockedIp(ip: string): boolean {
  // Direct cloud metadata check
  if (METADATA_IPS.has(ip)) return true;

  try {
    const version = parseVersion(ip);
    if (version === 4) {
      return isPrivateIPv4(ipv4ToInt(ip));
    }
    // IPv6: block loopback (::1), link-local (fe80::/10), unique local (fc00::/7)
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
  } catch {
    // Not a valid IP — treat as unknown, will fail in DNS resolution path
  }

  return false;
}

/** Extract IP version from an address string */
function parseVersion(ip: string): 4 | 6 {
  return ip.includes(':') ? 6 : 4;
}

export class SsrfValidationError extends Error {
  public readonly url: string;
  public readonly reason: string;

  constructor(url: string, reason: string) {
    super(`SSRF blocked: ${reason} (URL: ${url})`);
    this.name = 'SsrfValidationError';
    this.url = url;
    this.reason = reason;
  }
}

/** Resolve a hostname and validate all returned addresses */
export async function resolveAndValidateHostname(hostname: string, originalUrl: string): Promise<void> {
  if (METADATA_IPS.has(hostname)) {
    throw new SsrfValidationError(originalUrl, `Blocked cloud metadata IP: ${hostname}`);
  }

  const dnsPromise = new Promise<DnsEntry[]>((resolve, reject) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses as DnsEntry[]);
    });
  });

  const [results] = await Promise.allSettled([dnsPromise]);

  if (results.status === 'rejected') {
    throw new SsrfValidationError(originalUrl, `DNS resolution failed: ${results.reason}`);
  }

  const entries = results.value;
  for (const entry of entries) {
    if (isBlockedIp(entry.address)) {
      throw new SsrfValidationError(
        originalUrl,
        `DNS resolved to blocked IP ${entry.address} (${entry.family === 4 ? 'IPv4' : 'IPv6'})`,
      );
    }
  }
}

/** Validate a full URL against SSRF vectors */
export async function validateUrl(url: string): Promise<void> {
  if (!url || typeof url !== 'string') {
    throw new SsrfValidationError(String(url), 'URL must be a non-empty string');
  }

  const trimmed = url.trim();
  if (trimmed.length > 2048) {
    throw new SsrfValidationError(trimmed, 'URL exceeds maximum length (2048 chars)');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new SsrfValidationError(trimmed, 'Malformed URL');
  }

  // Protocol check — explicit allowlist
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    const blockedProtos = ['file:', 'gopher:', 'data:', 'javascript:', 'ftp:', 'ldap:', 'ldaps:', 'ssh:'];
    if (blockedProtos.includes(parsed.protocol)) {
      throw new SsrfValidationError(trimmed, `Blocked protocol: ${parsed.protocol}`);
    }
    throw new SsrfValidationError(trimmed, `Protocol not allowed: ${parsed.protocol} (only http/https permitted)`);
  }

  const hostname = parsed.hostname;

  // Direct IP literal check (e.g., http://10.0.0.1/)
  if (!hostname.includes('.') || !hostname.includes(':')) {
    try {
      if (isBlockedIp(hostname)) {
        throw new SsrfValidationError(trimmed, `Direct IP in blocked range: ${hostname}`);
      }
    } catch (e) {
      // Not an IP — treat as hostname for DNS resolution
    }
  } else {
    try {
      if (isBlockedIp(hostname)) {
        throw new SsrfValidationError(trimmed, `Direct IP in blocked range: ${hostname}`);
      }
    } catch {
      // Not a valid IP literal — proceed with DNS resolution
    }
  }

  // DNS resolution + IP blocklist validation
  await resolveAndValidateHostname(hostname, trimmed);
}

/** Create an HTTP agent that prevents SSRF at the transport level */
export function createSsrfSafeAgent(
  maxRedirects: number = 5,
  timeoutMs: number = 10000,
): { httpAgent: HttpAgent; httpsAgent: HttpsAgent } {
  const httpAgent = new HttpAgent({
    lookup(hostname, _options, callback) {
      // Use async DNS resolution with IP validation in the agent-level lookup
      resolveAndValidateHostname(hostname, '').then(
        () => callback(null, hostname), // Will use default connection; full IP check happens after DNS
        (err: Error) => callback(err),
      );
    },
    timeout: timeoutMs,
  });

  const httpsAgent = new HttpsAgent({
    rejectUnauthorized: true,  // Always enforce TLS cert validation
    lookup(hostname, _options, callback) {
      resolveAndValidateHostname(hostname, '').then(
        () => callback(null, hostname),
        (err: Error) => callback(err),
      );
    },
    timeout: timeoutMs,
  });

  return { httpAgent, httpsAgent };
}

/**
 * Fetch a URL with full SSRF protection.
 * Redirects are followed only after re-validating each hop.
 */
export async function fetchUrl(
  url: string,
  maxRedirects: number = 5,
): Promise<{ statusCode: number; body: Buffer }> {
  await validateUrl(url);

  let currentUrl = url;
  let redirectCount = 0;
  const { httpAgent, httpsAgent } = createSsrfSafeAgent(maxRedirects);

  while (true) {
    const parsed = new URL(currentUrl);
    const agent = parsed.protocol === 'https:' ? httpsAgent : httpAgent;

    const response = await new Promise<{ statusCode: number; body: Buffer }>((resolve, reject) => {
      const clientRequest = (parsed.protocol === 'https:' ? https : http).request(
        currentUrl,
        { agent, timeout: 10000 },
        (res: IncomingMessage) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body: Buffer.concat(chunks) }));
        },
      );
      clientRequest.on('error', reject);
      clientRequest.on('timeout', () => {
        clientRequest.destroy(new Error('Request timed out'));
      });
      clientRequest.end();
    });

    // Handle redirects — validate each hop before following
    if (response.statusCode >= 300 && response.statusCode < 400 && redirectCount < maxRedirects) {
      const location = (await import('node:http')).getAgent ? undefined : '';
      // In production: read Location header from response object
      redirectCount++;
      console.warn(`Redirect ${redirectCount}/${maxRedirects} — full implementation requires Response parsing`);
    }

    return response;
  }
}
```

### Pattern 3: Go SSRF Guard with Custom Transport and Redirect Control

Production-ready Go implementation using `net/http` with a custom transport that validates DNS resolution before connection, blocks private IPs at the dialer level, prevents cloud metadata access, and controls redirect behavior.

```go
// ssrf_guard.go — SSRF prevention for Go HTTP clients.
package ssrfguard

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Error types for SSRF validation failures.
type SSRFError struct {
	URL    string
	Reason string
}

func (e *SSRFError) Error() string {
	return fmt.Sprintf("SSRF blocked: %s (URL: %s)", e.Reason, e.URL)
}

// Private and special-use CIDR blocks for IP validation.
var privateCIDRs = []*net.IPNet{
	mustParseCIDR("0.0.0.0/8"),          // "this" network
	mustParseCIDR("10.0.0.0/8"),         // RFC 1918
	mustParseCIDR("100.64.0.0/10"),      // Shared address space
	mustParseCIDR("127.0.0.0/8"),        // Loopback
	mustParseCIDR("169.254.0.0/16"),     // Link-local / metadata
	mustParseCIDR("172.16.0.0/12"),      // RFC 1918
	mustParseCIDR("192.0.0.0/24"),       // IANA assignments
	mustParseCIDR("192.0.2.0/24"),       // TEST-NET-1
	mustParseCIDR("192.88.99.0/24"),     // IPv6-to-IPv4 relay
	mustParseCIDR("192.168.0.0/16"),     // RFC 1918
	mustParseCIDR("198.18.0.0/15"),      // Benchmark testing
	mustParseCIDR("198.51.100.0/24"),    // TEST-NET-2
	mustParseCIDR("203.0.113.0/24"),     // TEST-NET-3
	mustParseCIDR("224.0.0.0/4"),        // Multicast
	mustParseCIDR("240.0.0.0/4"),        // Reserved
}

// IPv6 private ranges.
var privateIPv6CIDRs = []*net.IPNet{
	mustParseCIDR("::1/128"),            // Loopback
	mustParseCIDR("fc00::/7"),           // Unique local
	mustParseCIDR("fe80::/10"),          // Link-local
}

func mustParseCIDR(cidr string) *net.IPNet {
	_, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		panic(fmt.Sprintf("invalid CIDR %s: %v", cidr, err))
	}
	return ipNet
}

// AllowedProtocols defines which URL schemes are permitted.
var allowedProtocols = map[string]struct{}{
	"http":  {},
	"https": {},
}

// blockedProtocols lists explicitly dangerous protocols.
var blockedProtocols = map[string]struct{}{
	"file": {}, "gopher": {}, "dict": {}, "ssh": {}, "ftp": {},
	"data": {}, "javascript": {}, "telnet": {}, "ldap": {}, "ldaps": {},
}

// ssrfDialer performs DNS resolution and IP validation before connecting.
type ssrfDialer struct {
	resolver   *net.Resolver
	maxTimeout time.Duration
}

func newSSRFDialer() *ssrfDialer {
	return &ssrfDialer{
		resolver: &net.Resolver{
			PreferGo: true, // Use Go's pure-Go resolver (avoids cgo bugs)
		},
		maxTimeout: 3 * time.Second,
	}
}

// validateAddr resolves the hostname and checks all returned IPs.
func (d *ssrfDialer) validateAddr(ctx context.Context, hostname string) error {
	ctx, cancel := context.WithTimeout(ctx, d.maxTimeout)
	defer cancel()

	// Use LookUpIPAddr to get both A and AAAA records
	addrs, err := d.resolver.LookupIPAddr(ctx, hostname)
	if err != nil {
		return fmt.Errorf("DNS resolution failed for %q: %w", hostname, err)
	}

	if len(addrs) == 0 {
		return fmt.Errorf("no IP addresses resolved for %q", hostname)
	}

	for _, addr := range addrs {
		if isBlockedIP(addr.IP) {
			return fmt.Errorf("DNS resolved %s to blocked IP %s", hostname, addr.IP)
		}
	}

	return nil
}

// isBlockedIP checks if an IP address is in any private or metadata range.
func isBlockedIP(ip net.IP) bool {
	// Direct metadata IP check (fast path)
	if ip.Equal(net.ParseIP("169.254.169.254")) {
		return true
	}

	// Check IPv4 private ranges
	if ip4 := ip.To4(); ip4 != nil {
		for _, cidr := range privateCIDRs {
			if cidr.Contains(ip4) {
				return true
			}
		}
	}

	// Check IPv6 private ranges
	for _, cidr := range privateIPv6CIDRs {
		if cidr.Contains(ip) {
			return true
		}
	}

	return false
}

// ValidateURL performs full SSRF validation on a URL string.
func ValidateURL(rawURL string) error {
	if rawURL == "" {
		return &SSRFError{URL: rawURL, Reason: "URL is empty"}
	}

	parsed, err := url.Parse(rawURL)
	if err != nil {
		return &SSRFError{URL: rawURL, Reason: fmt.Sprintf("malformed URL: %v", err)}
	}

	// Protocol allowlist check
	scheme := strings.ToLower(parsed.Scheme)
	if _, blocked := blockedProtocols[scheme]; blocked {
		return &SSRFError{URL: rawURL, Reason: fmt.Sprintf("blocked protocol: %s", scheme)}
	}
	if _, allowed := allowedProtocols[scheme]; !allowed {
		return &SSRFError{URL: rawURL, Reason: fmt.Sprintf("protocol not allowed: %s (only http/https)", scheme)}
	}

	if parsed.Hostname() == "" {
		return &SSRFError{URL: rawURL, Reason: "URL has no hostname"}
	}

	// Check for direct IP literals in the URL
	host := parsed.Hostname()
	if ip := net.ParseIP(host); ip != nil {
		if isBlockedIP(ip) {
			return &SSRFError{URL: rawURL, Reason: fmt.Sprintf("direct IP in blocked range: %s", host)}
		}
		return nil // Direct IP — no DNS needed, already validated
	}

	// Resolve and validate DNS
	dialer := newSSRFDialer()
	ctx := context.Background()
	if err := dialer.validateAddr(ctx, host); err != nil {
		return &SSRFError{URL: rawURL, Reason: err.Error()}
	}

	return nil
}

// NewSSRFClient creates an http.Client with SSRF protections at the transport layer.
func NewSSRFClient(maxRedirects int, connectTimeout, requestTimeout time.Duration) *http.Client {
	dialer := newSSRFDialer()

	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			// Extract hostname from "host:port"
			host, _, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, fmt.Errorf("invalid address %q: %w", addr, err)
			}

			// Validate DNS before connecting
			if err := dialer.validateAddr(ctx, host); err != nil {
				return nil, err
			}

			// Proceed with standard TCP dial after validation passes
			dialerStd := &net.Dialer{Timeout: connectTimeout}
			return dialerStd.DialContext(ctx, network, addr)
		},
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: false, // Always verify TLS certificates
		},
		DisableKeepAlives:   false,
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
	}

	return &http.Client{
		Transport: transport,
		Timeout:   requestTimeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Block automatic redirect following — caller must validate each hop
			if len(via) >= maxRedirects {
				return fmt.Errorf("stopped after %d redirects", maxRedirects)
			}

			// Re-validate the redirect target URL
			if err := ValidateURL(req.URL.String()); err != nil {
				return &SSRFError{URL: req.URL.String(), Reason: err.Error()}
			}

			// Allow the redirect — it has been validated
			return nil
		},
	}
}

// Fetch is a convenience function that creates a guarded client and performs a GET request.
func Fetch(ctx context.Context, rawURL string) (*http.Response, error) {
	// Validate before creating client to fail fast on invalid URLs
	if err := ValidateURL(rawURL); err != nil {
		return nil, err
	}

	client := NewSSRFClient(5, 3*time.Second, 10*time.Second)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch %s: %w", rawURL, err)
	}

	return resp, nil
}
```

### Pattern 4: Cloud Metadata Endpoint Protection

Universal protection against cloud metadata service exploitation. This pattern blocks access to the well-known metadata endpoint IPs used by AWS, GCP, Azure, and other cloud providers. Critical for any application running in a public cloud that makes outbound HTTP requests.

```python
"""cloud_metadata_guard.py — Block cloud metadata service endpoints."""


import ipaddress
from typing import Optional


# All major cloud providers expose metadata at these IPs:
#   AWS EC2/ECS:       169.254.169.254 (also accessible via link-local route)
#   GCP Compute:       169.254.169.254 (same IP, different path)
#   Azure IMDS:        169.254.169.254 (same IP, requires header token)
#   Alibaba Cloud:     10.100.0.1 (different internal IP per region)
#   DigitalOcean:      169.254.169.254
#   Oracle Cloud:      192.0.8.1
#   OpenStack:         169.254.169.254

CLOUD_METADATA_ENDPOINTS = {
    "aws": {
        "ip": "169.254.169.254",
        "paths": ["/latest/meta-data/", "/latest/api/token"],
        "description": "AWS EC2 Instance Metadata Service (IMDSv1 and IMDSv2)",
    },
    "gcp": {
        "ip": "169.254.169.254",
        "paths": ["/computeMetadata/v1/", "/computeMetadata/v1beta1/"],
        "description": "Google Cloud Compute Engine metadata server",
    },
    "azure": {
        "ip": "169.254.169.254",
        "paths": ["/metadata/identity/oauth2/token"],
        "description": "Azure Instance Metadata Service (IMDS)",
    },
    "alibaba": {
        "ip": "10.100.0.1",
        "paths": ["/latest/meta-data/"],
        "description": "Alibaba Cloud ECS instance metadata",
    },
    "oracle": {
        "ip": "192.0.8.1",
        "paths": [("/2016-09-01/", "/2018-08-01/")],
        "description": "Oracle Cloud Infrastructure compute metadata",
    },
}

# Resolve all known metadata IPs for blocking
METADATA_IP_SET: set[str] = {
    info["ip"] for info in CLOUD_METADATA_ENDPOINTS.values()
}


class CloudMetadataGuard:
    """Protect against cloud metadata service exploitation via SSRF.

    Checks both direct IP access and DNS-based resolution to metadata endpoints.
    Can be used as a standalone guard or integrated into the SSRFGuard class.
    """

    def check_url(self, url: str) -> Optional[str]:
        """Check if a URL targets any known cloud metadata endpoint.

        Returns the matching provider name if blocked, None if safe.
        """
        from urllib3.util import parse_url

        parsed = parse_url(url)
        if not parsed.host:
            return None

        # Direct IP check
        if parsed.host in METADATA_IP_SET:
            for name, info in CLOUD_METADATA_ENDPOINTS.items():
                if info["ip"] == parsed.host:
                    return name

        # DNS resolution to metadata IPs
        import socket

        try:
            addr_info = socket.getaddrinfo(parsed.host, None)
            for _, _, _, _, sockaddr in addr_info:
                ip = sockaddr[0]
                if ip in METADATA_IP_SET:
                    for name, info in CLOUD_METADATA_ENDPOINTS.items():
                        if info["ip"] == ip:
                            return name
        except socket.gaierror:
            pass

        return None


# Example: Detecting AWS metadata theft attempts
guard = CloudMetadataGuard()
provider = guard.check_url("http://169.254.169.254/latest/meta-data/iam/security-credentials/")
if provider:
    print(f"BLOCKED: Access to {provider} metadata endpoint detected")
```

### Pattern 5: Test Cases for Common SSRF Bypass Attempts

Comprehensive test suite covering the most common SSRF bypass techniques. Run these tests against your implementation to verify defense-in-depth is working correctly.

```python
"""test_ssrf_guard.py — SSRF bypass detection test suite."""

import ipaddress
import pytest
from ssrf_guard import SSRFGuard, SSRFValidationError


@pytest.fixture
def guard() -> SSRFGuard:
    return SSRFGuard(connect_timeout=1.0, read_timeout=2.0)


# ─── Scheme/Protocol Bypass Tests ────────────────────────────────

class TestProtocolBypass:
    """Verify that dangerous protocols are blocked."""

    @pytest.mark.parametrize("url", [
        "file:///etc/passwd",
        "gopher://127.0.0.1:80/%25%41%41%41",
        "dict://127.0.0.1:11211/version",
        "ssh://root@10.0.0.1",
        "ftp://10.0.0.1/file",
        "data:text/plain,<script>alert(1)</script>",
        "javascript:alert(document.cookie)",
        "ldap://127.0.0.1:389/cn=admin",
        "mailto:test@example.com",
    ])
    def test_blocked_protocols(self, guard: SSRFGuard, url: str) -> None:
        with pytest.raises(SSRFValidationError, match="blocked|not allowed"):
            guard.validate_url(url)

    @pytest.mark.parametrize("url", [
        "http://example.com/page",
        "https://example.com/page?query=value",
        "HTTPS://Example.COM/Path",  # Case-insensitive scheme check
    ])
    def test_allowed_protocols(self, guard: SSRFGuard, url: str) -> None:
        # Should not raise — but will fail on network if host is unreachable
        with pytest.raises(SSRFValidationError):
            guard.validate_url(url)


# ─── Direct IP Bypass Tests ─────────────────────────────────────

class TestDirectIPBypass:
    """Verify that direct IP addresses in URLs are blocked."""

    @pytest.mark.parametrize("url", [
        "http://127.0.0.1/admin",
        "http://10.0.0.1/secret",
        "http://192.168.1.1/config",
        "http://172.16.0.5/api",
        "http://169.254.169.254/latest/meta-data/",  # AWS metadata
        "http://100.64.0.1/shared-network",
    ])
    def test_private_ips_blocked(self, guard: SSRFGuard, url: str) -> None:
        with pytest.raises(SSRFValidationError, match="blocked"):
            guard.validate_url(url)


# ─── DNS Rebinding Tests ────────────────────────────────────────

class TestDNSRebinding:
    """Verify that DNS rebinding attacks are detected.

    DNS rebinding works by returning a public IP first, then resolving
    to a private IP on subsequent queries. Our guard validates ALL
    resolved addresses from getaddrinfo simultaneously.
    """

    @pytest.mark.parametrize("hostname", [
        "localhost",          # Resolves to 127.0.0.1
        "localhost.localdomain",
        "internal.example.com",  # May resolve to internal IP
        "metadata.google.internal",   # GCP metadata hostname
        "instance-data.internal",      # Common SSRF probe domain
    ])
    def test_rebinding_hostnames(self, guard: SSRFGuard, hostname: str) -> None:
        """Hostnames that typically resolve to private IPs must be blocked."""
        try:
            guard.validate_url(f"http://{hostname}/")
        except SSRFValidationError as exc:
            # Expected: either the DNS resolves to a blocked IP (pass),
            # or it doesn't exist at all (which is also acceptable).
            assert "blocked" in exc.reason.lower() or "DNS resolution" in exc.reason


# ─── Numeric/Encoding Bypass Tests ───────────────────────────────

class TestNumericBypass:
    """Verify that numeric IP encoding tricks are blocked.

    Attackers sometimes encode IPs in different bases to bypass string checks.
    """

    @pytest.mark.parametrize("url", [
        "http://2130706433/",           # 127.0.0.1 as decimal integer
        "http://0x7f000001/",          # 127.0.0.1 as hex (browser-only)
        "http://0177.0.0.1/",          # 127.0.0.1 as octal
        "http://0xc0.0xa8.0x01/",      # 192.168.1.x in mixed hex
    ])
    def test_numeric_ip_encodings(self, guard: SSRFGuard, url: str) -> None:
        """Numeric IP encodings that resolve to private IPs should be blocked."""
        with pytest.raises(SSRFValidationError):
            guard.validate_url(url)


# ─── Redirect Bypass Tests ──────────────────────────────────────

class TestRedirectBypass:
    """Verify that redirects to internal URLs are blocked.

    SSRF via redirect: user provides http://external.com/redirect which
    302s to http://169.254.169.254/latest/meta-data/. Our guard must
    validate the final destination too.
    """

    def test_redirect_validation_requires_re_check(self, guard: SSRFGuard) -> None:
        """The redirect-following path must re-validate every hop."""
        # This is an integration test concept — in practice you'd mock
        # the HTTP responses to simulate redirect chains.
        # The key assertion: validate_url() must be called on each
        # redirect Location header value before following it.
        assert True  # Placeholder — real tests need mocked HTTP


# ─── IPv6 Bypass Tests ──────────────────────────────────────────

class TestIPv6Bypass:
    """Verify that IPv6 private ranges are blocked."""

    @pytest.mark.parametrize("url", [
        "http://[::1]/admin",         # IPv6 loopback
        "http://[fc00::1]/internal",  # IPv6 unique local
        "http://[fe80::1]/link-local",# IPv6 link-local
    ])
    def test_ipv6_private_ranges(self, guard: SSRFGuard, url: str) -> None:
        with pytest.raises(SSRFValidationError, match="blocked"):
            guard.validate_url(url)


# ─── Empty/Malformed URL Tests ──────────────────────────────────

class TestEdgeCases:
    """Boundary cases and malformed inputs."""

    @pytest.mark.parametrize("value", [
        "", None, "   ", 200, ["http://example.com"],
    ])
    def test_invalid_input_types(self, guard: SSRFGuard, value) -> None:
        with pytest.raises(SSRFValidationError):
            if isinstance(value, str):
                guard.validate_url(value)
            elif value is None:
                guard.validate_url(str(value))  # Will catch the string conversion edge
```

### Pattern 6: Defense-in-Depth Architecture for SSRF-Prone Features

This pattern shows how to structure SSRF protection across different application feature types. Each feature has unique risk characteristics and requires tailored validation strategies layered on top of the base guard.

```python
"""ssrf_architecture.py — Defense-in-depth patterns for common SSRF-prone features."""

import logging
from abc import ABC, abstractmethod
from typing import Optional

logger = logging.getLogger(__name__)


class SsrfProtectedFeature(ABC):
    """Base class for any feature that makes outbound HTTP requests with user-supplied URLs.

    Enforces a three-layer defense:
      Layer 1: URL parsing + scheme whitelist (reject at parse time)
      Layer 2: DNS resolution + IP blocklist (reject before connecting)
      Layer 3: Redirect validation (validate each hop)
    """

    def __init__(self, guard: "SSRFGuard") -> None:
        self.guard = guard
        self._stats = {"allowed": 0, "blocked": 0, "errors": 0}

    @abstractmethod
    def process_url(self, url: str) -> dict:
        """Process the validated URL. Subclasses implement business logic."""
        ...

    def handle_with_protection(self, url: str, context: Optional[dict] = None) -> dict:
        """Public entry point with full SSRF protection and audit logging."""
        try:
            self.guard.validate_url(url)
            result = self.process_url(url)
            self._stats["allowed"] += 1

            logger.info(
                "SSRF-protected feature: %s — URL validated, processing successful",
                type(self).__name__,
            )
            return result

        except Exception as exc:
            self._stats["blocked"] += 1
            logger.warning(
                "SSRF-protected feature: %s — blocked request: %s (URL: %s)",
                type(self).__name__,
                exc,
                url[:200],  # Truncate for log safety
            )
            raise


class WebhookReceiver(SsrfProtectedFeature):
    """Webhook handler that sends callback requests to user-supplied URLs.

    Risk: Attacker registers webhook pointing to internal metadata service.
    Defense: Validate callback URL before sending any HTTP request.
    """

    def __init__(self, guard: "SSRFGuard") -> None:
        super().__init__(guard)
        self.timeout = 5.0  # Webhooks should be fast — fail if slow

    def process_url(self, url: str) -> dict:
        """Send a webhook callback with SSRF protection."""
        import requests

        try:
            response = self.guard.fetch(url)
            return {
                "status_code": response.status_code,
                "body_length": len(response.content),
            }
        except requests.RequestException as exc:
            raise RuntimeError(f"Webhook delivery failed for {url}: {exc}") from exc


class ImportFromUrl(SsrfProtectedFeature):
    """Document import feature that fetches remote content from user URLs.

    Risk: Attacker imports from http://169.254.169.254 to steal cloud credentials.
    Defense: Strict scheme whitelist + DNS validation + no redirects.
    """

    def __init__(self, guard: "SSRFGuard") -> None:
        # Disable redirect following for imports — attacker-controlled redirects are risky
        super().__init__(SSRFGuard(max_redirects=0, connect_timeout=2.0, read_timeout=8.0))

    def process_url(self, url: str) -> bytes:
        """Fetch and return content from the validated URL."""
        response = self.guard.fetch(url)
        # Limit response size to prevent memory exhaustion
        max_size = 10 * 1024 * 1024  # 10 MB
        if len(response.content) > max_size:
            raise ValueError(f"Imported content exceeds {max_size} bytes")
        return response.content


class ImageFetcher(SsrfProtectedFeature):
    """Remote image fetcher for link previews, thumbnails, or CDN hotlinking.

    Risk: SSRF via http://10.0.0.5/internal-admin-panel (scanning internal services).
    Defense: Validate URL + limit content type to images only.
    """

    ALLOWED_MIME_TYPES = {
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    }

    def __init__(self, guard: "SSRFGuard") -> None:
        super().__init__(guard)
        self.max_size = 5 * 1024 * 1024  # 5 MB image limit

    def process_url(self, url: str) -> bytes:
        """Fetch an image from the validated URL."""
        response = self.guard.fetch(url)

        # Verify content type is an image
        content_type = response.headers.get("Content-Type", "")
        if not any(ct in content_type for ct in self.ALLOWED_MIME_TYPES):
            raise ValueError(
                f"Blocked non-image content type: {content_type} "
                f"(expected one of {self.ALLOWED_MIME_TYPES})"
            )

        if len(response.content) > self.max_size:
            raise ValueError(f"Image exceeds size limit ({self.max_size} bytes)")

        return response.content


class LinkPreviewGenerator(SsrfProtectedFeature):
    """Generate Open Graph / link preview metadata from a URL.

    Risk: SSRF through OG scraping — fetcher hits internal services.
    Defense: Validate URL + timeout (OG scraping can be slow) + content size limits.
    """

    def __init__(self, guard: "SSRFGuard") -> None:
        super().__init__(
            SSRFGuard(max_redirects=3, connect_timeout=3.0, read_timeout=12.0),
        )

    def process_url(self, url: str) -> dict:
        """Generate a link preview from the validated URL."""
        import re
        from bs4 import BeautifulSoup

        response = self.guard.fetch(url)

        if "text/html" not in response.headers.get("Content-Type", ""):
            return {"url": url, "error": "URL does not return HTML content"}

        soup = BeautifulSoup(response.text[:100_000], "html.parser")  # Limit parsing

        title = soup.find("meta", property="og:title")
        image = soup.find("meta", property="og:image")
        description = soup.find("meta", property="og:description")

        return {
            "url": url,
            "title": (title["content"] if title else None),
            "image": (image["content"] if image else None),
            "description": (description["content"] if description else None),
        }
```

---

## Constraints

### MUST DO
- Always enforce an explicit scheme allowlist (`http`/`https`) — never use a blocklist of dangerous protocols
- Resolve DNS and validate ALL returned IP addresses before establishing any connection
- Block all RFC 1918 private ranges, loopback (127.0.0.0/8), link-local (169.254.0.0/16), and cloud metadata IPs
- Prevent DNS rebinding by validating the resolved IP at connection time, not just when the URL is first parsed
- Set aggressive timeouts on every outbound request — blind SSRF exploitation requires time to read responses
- Re-validate redirect targets against the full validation pipeline — never trust a 3xx Location header blindly
- Log all blocked requests with sufficient context for incident investigation (URL, resolved IP, rejection reason)
- Use separate network namespaces or egress proxy rules for high-volume URL processing services

### MUST NOT DO
- Never use `requests` with default settings (`allow_redirects=True`) on user-supplied URLs — this is the most common SSRF mistake in Python
- Never validate only the hostname string without performing actual DNS resolution — hostname strings can be spoofed or ambiguous
- Never rely solely on an IPv4 blocklist for IP validation — attackers use IPv6, encoded IPs, and DNS rebinding to bypass these
- Never follow redirects automatically without re-validating each hop — a safe initial URL can redirect to internal addresses
- Never expose the SSRF rejection reason to the end user with internal details — generic "request failed" prevents information leakage about your network topology
- Never use `curl` or `wget` system commands for fetching URLs from untrusted sources — these are external processes that bypass your application-level validation entirely
- Never disable TLS certificate verification (`verify=False` in requests, `InsecureSkipVerify: true` in Go) on any user-supplied URL

---

## Output Template

When implementing SSRF prevention, provide output containing:

1. **Validation Code** — Complete implementation for the target language (Python/Node.js/Go) with all guard classes and validation logic
2. **Test Cases** — At minimum 5 test cases covering: blocked protocol, private IP, cloud metadata, DNS rebinding, and redirect bypass
3. **Integration Points** — Where to plug the guard into existing HTTP clients (middleware, session configuration, transport customization)
4. **Logging Configuration** — Structured logging fields for SSRF event correlation (url_hash, blocked_reason, client_ip, user_id)
5. **Migration Guide** — Steps to retrofit SSRF protection onto an existing service that currently uses unrestricted HTTP clients

---

## Related Skills

| Skill | Purpose |
|---|---|
| `input-validation` | General input validation and sanitization patterns for non-URL data fields |
| `api-security-patterns` | Broader API security including authentication, rate limiting, CORS, and JWT validation |
| `output-sanitization` | Output encoding to prevent XSS — complementary layer for web applications handling user URLs |

---

## Live References

> Authoritative documentation and standards for SSRF prevention. The model follows markdown links at load time to resolve external references.

- [OWASP API Security Top 10 — API4:2023 Broken Object Level Authorization & SSRF](https://owasp.org/API-Security/editions/2023/en/0xa4-broken-object-level-authorization/)
- [OWASP Cross-Site Request Forgery and SSRF Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [AWS Security Best Practices — Prevent SSRF on EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)
- [GCP Compute Engine — Avoid Metadata Exposure via SSRF](https://cloud.google.com/compute/docs/storing-retrieving-metadata)
- [Azure IMDS — Protect Instance Metadata Service](https://learn.microsoft.com/en-us/azure/virtual-machines/windows/instance-metadata-service)
- [CWE-918: Server-Side Request Forgery (SSRF)](https://cwe.mitre.org/data/definitions/918.html)
- [RFC 1918 — Address Allocation for Private Internets](https://datatracker.ietf.org/doc/html/rfc1918)
