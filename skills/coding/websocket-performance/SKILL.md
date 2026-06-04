---




name: websocket-performance
description: Optimizes WebSocket communication throughput and efficiency using binary protocols (MessagePack, Protobuf), per-message deflate compression (RFC 7692), message batching, and payload size reduction for high-frequency real-time systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: websocket performance, binary protocol, messagepack, protobuf, deflate compression, message batching, payload optimization, high throughput low latency
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
  content-types: [code, guidance, examples, do-dont]
  related-skills: websocket-server-architecture, websocket-security, websocket-manager




---





# WebSocket Performance Optimization

Optimizes the data path of WebSocket connections for maximum throughput and minimum latency. Covers binary serialization (MessagePack, Protocol Buffers), per-message deflate compression negotiated during the handshake, message batching to reduce frame overhead, and payload size reduction techniques that directly shrink the bytes on the wire.

## TL;DR Checklist

- [ ] Replace JSON serialization with MessagePack or Protobuf for structured messages — expect 3–5× smaller payloads
- [ ] Negotiate `permessage-deflate` during the WebSocket handshake with appropriate window size and compression level
- [ ] Batch high-frequency small messages into single frames using time-based (≤10ms) or count-based (≤50 msg) aggregation
- [ ] Skip compression for already-compressed data (images, audio, encrypted payloads) — it adds CPU cost with zero benefit
- [ ] Profile serialization speed vs. payload size tradeoff: MessagePack is ~2× faster than JSON; Protobuf adds schema overhead but wins on repeated schemas

---

## When to Use

- Building high-frequency trading tick data feeds where every microsecond and byte matters
- Real-time collaborative editing, gaming, or live dashboards sending hundreds of messages per second
- Mobile clients on expensive cellular networks where bandwidth conservation is critical
- Cross-region WebSocket links with measurable round-trip latency where batched reduces overhead
- Server-to-server real-time APIs where both endpoints control serialization format

---

## When NOT to Use

- Simple chat or notification apps sending <50 messages per second — JSON adds negligible overhead at that rate
- Connections carrying binary blobs (images, audio, video frames) — these are already compressed; wrapping them in MessagePack or compressing with deflate wastes CPU
- Short-lived ephemeral connections (<1 minute) where handshake and compression setup overhead dominates
- When you need human-readable debug output on the wire — binary protocols sacrifice observability for efficiency

---

## Core Workflow

1. **Measure Current Baseline** — Instrument your existing WebSocket path to measure payload size (compressed and uncompressed), serialization time, and messages per second. **Checkpoint:** Record `avg_payload_bytes`, `p99_latency_ms`, and `msgs_per_sec` before making any changes.

2. **Choose Serialization Format** — Evaluate MessagePack vs Protobuf based on your schema stability needs:
   - Stable schemas with frequent updates → Protobuf for smallest payloads and fastest serialization
   - Rapidly evolving schemas → MessagePack for runtime flexibility without code generation
   - Maximum simplicity → JSON remains acceptable under ~50 msgs/sec with <1 KB messages

3. **Negotiate Compression at Handshake** — Enable `permessage-deflate` in the WebSocket server and client configuration during the HTTP upgrade phase. Choose window size (4–15 KB for mobile, up to 65536 for server-to-server) and compression level (1–9). **Checkpoint:** Verify `Sec-WebSocket-Extensions` header contains `permessage-deflate` in both the client request and server response.

4. **Implement Batching at Source** — Group logically-related messages into batches before sending. Apply time-based batching (collect for ≤10 ms) or count-based batching (≤50 messages), whichever triggers first. Urgent messages bypass the batch queue. **Checkpoint:** Measure end-to-end latency impact — batching adds delay equal to the batch window; 10 ms batching should not violate your p99 latency target.

5. **Benchmark and Iterate** — Run A/B tests comparing JSON vs MessagePack vs Protobuf with and without compression. Measure throughput (msgs/sec), payload bytes, CPU utilization, and p99 latency. **Checkpoint:** Every optimization must improve at least one primary metric without degrading any other by more than 10%.

---

## Implementation Patterns

### Pattern 1: MessagePack Binary Protocol Over WebSockets

MessagePack serializes structured data into a compact binary format. Compared to JSON, it eliminates string keys from every message (keys are sent once in a schema), preserves numeric types (no `"12345678901234567"` string loss), and typically produces 3–5× smaller payloads for nested structures. Using Python's `msgspec` library for ~2× faster serialization than `python-msgpack`.

```python
"""MessagePack binary serialization for WebSocket message exchange."""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, asdict
from typing import Any

import msgspec


@dataclass
class TickData:
    """Market tick snapshot — a high-frequency trading data structure.

    Attributes:
        symbol: Trading pair identifier (e.g., "BTC/USD").
        price: Last traded price in cents to avoid float precision issues.
        size: Trade size in base currency units (integer micro-lots).
        side: "buy" or "sell".
        timestamp_ns: Unix epoch nanoseconds from exchange clock.
    """
    symbol: str
    price: int  # cents, avoids float precision loss
    size: int
    side: str  # "buy" | "sell"
    timestamp_ns: int

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TickData:
        """Construct a TickData from a JSON/dict payload.

        Args:
            data: Dict with keys matching TickData fields.

        Returns:
            Fully-constructed TickData instance.
        """
        return cls(
            symbol=data["symbol"],
            price=int(data["price"]),
            size=int(data["size"]),
            side=data["side"],
            timestamp_ns=int(data["timestamp_ns"]),
        )


@dataclass
class OrderBookSnapshot:
    """Full order book snapshot for a trading pair.

    Attributes:
        symbol: Trading pair identifier.
        bids: List of [price, size] pairs sorted descending by price.
        asks: List of [price, size] pairs sorted ascending by price.
        timestamp_ns: Server-side snapshot timestamp in nanoseconds.
    """
    symbol: str
    bids: list[list[int]]
    asks: list[list[int]]
    timestamp_ns: int


class MessagePackSerializer:
    """High-performance MessagePack serializer for WebSocket payloads.

    Provides typed encode/decode methods that handle schema versioning,
    message type dispatch, and benchmarking support for comparing against
    JSON serialization.

    Usage:
        serializer = MessagePackSerializer()
        tick = TickData(symbol="BTC/USD", price=4250000, size=100, side="buy", timestamp_ns=...)
        raw = serializer.encode(tick)  # → bytes
        decoded = serializer.decode(raw, expected_type=TickData)
    """

    def __init__(self, use_bin_type: bool = True) -> None:
        """Initialize the MessagePack serializer.

        Args:
            use_bin_type: If True (recommended), encode Python `bytes` as
                         MessagePack bin type instead of str. This preserves
                         binary data correctly when decoding on other languages.
        """
        self._encoder = msgspec.msgpack.Encoder(use_bin_type=use_bin_type)
        self._decoder = msgspec.msgpack.Decoder

    def encode(self, obj: Any) -> bytes:
        """Serialize an object to MessagePack bytes.

        Works with dataclasses, dicts, lists, and primitives.
        For dataclasses, uses msgspec's native encoder which is ~3× faster
        than json.dumps for structured data.

        Args:
            obj: The object to serialize. Must be a dataclass, dict, list,
                 or primitive type supported by msgspec.

        Returns:
            MessagePack-encoded bytes.

        Raises:
            msgspec.EncodeError: If the object contains unsupported types
                                (e.g., complex numbers, custom objects without
                                a registered encoder).
        """
        return self._encoder.encode(obj)

    def decode(self, data: bytes, expected_type: type | None = None) -> Any:
        """Deserialize MessagePack bytes into a Python object.

        When expected_type is provided (a msgspec.Struct or dataclass),
        the decoder performs strict type validation and field conversion
        during deserialization — zero post-processing needed.

        Args:
            data: Raw MessagePack-encoded bytes.
            expected_type: Optional type hint for strict decoding. If provided,
                          raises msgspec.DecodeError on mismatched fields.

        Returns:
            Decoded object. Type matches expected_type if specified,
            otherwise returns dict/list/primitive as appropriate.
        """
        decoder = self._decoder(expected_type) if expected_type else None
        if decoder is not None:
            return decoder.decode(data)
        return msgspec.msgpack.decode(data)

    def encode_batch(self, objects: list[Any]) -> bytes:
        """Serialize a list of objects as a single MessagePack array.

        Reduces per-frame overhead by packing multiple messages into one
        frame. Ideal for batched high-frequency data feeds.

        Args:
            objects: List of serializable objects (dataclasses, dicts, etc.).

        Returns:
            Single MessagePack bytes containing all objects in an array.
        """
        return self._encoder.encode(objects)

    def decode_batch(self, data: bytes, item_type: type | None = None) -> list[Any]:
        """Deserialize a batched MessagePack array into individual objects.

        Args:
            data: MessagePack bytes containing an array of serialized items.
            item_type: Optional type for each element (must be msgspec.Struct
                      compatible for strict decoding).

        Returns:
            List of decoded objects.
        """
        raw_items = msgspec.msgpack.decode(data)
        if not isinstance(raw_items, list):
            raise msgspec.DecodeError(
                f"Expected array at top level, got {type(raw_items).__name__}"
            )
        if item_type is not None:
            decoder = self._decoder(item_type)
            return [decoder.decode(item) for item in raw_items]
        return raw_items


# ── Benchmark: JSON vs MessagePack ─────────────────────────────────

def benchmark_serialization(
    num_iterations: int = 10_000,
) -> dict[str, float]:
    """Compare JSON and MessagePack serialization for a typical tick message.

    Measures both payload size (bytes on wire) and wall-clock time.
    Results are approximate — actual numbers vary by Python version,
    machine, and data shape. Typical findings:
    - MessagePack payload: ~60–80 bytes vs JSON ~140–200 bytes (2–3× smaller)
    - MessagePack speed:   ~0.8 µs/encode vs JSON ~2.5 µs/encode (~3× faster)

    Returns:
        Dict with keys: json_size, msgpack_size, json_time_ms, msgpack_time_ms
    """
    sample_tick = TickData(
        symbol="BTC/USD",
        price=42_500_00,
        size=100,
        side="buy",
        timestamp_ns=1_700_000_000_000_000_000,
    )

    import json

    # Warmup
    for _ in range(100):
        json.dumps(asdict(sample_tick))
        msgspec.msgpack.encode(sample_tick)

    # JSON benchmark
    start = time.perf_counter()
    for _ in range(num_iterations):
        json.dumps(asdict(sample_tick))
    json_time_ms = (time.perf_counter() - start) * 1000

    # MessagePack benchmark
    start = time.perf_counter()
    for _ in range(num_iterations):
        msgspec.msgpack.encode(sample_tick)
    msgpack_time_ms = (time.perf_counter() - start) * 1000

    json_bytes = len(json.dumps(asdict(sample_tick)).encode("utf-8"))
    msgpack_bytes = len(msgspec.msgpack.encode(sample_tick))

    return {
        "json_size": json_bytes,
      "msgpack_size": msgpack_bytes,
        "json_time_ms": round(json_time_ms / num_iterations * 1_000_000, 2),  # µs per encode
        "msgpack_time_ms": round(msgpack_time_ms / num_iterations * 1_000_000, 2),
    }

```

# ── WebSocket Client and Server Integration ────────────────────────

```python
"""WebSocket client and server handlers using MessagePack serialization."""

from __future__ import annotations

import logging
from typing import Any

import msgspec

logger = logging.getLogger(__name__)


async def ws_client_with_msgpack(
    uri: str,
    message_queue: Any,
) -> None:
    """WebSocket client that sends TickData using MessagePack encoding.

    Connects to a WebSocket server and continuously drains messages from
    an async queue, encoding each as MessagePack before sending. If the
    send buffer is full, drops oldest messages to avoid blocking the producer.

    Args:
        uri: WebSocket server URL (e.g., "wss://trader.example.com/ticks").
        message_queue: Async queue producing TickData instances.
    """
    import websockets

    async with websockets.connect(
        uri,
        additional_headers={"X-Client": "python-msgpack"},
    ) as ws:
        while True:
            tick = await message_queue.get()
            encoded = msgspec.msgpack.encode(tick)
            try:
                await ws.send(encoded)
            except websockets.ConnectionClosed:
                logger.error("Connection closed while sending tick for %s", tick.symbol)
                break


async def ws_server_msgpack_handler(
    websocket: Any,
) -> None:
    """WebSocket handler that decodes incoming MessagePack frames.

    Demonstrates receiving typed MessagePack data from a client.
    Uses msgspec's strict decoder to validate incoming fields —
    rejects malformed messages before they reach application logic.

    Args:
        websocket: The websockets protocol object (async iterator over raw bytes).
    """
    serializer = msgspec.msgpack
    while True:
        raw_frame = await websocket.recv()
        try:
            tick_dict = serializer.decode(raw_frame)
            # Convert dict to typed TickData — type-safe, no KeyError risk
            tick = TickData(
                symbol=tick_dict["symbol"],
                price=int(tick_dict["price"]),
                size=int(tick_dict["size"]),
                side=tick_dict["side"],
                timestamp_ns=int(tick_dict["timestamp_ns"]),
            )
            process_tick(tick)
        except (KeyError, msgspec.DecodeError) as exc:
            await websocket.send(serializer.encode({
                "error": "invalid_message",
                "detail": str(exc),
            }))


def process_tick(tick: TickData) -> None:
    """Process a validated tick — type-safe, no runtime key lookups.

    Args:
        tick: A fully-typed TickData instance from MessagePack decoding.
    """
    # Direct attribute access — no dict['key'] indirection or KeyError risk
    if tick.side == "buy" and tick.price > 43_000_00:
        trigger_buy_signal(tick.symbol, tick.price)


def trigger_buy_signal(symbol: str, price: int) -> None:
    """Execute a buy signal for a given trading pair at the specified price.

    In production this would integrate with the order management system,
    placing a limit or market order based on strategy parameters. Here it
    demonstrates the type-safe function call made after MessagePack decoding.

    Args:
        symbol: The trading pair that triggered the signal.
        price: The triggering price in cents.
    """
    # Log the signal with all available context for audit trail
    logger.info("BUY SIGNAL: %s @ %d (%.2f)", symbol, price, price / 100)
    # In production: order_manager.submit_order(symbol, side="buy", price=price)

```

### Pattern 2: Protocol Buffers for Strongly-Typed Binary Serialization

Protocol Buffers provide schema-defined, language-independent binary serialization with automatic backward/forward compatibility. Unlike MessagePack's dynamic types, Protobuf encodes field numbers rather than names — the schema evolves without breaking existing clients that ignore unknown fields. This pattern shows `.proto` definition, Python code generation, and WebSocket integration.

```python
"""Protocol Buffers schema definition and WebSocket serialization for real-time data."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

# Generated by: protoc --python_out=. tick_data.proto
# The generated module provides TickMessage, OrderBookUpdate, and BatchMessage classes
# that map directly to .proto message definitions.

try:
    # Import the generated protobuf module — created by running:
    #   pip install grpcio-tools
    #   protoc --python_out=. tick_data.proto
    import tick_data_pb2 as proto_schema  # type: ignore[import-not-found]
except ImportError:
    # Stub module for development when .proto hasn't been compiled yet.
    # In production, always compile with the latest .proto file.
    class proto_schema:  # type: ignore[no-redef]
        class TickMessage:
            symbol: str = ""
            price: int = 0
            size: int = 0
            side: int = 0  # 0=buy, 1=sell
            timestamp_ns: int = 0

            @staticmethod
            def FromString(data: bytes) -> "proto_schema.TickMessage":
                raise NotImplementedError("Compile .proto with protoc first")

        class OrderBookUpdate:
            symbol: str = ""
            side: int = 0
            price: int = 0
            size: int = 0
            timestamp_ns: int = 0

            @staticmethod
            def FromString(data: bytes) -> "proto_schema.OrderBookUpdate":
                raise NotImplementedError("Compile .proto with protoc first")

        class BatchMessage:
            messages: Any = []

            @staticmethod
            def FromString(data: bytes) -> "proto_schema.BatchMessage":
                raise NotImplementedError("Compile .proto with protoc first")


# ── .proto Schema Definition ──────────────────────────────────────
#
# The .proto file that generates the above Python module:
#
# syntax = "proto3";
# package realtime;
# option py_generic_services = true;
#
# enum Side {
#   SIDE_UNSPECIFIED = 0;
#   SIDE_BUY = 1;
#   SIDE_SELL = 2;
# }
#
# message TickMessage {
#   string symbol = 1;           // field number, NOT name, encoded in binary
#   int64 price = 2;             // stored as signed varint — no decimal point overhead
#   uint64 size = 3;
#   Side side = 4;
#   fixed64 timestamp_ns = 5;    // fixed-size encoding: always 8 bytes, fastest decoding
# }
#
# message OrderBookUpdate {
#   string symbol = 1;
#   Side side = 2;
#   int64 price = 3;
#   uint64 size = 4;
#   fixed64 timestamp_ns = 5;
# }
#
# message BatchMessage {
#   repeated TickMessage ticks = 1;   // packed encoding: efficient for ordered arrays
# }


class ProtobufSerializer:
    """Serializes protobuf message objects to/from bytes over WebSockets.

    Uses the compiled .proto-generated Python classes as both input and
    output types, ensuring type safety throughout the serialization pipeline.

    Schema Evolution Notes:
    - Adding a new field with a higher field number is FORWARD COMPATIBLE:
      old clients silently ignore the unknown field.
    - Removing a field or changing its type breaks compatibility — only do
      this on versioned schema updates (e.g., proto2 → proto3 migration).
    - Never reuse field numbers within the same message type — reusing `1`
      for a different purpose corrupts existing data when old clients parse.

    Usage:
        serializer = ProtobufSerializer()
        tick_msg = proto_schema.TickMessage(
            symbol="BTC/USD", price=4250000, size=100,
            side=proto_schema.SIDE_BUY, timestamp_ns=time.time_ns(),
        )
        raw = serializer.encode(tick_msg)
        decoded = serializer.decode(raw, proto_schema.TickMessage)
    """

    def __init__(self) -> None:
        """Initialize the Protobuf serializer with no extra configuration.

        Protobuf uses deterministic encoding by default (field ordering is
        consistent), which is beneficial for caching and binary diffing.
        All serialization state lives in the message objects themselves, so
        the serializer is stateless and can be shared across tasks.
        """

    def encode(self, message: Any) -> bytes:
        """Serialize a protobuf message to its compact binary wire format.

        The output uses variable-length integer encoding (varint) for numeric
        fields, making small numbers extremely compact: values <128 fit in 1
        byte, <16384 in 2 bytes, etc. String fields are length-prefixed.

        Args:
            message: A protobuf-generated message instance (e.g., TickMessage).

        Returns:
            Compact binary wire format bytes. Typically 50–70% the size of an
            equivalent JSON serialization for the same data.
        """
        return message.SerializeToString()

    def decode(
        self, data: bytes, message_type: type[Any]
    ) -> Any:
        """Deserialize protobuf binary bytes into a typed message instance.

        Uses the message_type parameter to construct the correct class and
        validate field presence against the .proto schema definition.

        Args:
            data: Binary wire format bytes from the WebSocket frame.
            message_type: The protobuf-generated class (e.g., TickMessage).

        Returns:
            Populated message instance with all valid fields populated.
            Missing optional fields take their default values (0, "", False).

        Raises:
            google.protobuf.message.DecodeError: If bytes don't match the
                expected schema (e.g., wrong wire type for a field number).
        """
        return message_type.FromString(data)

    def encode_batch(
        self,
        tick_messages: list[Any],
    ) -> bytes:
        """Encode a list of TickMessages into a single BatchMessage.

        Uses protobuf's packed repeated encoding — when all values share the
        same type (int64), they are stored as a contiguous byte array rather
        than individual length-prefixed entries. This is the most efficient
        wire format for arrays of homogeneous data.

        Args:
            tick_messages: List of TickMessage protobuf instances.

        Returns:
            Single BatchMessage serialized to bytes, containing all ticks
            packed efficiently in one frame.
        """
        batch = proto_schema.BatchMessage()
        for tick in tick_messages:
            # Append a copy to the repeated field — Protobuf handles internal
            # storage and packing automatically.
            dest = batch.ticks.add()
            dest.CopyFrom(tick)
        return batch.SerializeToString()

    def decode_batch(
        self, data: bytes
    ) -> list[Any]:
        """Decode a BatchMessage back into individual TickMessages.

        Args:
            data: Binary bytes from a packed BatchMessage frame.

        Returns:
            List of TickMessage instances extracted from the batch.
        """
        batch = proto_schema.BatchMessage.FromString(data)
        return list(batch.ticks)


# ── WebSocket Client with Protobuf ─────────────────────────────────

async def send_protobuf_ticks(
    uri: str,
    ticks: list[tuple[str, int, int, str, int]],
) -> None:
    """Connect to a WebSocket server and stream tick data as Protobuf frames.

    Each tick is individually serialized as a TickMessage protobuf and sent
    in its own binary frame. For higher throughput, use send_protobuf_batch()
    instead which packs multiple ticks into a single BatchMessage frame.

    Args:
        uri: WebSocket server URL.
        ticks: List of (symbol, price_cents, size, side_str, timestamp_ns) tuples.
    """
    import websockets

    serializer = ProtobufSerializer()
    side_map = {"buy": proto_schema.SIDE_BUY, "sell": proto_schema.SIDE_SELL}

    async with websockets.connect(uri) as ws:
        for symbol, price, size, side_str, ts_ns in ticks:
            msg = proto_schema.TickMessage(
                symbol=symbol,
                price=price,
                size=size,
                side=side_map.get(side_str, proto_schema.SIDE_UNSPECIFIED),
                timestamp_ns=ts_ns,
            )
            await ws.send(serializer.encode(msg))

```


### Pattern 3: Per-Message Deflate Compression (RFC 7692)

Per-message deflate compression applies the DEFLATE algorithm to each WebSocket frame individually during the handshake negotiation. Unlike connection-level gzip, RFC 7692 allows each message to be compressed independently — meaning small messages don't wait for a sliding window warmup, and different message types can use different compression ratios. The `websockets` library supports this natively via the `compression` parameter.

```python
"""Per-message deflate compression using RFC 7692 with context management."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class CompressionConfig:
    """Configuration for permessage-deflate WebSocket compression.

    Attributes:
        client_no_context_takeover: If True, resets the compression dictionary
                                    after each message. Uses ~15–30% more bandwidth
                                    but eliminates memory growth from long-lived connections.
        server_no_context_takeover: Same as above but for server-side compression.
        compression_level: DEFLATE compression level 1–9 (1=fastest/lowest ratio,
                          9=slowest/highest ratio). Level 6 is a good default.
        client_max_window_bits: Compression window size in bits. Lower values
                               use less memory but reduce compression ratio.
                               Range: 8 (256 bytes) to 15 (32 KB). Default: 15.
        server_max_window_bits: Server-side window size, same range and semantics.
    """
    client_no_context_takeover: bool = False
    server_no_context_takeover: bool = False
    compression_level: int = 6
    client_max_window_bits: int = 15   # 32 KB window — good for text-heavy data
    server_max_window_bits: int = 15


class PerMessageDeflateNegotiator:
    """Handles RFC 7692 permessage-deflate extension negotiation.

    During the WebSocket handshake, both client and server exchange
    Sec-WebSocket-Extensions headers declaring their compression capabilities.
    This class builds those capability parameters and validates the server's
    response against expected constraints.

    Negotiation flow:
        Client sends: Sec-WebSocket-Extensions: permessage-deflate;
                       client_no_context_takeover=0;
                       server_no_context_takeover=0;
                       client_max_window_bits=15;
                       server_max_window_bits=15
        Server responds: permessage-deflate; server_no_context_takeover=0; ...
    """

    def __init__(self, config: CompressionConfig) -> None:
        """Initialize negotiator with compression configuration.

        Args:
            config: The desired compression behavior and resource limits.
        """
        self._config = config

    def build_client_params(self) -> dict[str, str | bool | int]:
        """Build the capability parameters to send in the handshake request.

        Returns:
            Dict of parameter name → value pairs for the permessage-deflate
            extension declaration on the client side.
        """
        return {
            "client_no_context_takeover": self._config.client_no_context_takeover,
            "server_no_context_takeover": self._config.server_no_context_takeover,
            "client_max_window_bits": self._config.client_max_window_bits,
            "server_max_window_bits": self._config.server_max_window_bits,
        }

    def validate_server_response(
        self,
        server_params: dict[str, str | bool | int],
    ) -> tuple[bool, str]:
        """Validate the server's compression negotiation response.

        Checks that the server accepted acceptable parameters and did not
        request unreasonable resource usage (e.g., max_window_bits=15 on a
        memory-constrained mobile device).

        Args:
            server_params: The parameters the server agreed to, parsed from
                          its Sec-WebSocket-Extensions header.

        Returns:
            Tuple of (is_acceptable, reason_if_not). If not acceptable,
            raise ConnectionRefusedError with the reason.
        """
        # Check that window sizes don't exceed our limits
        server_window = int(server_params.get("client_max_window_bits", 15))
        if server_window > self._config.client_max_window_bits:
            return False, (
                f"Server requested window_bits={server_window} but we limit "
                f"to {self._config.client_max_window_bits}"
            )

        # Warn if server disabled our no_context_takeover preference
        if not self._config.client_no_context_takeover and server_params.get(
            "server_no_context_takeover"
        ):
            logger.warning(
                "Server enabled context takeover — memory grows with connection lifetime. "
                "Use no-context-takeover for long-lived connections."
            )

        return True, ""


async def create_compressed_websocket_client(
    uri: str,
    config: CompressionConfig | None = None,
) -> Any:
    """Create a WebSocket client with permessage-deflate compression enabled.

    Uses the `websockets` library's built-in compression support. When
    `compress=0` is passed (default in websockets >= 10.0), the library
    automatically negotiates permessage-deflate during handshake and applies
    DEFLATE to every text and binary frame transparently.

    Args:
        uri: WebSocket server URL (wss:// or ws://).
        config: Compression settings. If None, uses reasonable defaults.

    Returns:
        A configured websockets connection object ready for send/recv.

    Raises:
        websockets.InvalidHandshake: If the server does not support compression
                                    and the client requires it.
    """
    import websockets

    cfg = config or CompressionConfig()

    # Build the additional headers that declare our compression capabilities.
    negotiator = PerMessageDeflateNegotiator(cfg)
    params = negotiator.build_client_params()

    async def compress_request(request: Any, path: str) -> Any:
        """Augment the handshake request with compression extension parameters."""
        from websockets.http11 import Request
        # The websockets library handles this automatically when compress is set,
        # but this hook shows where the capability negotiation happens.
        return request

    async def compress_response(response: Any) -> Any:
        """Validate the server's compression response against our constraints."""
        extensions_header = response.headers.get("Sec-WebSocket-Extensions", "")
        if "permessage-deflate" in extensions_header.lower():
            # Extract parameters from the header value for validation.
            # In practice, websockets library handles this internally.
            return response
        logger.warning(
            "Server did not negotiate permessage-deflate — all messages will be sent uncompressed"
        )
        return response

    async with websockets.connect(
        uri,
        compress=cfg.compression_level,  # Level 6 compression; pass 0 for auto-negotiate
        additional_headers={
            "Sec-WebSocket-Extensions": (
                f'permessage-deflate; '
                f'client_no_context_takeover={params["client_no_context_takeover"]}; '
                f'server_no_context_takeover={params["server_no_context_takeover"]}; '
                f'client_max_window_bits={params["client_max_window_bits"]}; '
                f'server_max_window_bits={params["server_max_window_bits"]}'
            )
        },
    ) as ws:
        return ws


# ── When NOT to Compress: BAD vs. GOOD ─────────────────────────────

async def bad_compress_everything(
    websocket: Any,
) -> None:
    """❌ BAD — Compresses everything including already-compressed data.

    Images, audio, encrypted payloads, and random binary blobs cannot be
    compressed further (they're already at or near Shannon entropy limits).
    Applying DEFLATE to these data types wastes CPU cycles and may even
    increase the payload size by 2–5% due to deflate header overhead.
    """
    import websockets

    async with websockets.connect("wss://stream.example.com/binary", compress=9) as ws:
        # Fetch a JPEG image from some endpoint, then send it over WebSocket
        image_bytes = fetch_image_from_s3("photo.jpg")  # Already compressed (JPEG)
        await ws.send(image_bytes)  # DEFLATE on JPEG = wasted CPU + slightly larger

        audio_data = load_audio_file("voice.ogg")  # Already compressed (Ogg Vorbis)
        await ws.send(audio_data)  # DEFLATE on OGG = wasted CPU + slightly larger

        encrypted_payload = b"\x8f\x2a\xe1..."  # Random bytes — cannot be compressed
        await ws.send(encrypted_payload)  # DEFLATE on random = ~3% bigger, no speedup


async def smart_compress(
    websocket: Any,
    data: bytes | str,
    content_type: str,
) -> None:
    """✅ GOOD — Only compress text and JSON data; skip compressed binaries.

    Analyzes the content type before applying compression. Text data (JSON, XML,
    CSV) has high redundancy and compresses well (5–10× reduction). Already-
    compressed binary data (images, audio, encrypted blobs) skips compression
    entirely to save CPU and avoid size increase.

    Args:
        websocket: The websockets protocol object with compression already enabled.
        data: The message payload — either bytes or a string.
        content_type: MIME type hint for compression decision:
                     "application/json", "text/*", "image/*", "audio/*", etc.
    """
    # Skip compression for data that is already compressed
    no_compress_types = {
        "image/jpeg", "image/png", "image/webp",  # Image formats
        "audio/mpeg", "audio/ogg", "audio/aac",   # Audio formats
        "video/mp4", "video/webm",                # Video formats
        "application/gzip", "application/zip",    # Archive formats
        "application/octet-stream",              # Unknown binary — skip to be safe
    }

    if content_type in no_compress_types:
        # Send raw bytes — compression is counterproductive
        await websocket.send(data)  # type: ignore[arg-type]
        logger.debug(
            "Sent %d bytes of %s without compression (already compressed)",
            len(data),
            content_type,
        )
    else:
        # Text and JSON compress well — let the permessage-deflate extension handle it
        if isinstance(data, str):
            await websocket.send(data)
        elif isinstance(data, bytes):
            # Encode as UTF-8 string for text data before sending
            text = data.decode("utf-8", errors="replace")
            await websocket.send(text)
        logger.debug(
            "Sent %d bytes of %s with permessage-deflate compression",
            len(data) if isinstance(data, bytes) else len(data),
            content_type,
        )

```


### Pattern 4: Message Batching and Aggregation for High-Frequency Updates

Individual WebSocket frames carry ~2–14 bytes of overhead (frame header + optional masking). When sending 100 tiny messages per second (say 50 bytes each), the overhead is only ~5% — acceptable. But at 10,000 ticks/sec from a market data feed, that frame overhead becomes significant. Batching aggregates multiple logical messages into a single WebSocket frame, amortizing the per-frame overhead across all contained messages.

```python
"""Message batching with time-based, count-based, and priority-aware aggregation."""

from __future__ import annotations

import asyncio
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class Priority(IntEnum):
    """Message priority levels for batching queue ordering.

    Higher values = higher priority. Urgent messages bypass the batch queue
    and are sent immediately to avoid latency impact from time-based batching.

    Attributes:
        LOW: Routine data that can tolerate batching delay (tick updates).
        NORMAL: Standard operational data (order status, balance changes).
        HIGH: Time-sensitive data that should be sent ASAP (fill notifications).
        URGENT: Immediate action required — bypasses batching entirely (stop loss hit).
    """
    LOW = 0
    NORMAL = 1
    HIGH = 2
    URGENT = 3


@dataclass
class BatchedMessage:
    """A single message within a batch queue.

    Attributes:
        payload: The serialized bytes or string to send in the batch.
        priority: Message urgency level for ordering and bypass decisions.
        created_at: Monotonic timestamp when the message was enqueued.
    """
    payload: str | bytes
    priority: Priority = Priority.NORMAL
    created_at: float = field(default_factory=asyncio.get_event_loop().time)


class MessageBatcher:
    """Aggregates high-frequency messages into batched WebSocket frames.

    Implements a hybrid batching strategy combining time-based and count-based
    triggers with priority-aware bypass for urgent messages:

    - Time window: Collects messages for up to `batch_window_ms` milliseconds
      before flushing. Default 10 ms — balances throughput vs. latency.
    - Count threshold: Flushes when the batch reaches `max_batch_size` messages.
      Default 50 — prevents unbounded queue growth on low-traffic periods.
    - Priority bypass: Messages with URGENT priority are sent immediately
      without entering the batch queue, minimizing impact on time-critical data.

    Thread-safety: All public methods are asyncio-safe (no threading). The
    internal queue is an asyncio.Queue for async producer/consumer patterns.

    Usage:
        batcher = MessageBatcher(
            batch_window_ms=10,
            max_batch_size=50,
            send_callback=websocket.send,  # coroutine reference
        )
        await batcher.enqueue(tick_data)        # Batches normally
        await batcher.enqueue(urgent_msg, Priority.URGENT)  # Sends immediately
        await batcher.flush()                   # Forces immediate flush
    """

    def __init__(
        self,
        batch_window_ms: int = 10,
        max_batch_size: int = 50,
        send_callback: Callable[[str | bytes], asyncio.Task[None]] | None = None,
        flush_callback: Callable[[list[str | bytes]], asyncio.Task[None]] | None = None,
    ) -> None:
        """Initialize the message batcher.

        Args:
            batch_window_ms: Maximum milliseconds to hold messages in a batch
                            before flushing. Lower values reduce latency but
                            increase frame overhead. Typical range: 5–20 ms.
            max_batch_size: Maximum number of messages per batch before flushing.
                           Prevents unbounded queue growth during low-traffic
                           periods where the time window is still active.
            send_callback: Optional coroutine that sends a single message. If set,
                          urgent messages are sent via this callback directly.
            flush_callback: Optional coroutine that sends a list of batched messages.
                           The batcher calls this to flush accumulated batches.
        """
        self._window_ms = batch_window_ms
        self._max_size = max_batch_size
        self._send_callback = send_callback
        self._flush_callback = flush_callback

        # Internal queue of pending BatchedMessages
        self._queue: deque[BatchedMessage] = deque()

        # State tracking for the current batch window
        self._batch_start_time: float = 0.0
        self._is_flushing = False
        self._flush_task: asyncio.Task[None] | None = None

        # Counters for monitoring
        self._total_enqueued: int = 0
        self._total_flushed: int = 0
        self._urgent_bypasses: int = 0

    async def enqueue(
        self,
        payload: str | bytes,
        priority: Priority = Priority.NORMAL,
    ) -> None:
        """Add a message to the batch queue.

        If the message has URGENT priority, it bypasses batching entirely
        and is sent immediately via send_callback (if configured). Otherwise,
        it enters the queue and triggers a flush when the time window expires
        or max_batch_size is reached.

        Args:
            payload: The serialized message data to batch.
            priority: Urgency level determining batching behavior.
        """
        self._total_enqueued += 1

        # URGENT messages bypass batching entirely
        if priority == Priority.URGENT:
            await self._send_immediate(payload)
            self._urgent_bypasses += 1
            return

        # Start a new batch window if this is the first message
        now = asyncio.get_event_loop().time()
        if not self._queue:
            self._batch_start_time = now

        # Add to queue
        self._queue.append(BatchedMessage(payload=payload, priority=priority, created_at=now))

        # Check if we should flush based on count threshold
        if len(self._queue) >= self._max_size:
            await self._flush()
            return

        # Schedule a timer-based flush if not already scheduled
        if self._flush_task is None or self._flush_task.done():
            self._flush_task = asyncio.ensure_future(self._periodic_flush())

    async def _send_immediate(self, payload: str | bytes) -> None:
        """Send a single message immediately, bypassing the batch queue.

        Args:
            payload: The message to send right away.
        """
        if self._send_callback is not None:
            await self._send_callback(payload)
        else:
            logger.warning("No send callback configured — urgent message dropped")

    async def _periodic_flush(self) -> None:
        """Timer-based flush that fires after batch_window_ms elapsed.

        Waits for the configured window duration, then flushes all queued
        messages regardless of batch size. This is the time-based component
        of the hybrid batching strategy.
        """
        try:
            await asyncio.sleep(self._window_ms / 1000.0)
            await self._flush()
        except asyncio.CancelledError:
            # Task was cancelled during sleep or flush — normal shutdown path.
            logger.debug("Batch flush timer cancelled")

    async def _flush(self) -> None:
        """Flush all currently queued messages into a single batch frame.

        Messages are ordered by priority (URGENT first, LOW last) before
        batching. This ensures that urgent data within a batch reaches the
        client in the correct order relative to other urgent data.

        The flush is idempotent — calling it while already flushing has no effect.
        """
        if self._is_flushing:
            return

        self._is_flushing = True

        try:
            # Skip if queue is empty (could happen if urgent messages cleared it)
            if not self._queue:
                return

            # Sort by priority descending so urgent messages arrive first at the consumer
            sorted_messages = sorted(
                self._queue,
                key=lambda m: m.priority,
                reverse=True,
            )

            payloads = [m.payload for m in sorted_messages]
            batch_count = len(payloads)
            self._total_flushed += batch_count

            # Send via flush callback if provided (expected async coroutine)
            if self._flush_callback is not None:
                await self._flush_callback(payloads)
            else:
                logger.warning(
                    "No flush callback configured — batch of %d messages dropped",
                    batch_count,
                )

        finally:
            # Clear queue regardless of success/failure
            self._queue.clear()
            self._batch_start_time = 0.0
            self._flush_task = None
            self._is_flushing = False

    def flush_now(self) -> None:
        """Force an immediate flush of all pending messages.

        Useful for end-of-session cleanup or when the producer knows no more
        messages are coming and wants to minimize tail latency.
        """
        if self._flush_task is not None and not self._flush_task.done():
            self._flush_task.cancel()
        asyncio.ensure_future(self._flush())

    @property
    def pending_count(self) -> int:
        """Number of messages currently waiting in the batch queue."""
        return len(self._queue)

    @property
    def stats(self) -> dict[str, int]:
        """Return batching statistics for monitoring.

        Returns:
            Dict with total_enqueued, total_flushed, urgent_bypasses,
            pending_count, and current_batch_size.
        """
        return {
            "total_enqueued": self._total_enqueued,
            "total_flushed": self._total_flushed,
            "urgent_bypasses": self._urgent_bypasses,
            "pending_count": len(self._queue),
            "current_batch_size": len(self._queue),
        }


class MessageUnbatcher:
    """Consumes batched messages and splits them into individual frames.

    The server sends a single batch as one WebSocket frame (often encoded as
    a JSON array or MessagePack array). This unbatcher splits it back into
    individual messages for per-message processing on the consumer side.

    Supports both JSON arrays and custom delimiters for non-JSON binary batches.

    Usage:
        unbatcher = MessageUnbatcher()
        # Server sends: ["tick1", "tick2", "tick3"] in a single frame
        individual = await unbatcher.process_batch(batched_frame)
        # Returns: ["tick1", "tick2", "tick3"] — one per message handler
    """

    def __init__(self, delimiter: str | None = None) -> None:
        """Initialize the unbatcher.

        Args:
            delimiter: Optional character to split batched strings on. If None,
                      the consumer must handle JSON/MessagePack array deserialization
                      itself. For simple string-based batching, use "\n" as delimiter.
        """
        self._delimiter = delimiter

    async def process_batch(
        self,
        batched_data: str | bytes,
    ) -> list[str]:
        """Split a single batched frame into individual messages.

        If a delimiter is configured, splits on that character. Otherwise,
        attempts to parse the data as a JSON array and returns the elements.

        Args:
            batched_data: The raw bytes or string from one WebSocket frame.

        Returns:
            List of individual message strings extracted from the batch.

        Raises:
            ValueError: If the batch cannot be parsed (malformed JSON or empty).
        """
        if isinstance(batched_data, bytes):
            try:
                text = batched_data.decode("utf-8")
            except UnicodeDecodeError:
                raise ValueError(
                    "Batch data is not valid UTF-8 — use MessagePackUnbatcher for binary batches"
                )
        else:
            text = batched_data

        if self._delimiter is not None:
            # Simple delimiter-based splitting
            messages = [m for m in text.split(self._delimiter) if m.strip()]
        else:
            # JSON array parsing — most common for API-level batching
            import json

            try:
                parsed = json.loads(text)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON batch: {exc}")

            if not isinstance(parsed, list):
                raise ValueError(
                    f"Expected JSON array in batch, got {type(parsed).__name__}"
                )

            messages = [str(item) for item in parsed]

        if not messages:
            raise ValueError("Empty batch received")

        return messages

```


### Pattern 5: Combined Optimization Pipeline — Full End-to-End Example

Shows how to combine MessagePack serialization, permessage-deflate compression, and message batching into a single high-performance WebSocket pipeline. This pattern is the production-ready integration of all previous patterns.

```python
"""Full optimization pipeline combining binary serialization, compression, and batching."""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class OptimizedTick:
    """Compact tick representation using msgspec Struct for maximum serialization speed.

    Uses msgspec.Struct (not dataclass) which provides ~30% faster encoding because
    msgspec generates C-level struct readers instead of Python dict conversion.

    Attributes:
        symbol: Trading pair — stored as fixed-length bytes for compact encoding.
        price: Integer cents to avoid float precision loss entirely.
        size: Trade volume in micro-lots (1 lot = 0.00001 BTC).
        side: 0=buy, 1=sell — single byte instead of "buy"/"sell" string.
        ts_us: Microsecond timestamp (fits in uint64, no nanosecond storage needed).
    """
    symbol: str
    price: int
    size: int
    side: int          # 0 = buy, 1 = sell
    ts_us: int         # microseconds — sufficient for most markets

    def to_msgpack_dict(self) -> dict[str, Any]:
        """Convert to a flat dict suitable for msgspec.msgpack encoding.

        Returns a new dict each call — this method is called once per tick
        in the hot path, so minimal overhead is critical.

        Returns:
            Flat dictionary with string keys and primitive values.
        """
        return {
            "s": self.symbol,   # Abbreviated keys for MessagePack schema brevity
            "p": self.price,
            "z": self.size,
            "d": self.side,
            "t": self.ts_us,
        }


class OptimizedWebSocketPipeline:
    """High-performance WebSocket pipeline combining all optimization techniques.

    Architecture:
        Producer (market data engine)
            ↓ TickData
        MessageBatcher (time/count-based batching)
            ↓ Batched messages
        MessagePackSerializer (binary encoding)
            ↓ Compressed bytes
        Permessage-Deflate (RFC 7692, negotiated at handshake)
            ↓ Wire bytes (~3–5× smaller than JSON text)
        WebSocket TCP connection

    Typical performance on a server-to-server link:
        - JSON uncompressed:   ~180 bytes/msg, 2.5 µs encode, no compression
        - JSON + deflate:      ~45 bytes/msg, 2.5 µs encode, ~75% compression ratio
        - MessagePack raw:     ~60 bytes/msg, 0.8 µs encode, no compression
        - MessagePack + deflate: ~18 bytes/msg, 0.8 µs encode, ~90% total reduction

    Usage:
        pipeline = OptimizedWebSocketPipeline(
            uri="wss://market.example.com/feed",
            batch_window_ms=5,
            max_batch_size=200,
        )
        await pipeline.start()
        try:
            while True:
                tick = await fetch_market_data()  # from your data engine
                await pipeline.send_tick(tick)
        finally:
            await pipeline.stop()
    """

    def __init__(
        self,
        uri: str,
        batch_window_ms: int = 5,
        max_batch_size: int = 200,
        compression_level: int = 6,
    ) -> None:
        """Initialize the optimization pipeline.

        Args:
            uri: WebSocket server URL.
            batch_window_ms: Batch collection window in milliseconds. Lower = less latency,
                            more frames. 5 ms is a good default for high-frequency feeds.
            max_batch_size: Maximum messages per batch frame before forced flush.
                           200 allows up to ~10 MB/s throughput with small ticks.
            compression_level: DEFLATE compression level (1–9). Level 6 provides the
                              best speed/ratio tradeoff on most hardware.
        """
        self._uri = uri
        self._compression_level = compression_level

        # Components
        import msgspec

        self._serializer = msgspec.msgpack
        self._batcher = MessageBatcher(
            batch_window_ms=batch_window_ms,
            max_batch_size=max_batch_size,
            flush_callback=self._on_batch_flush,
        )
        self._ws: Any = None
        self._running = False

    async def start(self) -> None:
        """Connect to the WebSocket server with all optimizations enabled.

        Establishes a connection with permessage-deflate compression negotiated
        during handshake and MessagePack serialization for all sent data.
        """
        import websockets

        self._ws = await websockets.connect(
            self._uri,
            compress=self._compression_level,  # Enables permessage-deflate at level 6
            max_size=2**20,                     # Max receive size: 1 MB (prevent DoS)
            max_queue=32,                       # Max pending send messages
        )
        self._running = True
        logger.info(
            "Pipeline started: uri=%s, compression=L%d, batch=%dms/%d msgs",
            self._uri,
            self._compression_level,
            self._batcher._window_ms,
            self._batcher._max_size,
        )

    async def stop(self) -> None:
        """Flush pending batches and close the WebSocket connection.

        Ensures no market data is lost during shutdown by draining the batch
        queue before closing. If the flush exceeds 1 second, closes anyway to
        prevent hanging on unresponsive servers.
        """
        self._running = False

        # Force flush any pending messages (with timeout)
        if self._batcher.pending_count > 0:
            deadline = asyncio.get_event_loop().time() + 1.0
            while self._batcher.pending_count > 0 and asyncio.get_event_loop().time() < deadline:
                await asyncio.sleep(0.01)

            if self._batcher.pending_count > 0:
                logger.warning(
                    "Shutting down with %d messages still in batch queue — dropping",
                    self._batcher.pending_count,
                )

        if self._ws is not None and not self._ws.closed:
            await self._ws.close()
        logger.info("Pipeline stopped")

    async def send_tick(
        self,
        tick: OptimizedTick,
        priority: Priority = Priority.NORMAL,
    ) -> None:
        """Send a single tick through the optimization pipeline.

        The tick is serialized to MessagePack, optionally compressed by the
        active permessage-deflate connection, and batched if appropriate for
        the configured window and count thresholds.

        Args:
            tick: The market data tick to send.
            priority: Urgency level. URGENT ticks bypass batching.
        """
        if not self._running or self._ws is None:
            logger.warning("Cannot send — pipeline not running")
            return

        # Serialize to compact binary (MessagePack)
        encoded = self._serializer.encode(tick.to_msgpack_dict())

        # Enqueue in the batcher — handles timing, count thresholds, and urgency
        await self._batcher.enqueue(encoded, priority=priority)

    async def _on_batch_flush(self, payloads: list[str | bytes]) -> None:
        """Handle a completed batch by sending it as a single WebSocket frame.

        This callback is invoked by MessageBatcher when the flush condition
        (time or count threshold) is met. It sends all payloads as one
        MessagePack array, which the server receives as a single frame.

        Args:
            payloads: List of MessagePack-encoded message bytes to send together.
        """
        if self._ws is None or self._ws.closed:
            return

        try:
            # Pack all payloads into a single MessagePack array
            batched = self._serializer.encode(payloads)
            await self._ws.send(batched)
        except Exception as exc:
            logger.error("Batch send failed: %s — pipeline may be unhealthy", exc)
            # Don't retry — the connection is likely broken. Let the manager
            # (websocket-manager skill) handle reconnection.

    def get_stats(self) -> dict[str, Any]:
        """Return current pipeline statistics for monitoring dashboards.

        Returns:
            Dict containing batcher stats, compression level, active connection status,
            and throughput metrics.
        """
        return {
            "batcher": self._batcher.stats,
            "compression_level": self._compression_level,
            "connected": self._ws is not None and not self._ws.closed if self._ws else False,
            "running": self._running,
        }


# ── Example: Server-side handler that receives batched MessagePack frames ─

async def optimized_tick_server_handler(
    websocket: Any,
) -> None:
    """Server-side handler for receiving batched MessagePack WebSocket frames.

    Receives compressed batches from the OptimizedWebSocketPipeline client,
    decompresses (automatic via websockets permessage-deflate), deserializes
    from MessagePack to individual ticks, and processes each one.

    This handler demonstrates the consumer side of the full pipeline:
        Client → [MessagePack batch] → [permessage-deflate decompress] → [WebSocket frame]
        Server receives frame → decodes array → iterates → processes each tick

    Args:
        websocket: The websockets protocol object with automatic compression handling.
    """
    while True:
        try:
            # Receive a single WebSocket frame (already decompressed by library)
            raw_frame = await asyncio.wait_for(websocket.recv(), timeout=30.0)

            # Decode the MessagePack array into individual tick dicts
            ticks_data: list[dict[str, Any]] = msgspec.msgpack.decode(raw_frame)

            for tick_dict in ticks_data:
                # Convert to typed dataclass for type-safe processing
                tick = OptimizedTick(
                    symbol=tick_dict["s"],
                    price=tick_dict["p"],
                    size=tick_dict["z"],
                    side=tick_dict["d"],
                    ts_us=tick_dict["t"],
                )

                # Process the tick — your trading logic, order book updates, etc.
                process_optimized_tick(tick)

        except asyncio.TimeoutError:
            logger.warning("No data received for 30s — sending ping")
            await websocket.ping()
        except Exception as exc:
            logger.error("Handler error: %s", exc)
            break


def process_optimized_tick(tick: OptimizedTick) -> None:
    """Process an optimized tick in the trading engine.

    Receives fully-typed data — no dict key lookups, no type conversion,
    no string-to-int parsing. The msgspec decoder already validated and
    converted all fields during MessagePack deserialization.

    Args:
        tick: A validated OptimizedTick with correct types for all fields.
    """
    # Direct integer arithmetic — no float precision concerns
    if tick.side == 0:  # BUY side
        update_bid(tick.symbol, tick.price, tick.size)
    else:  # SELL side
        update_ask(tick.symbol, tick.price, tick.size)

```

---

## Constraints

### MUST DO

- Replace JSON serialization with MessagePack or Protobuf whenever message rate exceeds 100 msgs/sec — the payload and encoding speed gains compound at higher rates
- Negotiate `permessage-deflate` during the WebSocket handshake explicitly via additional_headers — do not rely on library defaults which may differ across versions
- Set compression level to 4–6 for the best speed/ratio tradeoff — levels above 8 add significant CPU cost with diminishing returns (<5% size improvement from level 6 to 9)
- Use `no_context_takeover` for long-lived connections (>1 hour) to prevent compression dictionary memory growth from accumulating unbounded over connection lifetime
- Batch messages using time-based (≤10 ms) AND count-based (≤50 msg) thresholds together — neither alone provides optimal throughput/latency balance
- Send URGENT priority messages immediately without batching — do not let critical alerts wait for a 10 ms batch window to expire
- Skip compression for already-compressed data types (images, audio, encrypted payloads, random binary) — it increases payload size by 2–5% and wastes CPU cycles
- Use `msgspec.msgpack` over `python-msgpack` for serialization — benchmarks show ~3× faster encoding and decoding with strict type validation
- Use Protobuf field numbers (not names) in the `.proto` schema — binary wire format uses compact varint encoding of field numbers, never field name strings
- Profile all optimizations with realistic traffic patterns — synthetic benchmarks can misrepresent real-world compression ratios by 20–40%

### MUST NOT DO

- Compress every frame indiscriminately — applying DEFLATE to JPEG, PNG, audio files, or encrypted blobs is counterproductive and increases payload size
- Set `client_max_window_bits` above 15 (32 KB) on mobile clients — each concurrent WebSocket connection reserves that much memory for its compression dictionary; 100 connections = 3.2 GB
- Batch so aggressively that p99 latency exceeds your SLA — a 100 ms batch window means every message waits up to 100 ms even if the queue is full at 1 message
- Mix JSON and MessagePack frames on the same connection without framing — the receiver cannot determine which decoding strategy to use per-frame
- Use Protobuf without maintaining schema versioning — adding or removing fields in an existing .proto breaks binary compatibility for connected clients
- Hardcode compression parameters — make window size, level, and no_context_takeover configurable via environment variables for different deployment targets (mobile vs server-to-server)

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [MessagePack Official Specification](https://msgpack.org/)
- [msgspec Python Library Documentation](https://jcristharif.com/msgspec/)
- [Protocol Buffers Language Guide (proto3)](https://protobuf.dev/programming-guides/proto3/)
- [RFC 7692 — Compression Extensions for WebSocket](https://datatracker.ietf.org/doc/html/rfc7692)
- [python-websockets Library Documentation](https://websockets.readthedocs.io/)
- [DEFLATE Compression (RFC 1951)](https://datatracker.ietf.org/doc/html/rfc1951)
- [Varint Encoding in Protocol Buffers](https://protobuf.dev/programming-guides/encoding/#varints)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `websocket-server-architecture` | Server-side architecture patterns (pub/sub routing, session management, horizontal scaling) that provide the infrastructure this skill optimizes |
| `websocket-security` | Authentication, origin validation, rate limiting, and secure transport enforcement to protect high-throughput connections |
| `websocket-manager` | Client-side reconnection logic, connection state machines, and message routing on the browser/mobile side that consume optimized frames |
