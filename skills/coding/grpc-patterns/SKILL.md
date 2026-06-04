---
name: grpc-patterns
description: Implements gRPC service patterns (unary, streaming, bidirectional), Protocol
  Buffers design, interceptor middleware, typed error handling, and client/server
  code generation for Go and Python microservices.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: gRPC, protocol buffers, protobuf, RPC, streaming RPC, unary call, interceptor
    middleware, grpc service, stub generation, proto file design, bidirectional stream,
    client streaming, server streaming
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
  related-skills: grpc, rest-api-patterns, fastapi-patterns
---
# gRPC Service Patterns

Implements production-ready gRPC services and clients using Protocol Buffers, covering unary and streaming RPCs, interceptor middleware, typed error handling with status codes, and cross-language code generation for Go and Python.

## TL;DR Checklist

- [ ] Define .proto service contract first — write methods, messages, and enum types before any implementation
- [ ] Use versioned package names (`package myapp.v1`) and never reuse field numbers across versions
- [ ] Map all error paths to specific gRPC status codes (InvalidArgument, NotFound, AlreadyExists, etc.)
- [ ] Set context deadlines on every client call — no calls without timeouts
- [ ] Implement interceptor chains for cross-cutting concerns (auth, logging, metrics)
- [ ] Handle stream lifecycle explicitly — always check for EOF and cancel contexts

---

## When to Use

Use this skill when:

- Writing gRPC service implementations in Go or Python that need production-grade patterns
- Designing `.proto` schemas for new microservices or evolving existing ones
- Implementing interceptor middleware chains (authentication, logging, retry logic)
- Building streaming RPC endpoints (server-streaming, client-streaming, bidirectional)
- Setting up gRPC clients with proper error handling, timeouts, and interceptors
- Migrating a REST API to gRPC or designing internal service-to-service communication

---

## When NOT to Use

Avoid this skill for:

- External public API design — use REST/GraphQL for broader client compatibility (see `rest-api-patterns`)
- Kubernetes deployment configuration — use `cncf/grpc` for manifests, ServiceMesh routing, and Envoy configs
- Simple file format serialization without RPC needs — use JSON or Protocol Buffers directly without gRPC transport

---

## Core Workflow

1. **Design the .proto Schema** — Define service methods, message types, enums, and options in `.proto` files first. Use `package myapp.v1` naming for versioning. Assign stable field numbers and never reuse them. Include `google.api.http` annotations if you need HTTP/gRPC gateway later. **Checkpoint:** Every RPC method has a clearly named request and response message — no bare string parameters, no untyped maps for structured data.

2. **Generate Service Stubs** — Run `protoc` with language-specific plugins to generate server stubs and client libraries. For Go: `protoc --go_out=. --go-grpc_out=.`. For Python: `python -m grpc_tools.protoc`. Commit generated files or ensure CI generates them consistently. **Checkpoint:** Generated code compiles cleanly in the target language and matches the proto definition.

3. **Implement Service Handlers** — Implement each RPC method with input validation, business logic, and proper gRPC status code returns. Never return raw errors as strings — wrap them using `status.Error()` (Go) or `grpc.StatusCode` (Python). **Checkpoint:** Every error path maps to a specific gRPC status code, not a generic Internal error.

4. **Build Interceptor Chains** — Implement server-side interceptors for authentication, request validation, and metrics. Implement client-side interceptors for retry logic and logging. Chain them in order: auth → validate → timeout → call → log metrics. **Checkpoint:** Each interceptor is independent and testable in isolation.

5. **Implement Client Code** — Create gRPC clients with context deadlines, configurable interceptors, connection pool settings, and proper error handling. Use exponential backoff retry for transient errors (Unavailable, DeadlineExceeded). **Checkpoint:** All client calls have a deadline or timeout — no unbounded waits.

---

## Implementation Patterns

### Pattern 1: Protobuf Schema Design

Use versioned packages, stable field numbers, and clear naming conventions. Prefer `int64` over `int32` for IDs to avoid overflow in long-lived systems.

```protobuf
// ✅ GOOD — versioned package with clear types
syntax = "proto3";

package orders.v1;

option go_package = "github.com/myorg/orders/proto/gen/orders/v1;ordersv1";
option java_package = "com.myorg.orders.v1";

import "google/protobuf/timestamp.proto";
import "google/api/annotations.proto";

// Enum values should start at 0 and use UPPER_SNAKE_CASE
enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_SHIPPED = 3;
  ORDER_STATUS_DELIVERED = 4;
  ORDER_STATUS_CANCELLED = 5;
}

// Request/response messages named after the RPC method + action
message CreateOrderRequest {
  string user_id = 1;
  repeated OrderItem items = 2;
  string shipping_address_id = 3;
}

message OrderItem {
  string product_id = 1;
  int32 quantity = 2;
  int64 unit_price_cents = 3;  // int64 for precision, avoids float
}

message CreateOrderResponse {
  string order_id = 1;
  google.protobuf.Timestamp created_at = 2;
  OrderStatus status = 3;
}

// Service with HTTP gateway annotations for REST-to-gRPC bridge
service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse) {
    option (google.api.http) = {
      post: "/v1/orders"
      body: "*"
    };
  }

  rpc GetOrder(GetOrderRequest) returns (Order) {
    option (google.api.http) = {
      get: "/v1/orders/{order_id}"
    };
  }

  // Server streaming — tracks order status updates in real time
  rpc TrackOrder(TrackOrderRequest) returns (stream OrderStatusUpdate);

  // Client streaming — batch upload order items
  rpc BatchCreateOrders(stream CreateOrderItemRequest) returns (BatchCreateOrderResponse);

  // Bidirectional streaming — live order stream with acknowledgments
  rpc StreamOrders(stream OrderEvent) returns (stream OrderAck);
}
```

### Pattern 2: Go gRPC Server Implementation

Proper context handling, typed error responses, and interceptor patterns.

```go
package server

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	pb "github.com/myorg/orders/proto/gen/orders/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server implements the generated OrderServiceServer interface.
type Server struct {
	pb.UnimplementedOrderServiceServer
	orderStore   OrderStore
	logger       *slog.Logger
	maxStreamAge time.Duration
}

func NewServer(store OrderStore, logger *slog.Logger) *Server {
	return &Server{
		orderStore:   store,
		logger:       logger,
		maxStreamAge: 5 * time.Minute,
	}
}

// CreateOrder implements the unary RPC with full error handling.
func (s *Server) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {
	// Validate inputs early — return InvalidArgument for bad data
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}
	if len(req.Items) == 0 {
		return nil, status.Error(codes.InvalidArgument, "at least one item is required")
	}
	for _, item := range req.Items {
		if item.ProductId == "" {
			return nil, status.Error(codes.InvalidArgument, "item product_id cannot be empty")
		}
		if item.Quantity <= 0 {
			return nil, status.Error(codes.InvalidArgument, fmt.Sprintf("item quantity must be positive, got %d", item.Quantity))
		}
	}

	// Business logic: create order in store
	orderID, err := s.orderStore.CreateOrder(ctx, req)
	if err != nil {
		// Map domain errors to gRPC status codes
		if IsDuplicateError(err) {
			return nil, status.Error(codes.AlreadyExists, fmt.Sprintf("order already exists for user %s", req.UserId))
		}
		if IsNotFoundError(err) {
			return nil, status.Error(codes.NotFound, fmt.Sprintf("product not found: %v", err))
		}
		s.logger.ErrorContext(ctx, "failed to create order", "error", err)
		return nil, status.Errorf(codes.Internal, "internal error creating order")
	}

	return &pb.CreateOrderResponse{
		OrderId:   orderID,
		CreatedAt: timestamppb.Now(),
		Status:    pb.OrderStatus_ORDER_STATUS_PENDING,
	}, nil
}

// TrackOrder implements server-side streaming with context cancellation.
func (s *Server) TrackOrder(req *pb.TrackOrderRequest, stream pb.OrderService_TrackOrderServer) error {
	if req.GetOrderId() == "" {
		return status.Error(codes.InvalidArgument, "order_id is required")
	}

	ctx := stream.Context()
	streamTicker := time.NewTicker(2 * time.Second)
	defer streamTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-streamTicker.C:
			statusUpdate, err := s.orderStore.GetOrderStatus(ctx, req.OrderId)
			if err != nil {
				if errors.Is(err, ErrNotFound) {
					return status.Error(codes.NotFound, fmt.Sprintf("order %s not found", req.OrderId))
				}
				s.logger.ErrorContext(ctx, "failed to get order status", "error", err)
				return status.Errorf(codes.Internal, "stream error: %v", err)
			}

			update := &pb.OrderStatusUpdate{
				OrderId:  req.GetOrderId(),
				Status:   statusUpdate.Status,
				Updated:  timestamppb.Now(),
				Message:  statusUpdate.Message,
			}

			if err := stream.Send(update); err != nil {
				return status.Errorf(codes.Internal, "failed to send update: %v", err)
			}
		}
	}
}
```

### Pattern 3: Go Interceptor Middleware Chain

Server-side unary interceptor for auth and logging.

```go
// AuthInterceptor validates authentication tokens on every gRPC call.
func AuthInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()

		// Extract token from metadata
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.Unauthenticated, "missing metadata")
		}

		tokens := md.Get("authorization")
		if len(tokens) == 0 || tokens[0] == "" {
			return nil, status.Error(codes.Unauthenticated, "authorization header required")
		}

		// Validate the JWT token
		claims, err := validateJWT(tokens[0])
		if err != nil {
			return nil, status.Errorf(codes.Unauthenticated, "invalid token: %v", err)
		}

		// Pass validated claims to downstream handlers via context
		ctx = context.WithValue(ctx, authClaimsKey{}, claims)

		// Call the actual handler
		response, err := handler(ctx, req)
		if err != nil {
			st := status.Convert(err)
			logRPC(info.FullMethod, time.Since(start), st.Code(), true)
			return nil, err
		}

		logRPC(info.FullMethod, time.Since(start), 0, false)
		return response, nil
	}
}

// LoggingInterceptor logs every RPC with method, duration, and status code.
func LoggingInterceptor(logger *slog.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()
		response, err := handler(ctx, req)

		statusCode := codes.OK
		if st, ok := status.FromError(err); ok {
			statusCode = st.Code()
		}

		fields := []any{
			"method", info.FullMethod,
			"duration_ms", time.Since(start).Milliseconds(),
			"status", statusCode.String(),
			"error", err,
		}

		if statusCode != codes.OK {
			logger.Error("rpc failed", fields...)
		} else {
			logger.Debug("rpc completed", fields...)
		}

		return response, err
	}
}
```

### Pattern 4: Python gRPC Implementation

Complete service implementation with async client and error handling.

```python
# server.py — gRPC service implementation
from concurrent import futures
import logging
from datetime import datetime
from google.protobuf import timestamp_pb2 as ts
import grpc
from grpc import StatusCode
from proto.gen.orders.v1 import orders_pb2
from proto.gen.orders.v1 import orders_pb2_grpc

logger = logging.getLogger(__name__)


class OrderService(orders_pb2_grpc.OrderServiceServicer):
    """Production gRPC service with typed error handling."""

    def __init__(self, order_store: OrderStore) -> None:
        self._store = order_store
        self._stream_interval = 2.0  # seconds between status updates

    async def CreateOrder(
        self, request: orders_pb2.CreateOrderRequest, context: grpc.ServicerContext
    ) -> orders_pb2.CreateOrderResponse:
        # Input validation
        if not request.user_id:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("user_id is required")
            return orders_pb2.CreateOrderResponse()

        if not request.items:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("at least one item is required")
            return orders_pb2.CreateOrderResponse()

        for i, item in enumerate(request.items):
            if not item.product_id:
                context.set_code(StatusCode.INVALID_ARGUMENT)
                context.set_details(f"item {i} product_id cannot be empty")
                return orders_pb2.CreateOrderResponse()
            if item.quantity <= 0:
                context.set_code(StatusCode.INVALID_ARGUMENT)
                context.set_details(f"item {i} quantity must be positive")
                return orders_pb2.CreateOrderResponse()

        try:
            order_id = await self._store.create_order(request)
        except DuplicateOrderError as e:
            context.set_code(StatusCode.ALREADY_EXISTS)
            context.set_details(str(e))
            return orders_pb2.CreateOrderResponse()
        except ProductNotFoundError as e:
            context.set_code(StatusCode.NOT_FOUND)
            context.set_details(str(e))
            return orders_pb2.CreateOrderResponse()

        now = ts.Timestamp()
        now.FromDatetime(datetime.utcnow())

        return orders_pb2.CreateOrderResponse(
            order_id=order_id,
            created_at=now,
            status=orders_pb2.OrderStatus.ORDER_STATUS_PENDING,
        )

    async def TrackOrder(
        self,
        request: orders_pb2.TrackOrderRequest,
        context: grpc.ServicerContext,
    ) -> grpc.AsyncGenerator[orders_pb2.OrderStatusUpdate, None]:
        """Server-streaming RPC with proper cancellation handling."""
        if not request.order_id:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("order_id is required")
            return

        while True:
            # Check if client has cancelled
            if context.is_cancelled():
                break

            try:
                status_update = await self._store.get_order_status(request.order_id)
                update_msg = orders_pb2.OrderStatusUpdate(
                    order_id=request.order_id,
                    status=status_update.status,
                    message=status_update.message or "",
                )
                now = ts.Timestamp()
                now.FromDatetime(datetime.utcnow())
                update_msg.updated.CopyFrom(now)
                yield update_msg
            except OrderNotFoundError:
                context.set_code(StatusCode.NOT_FOUND)
                context.set_details(f"order {request.order_id} not found")
                return

            await asyncio.sleep(self._stream_interval)


def serve() -> None:
    """Configure and start the gRPC server with interceptors."""
    interceptors = [
        auth_interceptor(),       # Auth first
        logging_interceptor(),    # Logging second
        timeout_interceptor(10),  # Timeout last
    ]

    server = grpc.aio.server(
        futures.ThreadPoolExecutor(max_workers=50),
        interceptors=interceptors,
        options=[
            ("grpc.max_send_message_length", 50 * 1024 * 1024),  # 50MB
            ("grpc.max_receive_message_length", 50 * 1024 * 1024),
        ],
    )

    orders_pb2_grpc.add_OrderServiceServicer_to_server(
        OrderService(order_store=OrderStore()), server
    )

    server.add_insecure_port("[::]:50051")
    logger.info("Starting gRPC server on :50051")
    server.start()
    server.wait_for_termination()
```

### Pattern 5: Python Client with Retry and Interceptors

Production client with exponential backoff retry for transient failures.

```python
# client.py — gRPC client with retry, metrics, and proper error handling
import asyncio
import logging
from datetime import datetime
from proto.gen.orders.v1 import orders_pb2, orders_pb2_grpc
import grpc
from grpc import StatusCode

logger = logging.getLogger(__name__)


class OrderClient:
    """Production-ready gRPC client with retry logic and interceptors."""

    RETRYABLE_CODES = {StatusCode.UNAVAILABLE, StatusCode.DEADLINE_EXCEEDED}
    MAX_RETRIES = 3
    INITIAL_BACKOFF = 0.1  # seconds
    MAX_BACKOFF = 5.0

    def __init__(self, target: str = "localhost:50051", deadline: float = 10.0) -> None:
        self._target = target
        self._deadline = deadline
        self._channel: grpc.aio.Channel | None = None
        self._stub: orders_pb2_grpc.OrderServiceStub | None = None

    async def __aenter__(self) -> "OrderClient":
        await self.connect()
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.close()

    async def connect(self) -> None:
        """Create channel and stub with proper options."""
        self._channel = grpc.aio.insecure_channel(
            self._target,
            options=[
                ("grpc.keepalive_time_ms", 30_000),
                ("grpc.keepalive_timeout_ms", 10_000),
                ("grpc.max_send_message_length", 50 * 1024 * 1024),
                ("grpc.max_receive_message_length", 50 * 1024 * 1024),
            ],
        )
        self._stub = orders_pb2_grpc.OrderServiceStub(self._channel)

    async def close(self) -> None:
        if self._channel:
            await self._channel.close()

    async def create_order(
        self, user_id: str, items: list[dict[str, int | float]], shipping_address_id: str
    ) -> tuple[str, datetime]:
        """Create an order with retry for transient failures."""
        if not user_id:
            raise ValueError("user_id is required")

        for i, item in enumerate(items):
            if item.get("quantity", 0) <= 0:
                raise ValueError(f"item {i} quantity must be positive")

        request = orders_pb2.CreateOrderRequest(
            user_id=user_id,
            items=[
                orders_pb2.OrderItem(
                    product_id=it["product_id"],
                    quantity=it["quantity"],
                    unit_price_cents=int(it.get("unit_price_cents", 0)),
                )
                for it in items
            ],
            shipping_address_id=shipping_address_id,
        )

        last_error: Exception | None = None
        backoff = self.INITIAL_BACKOFF

        for attempt in range(self.MAX_RETRIES):
            try:
                response = await asyncio.wait_for(
                    self._stub.CreateOrder(request),
                    timeout=self._deadline,
                )
                return (
                    response.order_id,
                    datetime.fromtimestamp(
                        response.created_at.seconds + response.created_at.nanos / 1e9
                    ),
                )
            except grpc.aio.AioRpcError as e:
                if e.code() not in self.RETRYABLE_CODES or attempt == self.MAX_RETRIES - 1:
                    raise

                last_error = e
                logger.warning(
                    "Retryable error on attempt %d/%d: %s",
                    attempt + 1, self.MAX_RETRIES, e.details(),
                )
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, self.MAX_BACKOFF)

        raise last_error or RuntimeError("create_order failed after retries")

    async def track_order(self, order_id: str) -> None:
        """Stream order status updates with cancellation support."""
        if not self._stub:
            raise RuntimeError("client not connected")

        request = orders_pb2.TrackOrderRequest(order_id=order_id)
        deadline = asyncio.get_event_loop().time() + self._deadline

        async for update in self._stub.TrackOrder(request):
            logger.info(
                "Order %s status: %s — %s",
                order_id, update.status.name, update.message,
            )
            # Client cancels after deadline
            if asyncio.get_event_loop().time() > deadline:
                break


# Usage example
async def main() -> None:
    async with OrderClient(target="orders-service:50051", deadline=10.0) as client:
        order_id, created = await client.create_order(
            user_id="usr-123",
            items=[{"product_id": "prod-456", "quantity": 2, "unit_price_cents": 1999}],
            shipping_address_id="addr-789",
        )
        print(f"Order {order_id} created at {created}")

        await client.track_order(order_id)
```

### Pattern 6: Bidirectional Streaming with Flow Control

Bidirectional streaming requires careful flow control and backpressure handling.

```go
// StreamOrders handles bidirectional streaming between client and server.
// Each side sends independent message streams that must be read concurrently.
func (s *Server) StreamOrders(stream pb.OrderService_StreamOrdersServer) error {
	ctx := stream.Context()
	done := make(chan struct{})

	// Worker: read from client and process events
	go func() {
		defer close(done)
		for {
			event, err := stream.Recv()
			if err == io.EOF {
				return
			}
			if err != nil {
				s.logger.ErrorContext(ctx, "stream recv error", "error", err)
				return
			}

			switch event.GetEventType() {
			case pb.OrderEvent_EVENT_TYPE_NEW_ORDER:
				statusUpdate, err := s.processNewOrder(ctx, event.GetNewOrder())
				if err != nil {
					_ = stream.Send(&pb.OrderAck{
						EventId: event.EventId,
						Result: &pb.OrderAck_Error_{
							Error: &pb.OrderAck_Error{
								Code:    pb.StatusError_INTERNAL_ERROR,
								Message: err.Error(),
							},
						},
					})
					continue
				}

				_ = stream.Send(&pb.OrderAck{
					EventId: event.EventId,
					Result: &pb.OrderAck_Success{
						Success: statusUpdate,
					},
				})

			case pb.OrderEvent_EVENT_TYPE_CANCEL_ORDER:
				_ = stream.Send(&pb.OrderAck{
					EventId: event.EventId,
					Result:  &pb.OrderAck_Cancel{Cancel: &pb.CancelAck{}},
				})
			}
		}
	}()

	// Main loop: handle server-sent notifications and client cancellation
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case notification := <-s.notificationChan:
			if err := stream.Send(notification); err != nil {
				s.logger.ErrorContext(ctx, "failed to send notification", "error", err)
				return status.Errorf(codes.Internal, "send error: %v", err)
			}
		case <-done:
			return nil
		}
	}
}
```

### Pattern 7: gRPC Status Code Mapping Reference

Map every domain error to the correct gRPC status code. Using wrong codes causes confusion for clients implementing retry logic.

| gRPC Status Code | When to Use | Example Scenario | Retry Strategy |
|------------------|-------------|------------------|----------------|
| `OK` | Call succeeded | Normal response | N/A |
| `InvalidArgument` | Client sent bad input | Missing required field, validation failed | Never retry — fix the client request |
| `NotFound` | Resource does not exist | User ID not found in database | Never retry |
| `AlreadyExists` | Duplicate creation | Creating user that already exists | Never retry |
| `PermissionDenied` | Authenticated but unauthorized | Insufficient permissions for action | Never retry |
| `Unauthenticated` | Missing or invalid auth | No token, expired JWT | Never retry |
| `FailedPrecondition` | Operation rejected due to state | Trying to cancel a delivered order | Never retry — fix the precondition |
| `Aborted` | Operation was aborted | Concurrent modification conflict | Retry once with backoff |
| `OutOfRange` | Value outside valid range | Negative quantity, date out of range | Never retry |
| `Internal` | Server-side unexpected error | Panics, unhandled exceptions | Retry with backoff (max 3 attempts) |
| `Unavailable` | Service temporarily down | Connection refused, upstream timeout | **Retry aggressively** with exponential backoff |
| `DeadlineExceeded` | Request timed out | Slow database query exceeded deadline | Retry once with longer deadline |

---

## Constraints

### MUST DO
- Define the `.proto` contract before writing any service or client code
- Use versioned package names (`package myapp.v1`) to enable API evolution
- Never reuse field numbers in a message — once assigned, they are permanent
- Set context deadlines on every gRPC client call (never leave timeouts at infinity)
- Map every error path to a specific gRPC status code using `status.Error()` (Go) or `context.set_code()` (Python)
- Handle stream cancellation explicitly with `ctx.Done()` checks in all streaming methods
- Implement interceptors as composable units — each interceptor handles one concern

### MUST NOT DO
- Use string-based error messages instead of gRPC status codes for client-facing errors
- Return raw panics or unhandled errors from service handlers (always catch and return status.Error)
- Leave streaming RPCs running without a context deadline or cancellation check
- Put sensitive data (passwords, tokens) in protobuf message fields — use metadata/metadata-only transport instead
- Share gRPC connections across unrelated request scopes — create per-service or use connection pooling
- Mix protobuf field usage between services — keep messages scoped to their own service package

---

## Testing Patterns

### Go Service Unit Test

```go
func TestCreateOrder(t *testing.T) {
	store := &mockOrderStore{
		createFn: func(ctx context.Context, req *pb.CreateOrderRequest) (string, error) {
			return "ord-123", nil
		},
	}
	srv := NewServer(store, slog.Default())

	req := &pb.CreateOrderRequest{
		UserId:   "usr-456",
		Items:    []*pb.OrderItem{{ProductId: "prod-1", Quantity: 2}},
		ShippingAddressId: "addr-789",
	}

	resp, err := srv.CreateOrder(context.Background(), req)
	require.NoError(t, err)
	assert.Equal(t, "ord-123", resp.GetOrderId())
	assert.Equal(t, pb.OrderStatus_ORDER_STATUS_PENDING, resp.GetStatus())
}

func TestCreateOrderInvalidInput(t *testing.T) {
	srv := NewServer(nil, slog.Default())
	req := &pb.CreateOrderRequest{} // Missing required fields

	_, err := srv.CreateOrder(context.Background(), req)
	assert.Error(t, err)

	st := status.Convert(err)
	assert.Equal(t, codes.InvalidArgument, st.Code())
}
```

### Python Service Test

```python
# test_server.py — pytest for gRPC service
import pytest
from proto.gen.orders.v1 import orders_pb2
from server import OrderService


class MockOrderStore:
    async def create_order(self, request):
        if not request.user_id:
            raise ValueError("user_id required")
        return "ord-mock-456"

    async def get_order_status(self, order_id):
        return type("Status", (), {"status": 2, "message": "shipped"})()


@pytest.mark.asyncio
async def test_create_order_success():
    store = MockOrderStore()
    service = OrderService(store)

    request = orders_pb2.CreateOrderRequest(
        user_id="usr-123",
        items=[orders_pb2.OrderItem(product_id="prod-1", quantity=2, unit_price_cents=999)],
    )

    response = await service.CreateOrder(request, MockContext())
    assert response.order_id == "ord-mock-456"
    assert response.status == orders_pb2.OrderStatus.ORDER_STATUS_PENDING


@pytest.mark.asyncio
async def test_create_order_missing_user_id():
    store = MockOrderStore()
    service = OrderService(store)

    request = orders_pb2.CreateOrderRequest(user_id="")

    response = await service.CreateOrder(request, MockContext())
    assert response.order_id == ""


class MockContext:
    """Minimal ServicerContext mock for unit testing."""
    code = StatusCode.OK
    details = ""

    def set_code(self, code):
        self.code = code

    def set_details(self, details):
        self.details = details
```

---

## Protobuf Best Practices

### Type Selection Guidelines

| Scenario | Recommended Type | Why |
|----------|-----------------|-----|
| Unique identifiers (UUIDs, Snowflake IDs) | `string` with documented format | Human-readable, no overflow risk |
| Numeric IDs for lookups | `int64` or `uint64` | Sufficient range for counter-based IDs |
| Monetary amounts | `int64` in smallest unit (cents, satoshis) | Avoids float precision loss entirely |
| Timestamps | `google.protobuf.Timestamp` | Standardized, timezone-naive UTC |
| Duration | `google.protobuf.Duration` | Standardized duration type |
| Boolean flags | `bool` | Simple true/false state |
| Collections | `repeated <type>` | Ordered, allows zero or more elements |
| Enumerated states | `enum` with `UNSPECIFIED = 0` sentinel | Type-safe state machine |

### Field Number Strategy

1. Reserve numbers for frequently-used fields (1–15) — these encode most efficiently
2. Use higher numbers (16+) for rarely-set optional fields
3. Reserve blocks of numbers for future expansion: `reserve 17, 20, 25;`
4. Never reassign a field number even if the original field is removed
5. When removing a field, mark it as deprecated and reserve the number

```protobuf
// ✅ GOOD — reserved blocks prevent accidental reuse
message User {
  string id = 1;           // Most common query field
  string email = 2;
  string name = 3;
  bool is_active = 4 [deprecated = true];  // Mark for removal, keep number

  reserved 5, 6, 7;        // Reserved for future use — blocks reuse
}
```

---

## Code Generation Commands

### Go
```bash
# Install protoc plugins
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Generate code
protoc --proto_path=. \
  --go_out=./proto/gen \
  --go_opt=paths=source_relative \
  --go-grpc_out=./proto/gen \
  --go-grpc_opt=paths=source_relative \
  proto/orders/v1/orders.proto
```

### Python
```bash
# Install protoc tools
pip install grpcio grpcio-tools protobuf

# Generate code
python -m grpc_tools.protoc \
  -I. \
  --python_out=./proto/gen \
  --grpc_python_out=./proto/gen \
  proto/orders/v1/orders.proto
```

### Buf (Modern Alternative)
```yaml
# buf.yaml — recommended for team-wide consistency
version: v1
breaking:
  use:
    - FILE
lint:
  use:
    - DEFAULT
build:
  roots:
    - proto
```

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `grpc` (cncf) | Kubernetes deployment, service mesh integration, and infrastructure configuration for gRPC services |
| `rest-api-patterns` | Design REST APIs for external-facing interfaces; use gRPC internally and REST externally via gateway |
| `fastapi-patterns` | Build Python HTTP/REST services alongside gRPC microservices in the same codebase |

---

## Troubleshooting

### Connection Issues
- **`UNAVAILABLE: connection refused`** — Server not running or wrong port. Verify server is listening and firewall rules allow traffic on the target port.
- **`RESOURCE_EXHAUSTED: tried to send message larger than max`** — Message size exceeds default 4MB limit. Set `grpc.max_send_message_length` and `grpc.max_receive_message_length` options on both client and server.
- **Connections dropping behind load balancers** — Enable keepalive with `keepalive.Time`, `keepalive.Timeout`, and `keepalive.PermitWithoutStream` options.

### Streaming Issues
- **Stream hangs without sending data** — Check that the stream sender is not blocked waiting for a receiver. Implement proper backpressure with buffered channels or bounded queues.
- **Memory leaks from unread streams** — Clients MUST drain or cancel streaming responses. Always use `defer cancel()` and check context cancellation in server-side streams.

### Protobuf Issues
- **"field number X reused"** — Field numbers are permanent once assigned in a deployed schema. Use new field numbers for additions, mark old ones as deprecated before removal.
- **Generated code doesn't compile** — Verify protoc versions match between development and CI environments. Pin the protoc version in CI pipelines.
