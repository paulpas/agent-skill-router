---




name: websocket-protocol
description: Implements WebSocket protocol-level patterns including frame parsing,
  subprotocol negotiation, permessage-deflate compression, text/binary framing, and
  backpressure management for real-time applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: websocket protocol, frame handling, subprotocol negotiation, permessage-deflate, binary framing, text messages, backpressure, wss:// binary framing
  archetypes:
  - tactical
  - generation
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
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: websocket-server-architecture, websocket-manager, websocket-security, websocket-performance




---




# WebSocket Protocol Implementation Guide

Implements the WebSocket protocol (RFC 6455) at the frame level — parsing frames, negotiating subprotocols, applying compression extensions, managing backpressure, and correctly framing text and binary messages. This skill covers the mechanics beneath the library abstractions so you can build robust real-time communication layers that understand the protocol they speak.

## TL;DR Checklist

- [ ] Parse WebSocket frames according to RFC 6455 — FIN, opcode, mask, payload length
- [ ] Negotiate subprotocols via Sec-WebSocket-Protocol header in HTTP upgrade handshake
- [ ] Implement permessage-deflate for frame compression with configurable window size
- [ ] Distinguish text (opcode 0x1) and binary (opcode 0x2) frames; handle continuation (0x0)
- [ ] Enforce backpressure: pause reads when write buffer exceeds threshold
- [ ] Handle close handshake: send Close frame with status code before TCP FIN

---

## When to Use

Use this skill when:

- Implementing a WebSocket server or client from scratch (not using a high-level library)
- Debugging frame-level issues: corrupted frames, unexpected close codes, masking errors
- Negotiating a custom subprotocol for your application's message format
- Applying frame compression via permessage-deflate to reduce bandwidth
- Managing backpressure in high-throughput WebSocket pipelines
- Building protocol adapters between WebSocket and other transport layers (gRPC, MQTT)

## When NOT to Use

Avoid this skill for:

- Application-level connection management (reconnection, state machines) — use `websocket-manager` instead
- Security hardening of WebSocket endpoints — use `websocket-security` instead
- Simple chat or notification services that can use a framework's built-in WebSocket support without protocol customization

---

## Core Workflow

1. **Parse the HTTP Upgrade Request** — Extract headers needed for the WebSocket handshake: `Upgrade: websocket`, `Connection: Upgrade`, `Sec-WebSocket-Key`, `Sec-WebSocket-Protocol` (optional), `Sec-WebSocket-Extensions` (optional). Validate that the request method is GET and both Upgrade/Connection headers match. **Checkpoint:** The Sec-WebSocket-Key must be a valid 24-byte Base64 string; reject the handshake immediately if malformed.

2. **Negotiate Subprotocol (if requested)** — Parse `Sec-WebSocket-Protocol` header, cross-reference against your server's supported protocols list, and select exactly one match or omit the header entirely (no subprotocol). Echo back your selection in the response `Sec-WebSocket-Protocol` header. **Checkpoint:** If the client requests multiple protocols, you MUST pick exactly one — never echo back all of them.

3. **Negotiate Compression Extension** — Parse `Sec-WebSocket-Extensions` header for `permessage-deflate`. Accept server parameters (`server_no_context_takeover`, `client_no_context_takeover`) and configure your decompressor/compressor accordingly. Respond with your accepted parameters in the handshake response. **Checkpoint:** If `server_no_context_takeover: true` is negotiated, reset the compression dictionary after every frame — this trades CPU for memory safety on shared servers.

4. **Build the HTTP Upgrade Response** — Construct a 101 Switching Protocols response. Compute the accept key by concatenating the client's Sec-WebSocket-Key with the GUID `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, SHA-1 hash it (20 bytes), and Base64 encode the result. Include negotiated headers in the response. **Checkpoint:** The Accept header MUST exactly match the RFC 6455 formula — even one byte off breaks the handshake.

```python
import hashlib
import base64

WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

def compute_accept_key(client_key: str) -> str:
    """Compute the Sec-WebSocket-Accept key per RFC 6455 Section 4.2.2.
    
    Args:
        client_key: The raw Sec-WebSocket-Key from the client handshake request.
        
    Returns:
        Base64-encoded SHA-1 hash of (client_key + GUID).
    """
    if len(client_key) != 24 or not _is_valid_base64(client_key):
        raise ValueError(f"Invalid Sec-WebSocket-Key: {client_key!r}")

    digest = hashlib.sha1(
        (client_key + WEBSOCKET_GUID).encode("ascii")
    ).digest()
    return base64.b64encode(digest).decode("ascii")


def _is_valid_base64(s: str) -> bool:
    """Check if string is valid 24-byte Base64 (RFC 6455 requirement)."""
    try:
        decoded = base64.b64decode(s, validate=True)
        return len(decoded) == 16
    except Exception:
        return False
```

5. **Parse Incoming Frames** — Read bytes in a loop following the WebSocket frame layout:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-------+---------+-+---------------------------+
|F|  RSV1 |R|  RSV2 |RSV3 |opcode |M| Payload len   (7-bit)     |
|i|       |S|       |     |(4 bits)|A|                         |
|N|       |1|       |     |       |S|                           |
|  |       |       |     |       | |                           |
+---------------+-----------------+-----------------------------+

If length == 126, next 2 bytes are big-endian 16-bit uint.
If length == 127, next 8 bytes are big-endian unsigned int.
Mask key is always 4 bytes if MASK bit is set (client->server).
```

**Checkpoint:** Validate that a continuation frame (opcode 0x0) only follows text (0x1), binary (0x2), or close (0x8) frames — never after ping/pong. Reject the connection on protocol violation.

6. **Handle Close Handshake Properly** — When initiating a close, send a Close frame (opcode 0x8) with a 2-byte status code followed by an optional reason string. Wait for the peer's Close frame reply before closing the TCP connection. If you receive a Close frame but have already sent one, respond with your Close frame and close after sending. **Checkpoint:** Status codes must be from the registered list — if receiving an unregistered code, treat it as a protocol error (RFC 6455 §7.4.1).

```python
import struct

# Registered close codes per RFC 6455 Section 7.4.1
CLOSE_NORMAL = 1000
CLOSE_GOING_AWAY = 1001
CLOSE_PROTOCOL_ERROR = 1002
CLOSE_UNSUPPORTED = 1003
CLOSE_ABNORMAL = 1006
CLOSE_INVALID_PAYLOAD = 1007
CLOSE_POLICY_VIOLATION = 1008
CLOSE_TOO_LARGE = 1009
CLOSE_EXTENSION_MISSING = 1010
CLOSE_INTERNAL_ERROR = 1011
CLOSE_SERVICE_RESTART = 1012
CLOSE_TRY_AGAIN_LATER = 1013


def build_close_frame(
    status_code: int,
    reason: str = "",
) -> bytes:
    """Build a WebSocket Close frame per RFC 6455 Section 5.5.
    
    Args:
        status_code: Numeric close code (e.g., CLOSE_NORMAL = 1000).
        reason: Optional UTF-8 reason string (max 123 bytes after the 2-byte code).
        
    Returns:
        Complete WebSocket frame bytes with MASK=0 (server-sent frames are unmasked).
    """
    if status_code not in (
        CLOSE_NORMAL, CLOSE_GOING_AWAY, CLOSE_PROTOCOL_ERROR,
        CLOSE_UNSUPPORTED, CLOSE_INVALID_PAYLOAD, CLOSE_POLICY_VIOLATION,
        CLOSE_TOO_LARGE, CLOSE_EXTENSION_MISSING, CLOSE_INTERNAL_ERROR,
        CLOSE_SERVICE_RESTART, CLOSE_TRY_AGAIN_LATER,
    ):
        raise ValueError(f"Invalid close code: {status_code}")

    reason_bytes = reason.encode("utf-8")
    if len(reason_bytes) > 123:
        reason_bytes = reason_bytes[:123]

    # FIN=1, opcode=0x8 (close), MASK=0 (server sends unmasked frames)
    fin_opcode = 0b1000_1000  # FIN set, close opcode
    payload_len = 2 + len(reason_bytes)

    frame = bytes([fin_opcode, payload_len])
    frame += struct.pack("!H", status_code)  # Big-endian uint16
    frame += reason_bytes

    return frame


def parse_close_frame(payload: bytes) -> tuple[int, str]:
    """Parse a received Close frame's payload.
    
    Args:
        payload: The raw payload of the close frame (first 2 bytes = status code).
        
    Returns:
        Tuple of (status_code, reason_string).
    """
    if len(payload) < 2:
        return CLOSE_ABNORMAL, ""

    status_code = struct.unpack("!H", payload[:2])[0]
    reason = payload[2:].decode("utf-8", errors="replace") if len(payload) > 2 else ""

    return status_code, reason
```

7. **Implement Backpressure Control** — Track the size of the write buffer (queued but not yet sent bytes). Pause incoming reads when the buffer exceeds a threshold; resume when it drops below a lower threshold. This prevents memory exhaustion during fast producers and slow consumers.

```python
import asyncio
from typing import Optional


class WebSocketBackpressure:
    """Manages backpressure for a WebSocket connection to prevent memory exhaustion.
    
    Uses an asymmetric high-water/low-water threshold system: pause reads at
    the high water mark, resume at the low water mark. This prevents ping-pong
    behavior when the buffer hovers near a single threshold.
    """

    def __init__(
        self,
        writer: asyncio.StreamWriter,
        high_water: int = 256_000,   # 256 KB — pause reads here
        low_water: int = 64_000,     # 64 KB — resume reads here
    ) -> None:
        self._writer = writer
        self._high_water = high_water
        self._low_water = low_water
        self._paused = False

    async def send(self, data: bytes) -> None:
        """Send data with backpressure awareness.
        
        This method does NOT block. It delegates to the asyncio StreamWriter
        which handles flow control at the TCP level. The backpressure tracker
        monitors write buffer size to decide when to pause incoming reads.
        """
        self._writer.write(data)

        # Check if we need to pause reads due to buffer buildup
        write_buffer = self._writer.get_write_buffer_size()
        if not self._paused and write_buffer >= self._high_water:
            self._reader_pause()
            self._paused = True

    def _reader_pause(self) -> None:
        """Signal to the reader loop to stop consuming frames."""
        pass  # Reader loop monitors backpressure._paused flag

    def check_resume(self) -> None:
        """Called after writes drain — resume reads if buffer is below low water."""
        write_buffer = self._writer.get_write_buffer_size()
        if self._paused and write_buffer < self._low_water:
            self._reader_resume()
            self._paused = False

    def _reader_resume(self) -> None:
        """Signal to the reader loop to resume consuming frames."""
        pass  # Reader loop checks backpressure._paused flag
```

8. **Implement Text and Binary Framing** — Wrap application payloads in properly formatted WebSocket frames. For large messages that exceed a size threshold, implement fragment framing: send as multiple frames with FIN=0 on all but the last, preserving the original opcode across continuation frames.

```python
MAX_FRAME_SIZE = 16_384  # 16 KB per frame


def build_text_frame(data: str, compress: bool = False) -> bytes:
    """Build a WebSocket text frame (opcode 0x1) from a UTF-8 string."""
    payload = data.encode("utf-8")
    if compress:
        payload = _apply_deflate(payload)
    return _build_single_frame(opcode=0x1, payload=payload, fin=True)


def build_binary_frame(data: bytes, compress: bool = False) -> bytes:
    """Build a WebSocket binary frame (opcode 0x2) from raw bytes."""
    if compress:
        data = _apply_deflate(data)
    return _build_single_frame(opcode=0x2, payload=data, fin=True)


def build_fragmented_text_frame(
    data: str, max_chunk: int = MAX_FRAME_SIZE
) -> list[bytes]:
    """Build a fragmented text message: initial frame + continuation frames.
    
    Args:
        data: The UTF-8 string to fragment.
        max_chunk: Maximum bytes per payload (default 16 KB).
        
    Returns:
        List of frame bytes.
    """
    payload = data.encode("utf-8")
    frames: list[bytes] = []

    for i in range(0, len(payload), max_chunk):
        chunk = payload[i : i + max_chunk]
        is_last = (i + max_chunk >= len(payload))
        opcode = 0x1 if i == 0 else 0x0

        frames.append(_build_single_frame(
            opcode=opcode,
            payload=chunk,
            fin=is_last,
        ))

    return frames


def _build_single_frame(
    opcode: int,
    payload: bytes,
    fin: bool = True,
) -> bytes:
    """Build a single WebSocket frame with MASK=0 (server -> client)."""
    fin_bit = 0x80 if fin else 0x00
    byte1 = fin_bit | opcode

    mask_bit = 0x00  # Server frames are never masked
    payload_len = len(payload)

    if payload_len <= 125:
        byte2 = mask_bit | payload_len
        length_bytes = b""
    elif payload_len <= 65_535:
        byte2 = mask_bit | 126
        length_bytes = struct.pack("!H", payload_len)
    else:
        byte2 = mask_bit | 127
        length_bytes = struct.pack("!Q", payload_len)

    frame = bytes([byte1, byte2]) + length_bytes + payload
    return frame


def _apply_deflate(data: bytes) -> bytes:
    """Apply permessage-deflate compression (RFC 7692)."""
    import zlib
    return zlib.compress(data, level=6, wbits=-15)
```

---

## Implementation Patterns

### Pattern 1: Client-Side Frame Masking

Client-to-server frames MUST be masked per RFC 6455 Section 5.3. The mask is a 4-byte random value XORed over every byte of the payload. This prevents cached-attack vulnerabilities (CRIME/BREACH style) that could leak information from browser contexts.

```python
import os


def mask_payload(payload: bytes, mask_key: bytes) -> bytes:
    """Mask WebSocket frame payload per RFC 6455 Section 5.3.
    
    Args:
        payload: Raw payload bytes to mask.
        mask_key: Exactly 4 random bytes as the masking key.
        
    Returns:
        Masked payload of the same length as the input.
    """
    if len(mask_key) != 4:
        raise ValueError(f"Mask key must be exactly 4 bytes, got {len(mask_key)}")

    masked = bytearray(len(payload))
    for i, byte in enumerate(payload):
        masked[i] = byte ^ mask_key[i % 4]

    return bytes(masked)


def build_client_frame(
    opcode: int,
    payload: bytes,
    compress: bool = False,
) -> bytes:
    """Build a client-to-server WebSocket frame (masked)."""
    final_payload = _apply_deflate(payload) if compress else payload
    mask_key = os.urandom(4)
    masked_data = mask_payload(final_payload, mask_key)

    fin_bit = 0x80
    byte1 = fin_bit | opcode
    payload_len = len(masked_data)

    if payload_len <= 125:
        byte2 = 0x80 | payload_len
        length_bytes = b""
    elif payload_len <= 65_535:
        byte2 = 0x80 | 126
        length_bytes = struct.pack("!H", payload_len)
    else:
        byte2 = 0x80 | 127
        length_bytes = struct.pack("!Q", payload_len)

    return bytes([byte1, byte2]) + length_bytes + masked_data + mask_key


def build_ping_frame(user_data: bytes = b"") -> bytes:
    """Build a client-to-server Ping frame (opcode 0x9)."""
    return build_client_frame(opcode=0x9, payload=user_data)


def build_pong_frame(user_data: bytes = b"") -> bytes:
    """Build a server-to-client Pong frame (opcode 0xA, unmasked)."""
    return _build_single_frame(opcode=0x0A, payload=user_data, fin=True)
```

### Pattern 2: Incremental Frame Parser with Fragmentation

Parse incoming frames in a loop, handling partial reads and protocol errors gracefully. The reader accumulates bytes until a complete frame is available before dispatching to the application layer. Supports fragmented (multi-frame) messages via continuation frames.

```python
import asyncio
from dataclasses import dataclass
from enum import IntEnum
from typing import Callable, Optional


class FrameOpcode(IntEnum):
    CONTINUATION = 0x0
    TEXT = 0x1
    BINARY = 0x2
    CLOSE = 0x8
    PING = 0x9
    PONG = 0xA


@dataclass
class WebSocketFrame:
    """Parsed WebSocket frame with decoded payload."""
    opcode: FrameOpcode
    fin: bool
    compressed: bool
    payload: bytes


class WebSocketFrameParser:
    """Incremental frame parser that handles partial TCP reads.
    
    Accumulates incoming bytes and extracts complete frames as they arrive.
    Maintains state for fragmented (multi-frame) messages.
    """

    def __init__(
        self,
        on_frame: Callable[[WebSocketFrame], None],
        max_message_size: int = 1_048_576,  # 1 MB ceiling
    ) -> None:
        self._on_frame = on_frame
        self._max_message_size = max_message_size
        self._buffer: bytearray = bytearray()
        self._fragments: list[bytes] = []
        self._fragment_opcode: Optional[FrameOpcode] = None

    def feed(self, data: bytes) -> None:
        """Feed incoming bytes into the parser."""
        self._buffer.extend(data)
        while len(self._buffer) >= 2:
            frame, consumed = self._parse_next_frame()
            if frame is None:
                break
            self._process_frame(frame, consumed)

    def _parse_next_frame(self) -> tuple[Optional[WebSocketFrame], int]:
        """Parse the next complete frame from the buffer."""
        if len(self._buffer) < 2:
            return None, 0

        byte1, byte2 = self._buffer[0], self._buffer[1]
        fin = bool(byte1 & 0x80)
        opcode = FrameOpcode(byte1 & 0x0F)
        rsv1 = bool(byte1 & 0x40)
        mask_bit = bool(byte2 & 0x80)
        payload_len = byte2 & 0x7F

        offset = 2

        if payload_len == 126:
            if len(self._buffer) < offset + 2:
                return None, 0
            ext_len = struct.unpack("!H", self._buffer[offset : offset + 2])[0]
            payload_len = ext_len
            offset += 2
        elif payload_len == 127:
            if len(self._buffer) < offset + 8:
                return None, 0
            ext_len = struct.unpack("!Q", self._buffer[offset : offset + 8])[0]
            payload_len = ext_len
            offset += 8

        if mask_bit:
            if len(self._buffer) < offset + 4:
                return None, 0
            mask_key = bytes(self._buffer[offset : offset + 4])
            offset += 4
        else:
            mask_key = b""

        total_frame_size = offset + payload_len
        if len(self._buffer) < total_frame_size:
            return None, 0

        raw_payload = bytes(self._buffer[offset : offset + payload_len])
        consumed = total_frame_size

        if mask_key:
            raw_payload = mask_payload(raw_payload, mask_key)

        frame = WebSocketFrame(
            opcode=opcode,
            fin=fin,
            compressed=rsv1,
            payload=raw_payload,
        )

        return frame, consumed

    def _process_frame(self, frame: WebSocketFrame, consumed: int) -> None:
        """Process a parsed frame, handling fragmentation."""
        del self._buffer[:consumed]

        if frame.opcode in (FrameOpcode.PING, FrameOpcode.PONG, FrameOpcode.CLOSE):
            if not frame.fin:
                raise ProtocolError("Control frames MUST have FIN=1")
            self._on_frame(frame)
            return

        if frame.opcode == FrameOpcode.CONTINUATION:
            if not self._fragments:
                raise ProtocolError("CONTINUATION without initial frame")
            self._fragments.append(frame.payload)
        else:
            if self._fragments:
                self._flush_fragmented_message()
            self._fragment_opcode = frame.opcode
            self._fragments = [frame.payload]

        if frame.fin and self._fragments:
            full_payload = b"".join(self._fragments)
            if len(full_payload) > self._max_message_size:
                raise MessageTooLargeError(
                    f"Message {len(full_payload)} bytes exceeds "
                    f"{self._max_message_size} byte limit"
                )

            decoded = WebSocketFrame(
                opcode=self._fragment_opcode,
                fin=True,
                compressed=False,
                payload=full_payload,
            )
            self._on_frame(decoded)
            self._fragments = []
            self._fragment_opcode = None

    def _flush_fragmented_message(self) -> None:
        """Dispatch accumulated fragments as a complete message."""
        if not self._fragments or not self._fragment_opcode:
            return
        full_payload = b"".join(self._fragments)
        self._on_frame(WebSocketFrame(
            opcode=self._fragment_opcode,
            fin=True,
            compressed=False,
            payload=full_payload,
        ))
        self._fragments = []
        self._fragment_opcode = None


class ProtocolError(Exception):
    """Raised when a received frame violates the WebSocket protocol."""
    pass


class MessageTooLargeError(Exception):
    """Raised when a message exceeds the configured maximum size."""
    pass
```

### Pattern 3: Subprotocol Negotiation (BAD vs. GOOD)

Demonstrates correct and incorrect subprotocol negotiation during the HTTP upgrade handshake.

```python
# ❌ BAD: Accepting all requested protocols or no validation
def bad_negotiate_subprotocol(
    client_protocols: list[str],
    server_supported: list[str],
) -> str:
    """Never do this — echo back everything the client asked for."""
    return ", ".join(client_protocols)  # Violates RFC 6455 §1.9

# ❌ BAD: Omitting Sec-WebSocket-Protocol header when one was requested
def bad_negotiate_no_header(
    client_protocols: list[str],
    server_supported: list[str],
) -> dict:
    """Never do this — no response header even when there's a match."""
    for cp in client_protocols:
        if cp in server_supported:
            pass  # Match found but no header echoed!
    return {}

# ✅ GOOD: Exactly one match, or none — RFC-compliant
def negotiate_subprotocol(
    client_protocols: list[str],
    server_supported: list[str],
) -> Optional[str]:
    """Negotiate exactly one subprotocol per RFC 6455 Section 1.9.
    
    Args:
        client_protocols: Protocols from the client's
                         Sec-WebSocket-Protocol header.
        server_supported: Protocols this server supports.
        
    Returns:
        Exactly one protocol name if matched, None if no match.
    """
    supported_set = set(server_supported)
    
    for requested in client_protocols:
        if requested.strip() in supported_set:
            return requested.strip()
    
    return None


def build_handshake_response(
    client_key: str,
    negotiated_protocol: Optional[str] = None,
    negotiated_extensions: Optional[dict] = None,
) -> bytes:
    """Build the complete 101 Switching Protocols HTTP response.
    
    Args:
        client_key: The Sec-WebSocket-Key from the client request.
        negotiated_protocol: Result of negotiate_subprotocol(), or None.
        negotiated_extensions: Dict of accepted permessage-deflate params, or None.
        
    Returns:
        Complete HTTP 101 response bytes.
    """
    accept_key = compute_accept_key(client_key)

    headers = [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        f"Sec-WebSocket-Accept: {accept_key}",
    ]

    if negotiated_protocol:
        headers.append(f"Sec-WebSocket-Protocol: {negotiated_protocol}")

    if negotiated_extensions:
        params = []
        for key, value in negotiated_extensions.items():
            if value is True:
                params.append(key)
            else:
                params.append(f"{key}={value}")
        headers.append(f"Sec-WebSocket-Extensions: {', '.join(params)}")

    headers.append("\r\n")
    return ("\r\n".join(headers)).encode("ascii")
```

---

## Constraints

### MUST DO
- Always compute the SHA-1 accept key per RFC 6455 Section 4.2.2 — never hardcode or skip this
- Mask all client-to-server frames with a 4-byte random key (RFC 6455 Section 5.3)
- Never send masked frames from server to client — this is a protocol error
- Enforce max message size before accumulating fragments — prevent memory exhaustion
- Implement asymmetric backpressure thresholds (high-water pause, low-water resume)
- Use close status code 1000 (normal closure) for graceful disconnects
- Wait for the peer's Close frame reply before closing the TCP connection

### MUST NOT DO
- Accept a subprotocol that is not in your server's supported list — this breaks the handshake semantics
- Send a continuation frame (opcode 0x0) as the first frame of a message — it must follow an initial opcode
- Use magic numbers for close codes — reference the registered codes from RFC 6455 Section 7.4.1
- Allow unbounded payload sizes in permessage-deflate without checking negotiated window size
- Ignore RSV bits during parsing — if any RSV bit is set and no extension negotiated, the connection MUST fail
- Close the TCP socket abruptly without sending a Close frame first — this forces status code 1006 (abnormal)

---

## Output Template

When implementing or auditing WebSocket protocol-level code, produce:

1. **Handshake Validation** — Confirm the upgrade request headers are parsed and validated (Upgrade, Connection, Sec-WebSocket-Key format)
2. **Negotiation Results** — List of selected subprotocol (or None) and accepted compression parameters
3. **Frame Parser Design** — Description of how partial reads are buffered and complete frames are extracted
4. **Backpressure Configuration** — High-water and low-water thresholds with rationale for the values chosen
5. **Close Handling Flow** — The sequence of Close frame exchange before TCP teardown

---

## Related Skills

| Skill | Purpose |
|---|---|
| `websocket-manager` | Connection state machine, reconnection with exponential backoff, message routing |
| `websocket-security` | Origin validation, authentication over WebSocket, rate limiting, attack prevention |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [RFC 6455 — The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455/) — Complete IETF specification covering handshake, framing, close sequences, opcodes, and extended payload lengths
- [MDN Web Docs — WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) — Browser-native WebSocket client API reference with connection lifecycle events (onopen, onmessage, onclose, onerror)
- [Node.js tls.createServer Example](https://nodejs.org/api/tls.html#tlscreateserveroptions-secureconnectionlistener) — Secure WebSocket (wss://) server setup with TLS certificate configuration
- [Python websockets RFC 6455 Reference Implementation](https://websockets.readthedocs.io/en/stable/intro.html) — Full RFC 6455 compliant implementation covering subprotocol negotiation, permessage-deflate compression, and backpressure
- [Cloudflare WebSocket Architecture Guide](https://www.cloudflare.com/learning/network-layer/websocket-tcp/) — How WebSockets operate over TCP including reverse proxy configuration at Cloudflare edge
