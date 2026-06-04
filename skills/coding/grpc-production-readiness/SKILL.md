---
name: grpc-production-readiness
description: Implements gRPC production operational patterns — graceful shutdown, health checking, service configuration, retry policies, TLS/mTLS, keepalive tuning, flow control, bidirectional stream concurrency, and OpenTelemetry observability for reliable service deployment.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: graceful shutdown, health check, retry policy, keepalive settings, mTLS, flow control, backpressure, how do i make gRPC production-ready
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - proto design
    - protobuf schema
  response_profile:
    verbosity: medium
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
  related-skills: grpc-patterns, observability-patterns, microservice-resilience-patterns
---

# gRPC Production Readiness

Implements operational patterns that keep gRPC services running reliably in production — graceful shutdown with in-flight RPC handling, health check service deployment, JSON service configuration and retry policies, TLS/mTLS security, keepalive tuning, flow control and backpressure for streaming, safe concurrency models for bidirectional streams, and OpenTelemetry observability integration.

## TL;DR Checklist

- [ ] Implement `GracefulStop()` with timeout safety net using `time.AfterFunc` to force shutdown
- [ ] Deploy `grpc.health.v1.Health` service on every server with per-service status management
- [ ] Configure JSON service config with `methodConfig`, retry policies, and load balancing settings
- [ ] Set retry policies with maxAttempts, exponential backoff (+/-20% jitter), and idempotent-only hedging
- [ ] Enable TLS/mTLS in production — never use insecure channels outside development
- [ ] Configure keepalive (`time`, `timeout`, `permitWithoutStream`) to survive load balancer idle timeouts
- [ ] Enforce flow control on streaming RPCs — bounded channels for server-streaming, explicit ACK for bidirectional
- [ ] Use separate goroutines for Recv/Send in bidirectional streams; never call SendMsg/RecvMsg concurrently from the same goroutine
- [ ] Instrument with OpenTelemetry metrics (`grpc.client.attempt.started`, `grpc.server.call.duration`) and trace context propagation

---

## When to Use

Use this skill when:

- You are configuring a gRPC service for production deployment and need operational patterns beyond basic implementation
- Implementing graceful shutdown procedures so in-flight requests complete before the process exits
- Setting up health checking for load balancer readiness probes (Kubernetes liveness/readiness, Envoy outlier detection)
- Configuring client-side retry policies with exponential backoff and jitter to handle transient failures
- Enabling TLS or mutual TLS (mTLS) for encrypted inter-service communication
- Tuning keepalive intervals to prevent connections from being killed by intermediate proxies or firewalls
- Designing streaming RPCs that need backpressure handling or bounded processing
- Adding OpenTelemetry metrics, spans, and trace context propagation for distributed tracing

---

## When NOT to Use

Avoid this skill for:

- **Proto3 schema design** — use `grpc-patterns` (covers .proto syntax, message types, service definitions)
- **Service handler implementation** with business logic — covered in `grpc-patterns`
- **Interceptor/middleware patterns** — authentication interceptors, logging middleware are in `grpc-patterns`
- **Protobuf type selection guidelines** — handled in `grpc-patterns`
- **Code generation commands** (`protoc`, Buf) — managed in `grpc-patterns`
- **gRPC status code mapping tables** — documented in `grpc-patterns`
- **Kubernetes/Istio/Envoy integration manifests** — covered in CNCF skills

---

## Core Workflow

1. **Deploy Health Check Service** — Implement `grpc.health.v1.Health` on every gRPC server, configure per-service serving status, and expose the health service unversioned. **Checkpoint:** Client can call `Health.Check()` with empty request and receive SERVING status; Kubernetes readiness probe points to the health check port.; 2. **Configure Keepalive Settings** — Set keepalive time (30s default), timeout (10s), and permitWithoutStream on both client and server channels to survive load balancer idle timeouts. **Checkpoint:** Connections persist through 60-second proxy idle timeouts; no `EOF` or `connection reset` errors after periods of inactivity.; 3. **Enable TLS/mTLS** — Configure server-side TLS with `credentials.NewTLS()` (Go) or `grpc.ssl_channel_credentials()` (Python), enable mutual authentication for inter-service communication, and implement certificate rotation without restarts where possible. **Checkpoint:** Server rejects connections on insecure channels in production; mTLS peers validate each other's certificates.; 4. **Configure Service Config and Retry Policies** — Deploy JSON service configuration with `methodConfig` entries defining timeouts, retry policies (maxAttempts, initialBackoff, maxBackoff, backoffMultiplier, jitter), load balancing algorithms, and message size limits. **Checkpoint:** Client respects retry policy for configured methods; service config is validated against the proto schema before deployment.; 5. **Implement Graceful Shutdown** — Start shutdown by calling `GracefulStop()`, set a timeout with `time.AfterFunc` (Go) or concurrent task with asyncio (Python) to force-stop after deadline, drain in-flight RPCs, and clean up client connections. **Checkpoint:** All in-flight requests complete or are gracefully rejected before process termination; no data corruption from interrupted writes.; 6. **Enforce Flow Control on Streams** — Use bounded channels for server-streaming responses, implement explicit acknowledgment patterns for bidirectional streams, and tune buffer sizes via transport options to prevent memory exhaustion. **Checkpoint:** Server never accumulates unbounded buffers; backpressure signals flow from slow consumers to fast producers.; 7. **Structure Bidirectional Stream Concurrency Correctly** — Use separate goroutines (Go) or async tasks (Python) for read (Recv) and write (Send) operations on the same stream, coordinate with done channels and context cancellation. **Checkpoint:** No `gRPC: the client connection is closing` errors from concurrent SendMsg/RecvMsg; clean shutdown on context cancellation.; 8. **Add OpenTelemetry Observability** — Emit gRPC-specific metrics (`grpc.client.attempt.started`, `grpc.server.call.duration`, `grpc.server.call.sent_bytes_total`, `grpc.server.call.recv_bytes_total`), populate span attributes for method names and status codes, and propagate trace context via metadata headers. **Checkpoint:** Metrics dashboards show per-method latency histograms; distributed traces follow requests across service boundaries.; 9. **Validate End-to-End Production Readiness** — Run load tests to verify keepalive survival, health check probe failures trigger restarts correctly, retry policies fire on transient errors without over-retrying, and graceful shutdown completes within the configured timeout. **Checkpoint:** All operational knobs produce expected behavior under failure conditions; no silent degradation paths.

---

## Implementation Patterns

### Pattern 1: Graceful Shutdown with Timeout Safety Net

`GracefulStop()` accepts existing RPCs to finish but never times out on its own. Always pair it with a safety net that forces shutdown after a deadline, otherwise a stuck handler can block process termination indefinitely.

```go
// Go — Graceful shutdown with forced timeout
package main

import (
	"context"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	pb "github.com/myorg/service/proto/gen/service/v1"
	"google.golang.org/grpc"
)

type Server struct {
	pb.UnimplementedMyServiceServer
	server       *grpc.Server
	logger       *slog.Logger
	shutdownOnce sync.Once
	inFlight     atomic.Int64
}

func NewServer(logger *slog.Logger) *Server {
	s := &Server{
		logger: logger,
	}
	s.server = grpc.NewServer(
		grpc.MaxRecvMsgSize(50 * 1024 * 1024), // 50MB max receive
		grpc.MaxSendMsgSize(50 * 1024 * 1024), // 50MB max send
	)

	// Register your service here
	// pb.RegisterMyServiceServer(s.server, s)

	return s
}

func (s *Server) Start(ctx context.Context, addr string) error {
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", addr, err)
	}

	s.logger.Info("gRPC server starting", "addr", addr)
	go func() {
		if err := s.server.Serve(lis); err != nil {
			s.logger.Warn("gRPC server stopped unexpectedly", "error", err)
		}
	}()

	return nil
}

// Shutdown initiates graceful shutdown with a forced deadline.
func (s *Server) Shutdown(timeout time.Duration) error {
	s.logger.Info("shutdown initiated", "timeout", timeout)

	forced := make(chan struct{})
	timer := time.AfterFunc(timeout, func() {
		s.logger.Warn("shutdown deadline reached, forcing stop")
		s.server.Stop() // Force-stop: reject all new RPCs immediately
		close(forced)
	})
	defer timer.Stop()

	go func() {
		s.server.GracefulStop() // Wait for in-flight RPCs to complete
		close(forced)
	}()

	<-forced
	s.logger.Info("shutdown complete")
	return nil
}

func main() {
	srv := NewServer(slog.Default())

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := srv.Start(ctx, ":50051"); err != nil {
		slog.Error("failed to start server", "error", err)
		os.Exit(1)
	}

	// Wait for shutdown signal
	<-ctx.Done()
	srv.Shutdown(30 * time.Second)
}
```

```python
# Python — Graceful shutdown with asyncio safety net
import asyncio
import logging
import signal
import sys
from concurrent import futures
from grpc_health.v1 import health_pb2, health_pb2_grpc

logger = logging.getLogger(__name__)


class HealthService(health_pb2_grpc.HealthServicer):
    """Per-service health check with status management."""

    def __init__(self):
        self._status = {
            "": health_pb2.HealthCheckResponse.SERVING,  # Default: SERVING
            "MyService": health_pb2.HealthCheckResponse.SERVING,
        }

    async def Check(self, request, context):
        status = self._status.get(request.service, health_pb2.HealthCheckResponse.UNKNOWN)
        return health_pb2.HealthCheckResponse(status=status)

    async def Watch(self, request, context):
        """Server-streaming watch: notifies clients of status changes."""
        service = request.service
        previous_status = self._status.get(service, health_pb2.HealthCheckResponse.UNKNOWN)

        while not context.is_cancelled():
            current_status = self._status.get(service, health_pb2.HealthCheckResponse.UNKNOWN)
            if current_status != previous_status:
                yield health_pb2.HealthCheckResponse(status=current_status)
                previous_status = current_status
            await asyncio.sleep(0.5)


class ProductionServer:
    def __init__(self, port: int = 50051, shutdown_timeout: float = 30.0):
        self.port = port
        self.shutdown_timeout = shutdown_timeout
        self._server = None
        self._health_service = HealthService()

    async def start(self):
        self._server = grpc.aio.server(
            futures.ThreadPoolExecutor(max_workers=50),
            options=[
                ("grpc.max_send_message_length", 50 * 1024 * 1024),
                ("grpc.max_receive_message_length", 50 * 1024 * 1024),
                ("grpc.keepalive_time_ms", 30_000),
                ("grpc.keepalive_timeout_ms", 10_000),
                ("grpc.keepalive_permit_without_calls", 1),
            ],
        )

        health_pb2_grpc.add_HealthServicer_to_server(
            self._health_service, self._server
        )

        # Register your service here:
        # my_pb2_grpc.add_MyServiceServicer_to_server(
        #     MyServiceImpl(), self._server
        # )

        bound = self._server.add_insecure_port(f"[::]:{self.port}")
        logger.info("gRPC server started on port %d (bound: %s)", self.port, bound)
        await self._server.start()
        logger.info("Server ready to accept connections")

    async def shutdown(self):
        """Graceful shutdown with forced stop after deadline."""
        logger.info("Shutdown initiated, timeout=%ss", self.shutdown_timeout)

        # Graceful stop waits for in-flight RPCs but can hang indefinitely.
        # Use a task group to force-stop after the deadline.
        try:
            await asyncio.wait_for(
                self._server.stop(grace=self.shutdown_timeout),
                timeout=self.shutdown_timeout,
            )
        except asyncio.TimeoutError:
            logger.warning(
                "Shutdown deadline reached, forcing stop of remaining RPCs"
            )
            await self._server.stop(grace=0)

        logger.info("Shutdown complete")


async def main():
    server = ProductionServer(port=50051, shutdown_timeout=30.0)

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(server.shutdown()))

    await server.start()
    await server._server.wait_for_termination()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
```

### Pattern 2: Health Check with Per-Service Status Management

Implement `grpc.health.v1.Health` for Kubernetes readiness probes and load balancer health discovery. Support per-service status (`SERVING`, `NOT_SERVING`, `SERVICE_UNKNOWN`) and server-streaming watch RPCs for dynamic status updates.

```go
// Go — Health service with per-service status and programmatic status changes
package main

import (
	"context"
	"log/slog"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
)

type HealthManager struct {
	health *health.Server
	logger *slog.Logger
}

func NewHealthManager(logger *slog.Logger) *HealthManager {
	h := health.NewServer()

	// Set default status to SERVING
	h.SetServingStatus("", grpc_health_v1.HealthCheckResponse_SERVING)
	h.SetServingStatus("myapp.v1.MyService", grpc_health_v1.HealthCheckResponse_SERVING)

	return &HealthManager{health: h, logger: logger}
}

func (m *HealthManager) Register(grpcServer *grpc.Server) {
	grpc_health_v1.RegisterHealthServer(grpcServer, m.health)
	m.logger.Info("health service registered on gRPC server")
}

// MarkServiceServing transitions a specific service to SERVING.
// Call this when the service has completed startup and is ready to accept requests.
func (m *HealthManager) MarkServiceServing(serviceName string) {
	m.health.SetServingStatus(serviceName, grpc_health_v1.HealthCheckResponse_SERVING)
	m.logger.Info("health status updated", "service", serviceName, "status", "SERVING")
}

// MarkServiceNotServing marks a service as NOT_SERVING (e.g., during rolling update).
func (m *HealthManager) MarkServiceNotServing(serviceName string) {
	m.health.SetServingStatus(serviceName, grpc_health_v1.HealthCheckResponse_NOT_SERVING)
	m.logger.Info("health status updated", "service", serviceName, "status", "NOT_SERVING")
}

// WatchClient handles the server-streaming health watch RPC from a client.
func (m *HealthManager) StartWatch(ctx context.Context, service string) <-chan grpc_health_v1.HealthCheckResponse_ServingStatus {
	ch := make(chan grpc_health_v1.HealthCheckResponse_ServingStatus, 1)
	go func() {
		watchStream := m.health.Watch(&grpc_health_v1.HealthCheckRequest{Service: service})
		for {
			resp, err := watchStream.Recv()
			if err != nil {
				close(ch)
				return
			}
			select {
			case <-ctx.Done():
				close(ch)
				return
			case ch <- resp.Status:
			}
		}
	}()
	return ch
}
```

```python
# Python — Client-side health check with service config injection
import grpc
from grpc_health.v1 import health_pb2, health_pb2_grpc


class HealthChecker:
    """Client-side health check for gRPC services."""

    def __init__(self, target: str, timeout: float = 5.0):
        self._target = target
        self._timeout = timeout

    async def check(self, service: str = "") -> str:
        """Unary health check: returns SERVING, NOT_SERVING, or UNKNOWN."""
        channel = grpc.aio.insecure_channel(self._target)
        stub = health_pb2_grpc.HealthStub(channel)

        request = health_pb2.HealthCheckRequest(service=service)
        try:
            response = await asyncio.wait_for(
                stub.Check(request), timeout=self._timeout
            )
            return health_pb2.HealthCheckResponse.Status.Name(response.status)
        except asyncio.TimeoutError:
            return "TIMEOUT"
        except grpc.aio.AioRpcError as e:
            return f"ERROR:{e.code().name}"
        finally:
            await channel.close()

    async def watch(self, service: str = ""):
        """Server-streaming health watch: yields status changes."""
        channel = grpc.aio.insecure_channel(self._target)
        stub = health_pb2_grpc.HealthStub(channel)

        request = health_pb2.HealthCheckRequest(service=service)
        try:
            stream = stub.Watch(request)
            async for response in stream:
                yield health_pb2.HealthCheckResponse.Status.Name(response.status)
        finally:
            await channel.close()


# Example: Kubernetes readiness probe caller
async def readiness_probe(target: str, service: str) -> bool:
    """Returns True if the service reports SERVING status."""
    checker = HealthChecker(target)
    status = await checker.check(service)
    return status == "SERVING"
```

### Pattern 3: Service Config with Retry Policies and Load Balancing

JSON service configuration controls timeouts, retry policies, load balancing algorithms, and message size limits. Deploy via DNS TXT records (`_grpc-config.<service>.<domain>`) or inject programmatically on the client channel.

```jsonc
// service-config.json — Full service configuration
{
  "loadBalancingConfig": [
    {"round_robin": {}},
    {"pick_first": {}}
  ],
  "methodConfig": [
    {
      "name": [{"service": "myapp.v1.MyService"}],
      "waitForReady": true,
      "timeout": "30s",
      "retryPolicy": {
        "maxAttempts": 3,
        "initialBackoff": "0.1s",
        "maxBackoff": "1s",
        "backoffMultiplier": 2,
        "retryableStatusCodes": ["UNAVAILABLE", "DEADLINE_EXCEEDED"]
      },
      "hedgingPolicy": {
        "maxAttempts": 5,
        "hedgingThreshold": 0.7,
        "hedgedRequestLimit": 10,
        "non HedgedRequestCountLimit": 5,
        "retryStatusCodes": ["UNAVAILABLE"]
      },
      "interceptorParams": [],
      "responseMessageSize": 10485760
    },
    {
      "name": [{"service": "myapp.v1.MyService", "method": "GetUser"}],
      "timeout": "5s",
      "retryPolicy": null,
      "interceptorParams": [],
      "responseMessageSize": 1048576
    },
    {
      "name": [{}],
      "timeout": "10s",
      "maxRequestMessageBytes": 4194304,
      "maxResponseMessageBytes": 4194304,
      "retryPolicy": null
    }
  ],
  "methodConfig": [
    {
      "name": [{"service": "grpc.health.v1.Health"}],
      "timeout": "2s"
    }
  ]
}
```

```go
// Go — Programmatic service config injection with retry throttling
package main

import (
	"encoding/json"
	"fmt"

	"google.golang.org/grpc"
	"google.golang.org/grpc/resolver"
)

func dialWithServiceConfig(target string, configJSON []byte) (*grpc.ClientConn, error) {
	// Validate the service config before applying it.
	var config grpc.ServiceConfig
	err := json.Unmarshal(configJSON, &config)
	if err != nil {
		return nil, fmt.Errorf("invalid service config JSON: %w", err)
	}

	conn, err := grpc.Dial(
		target,
		grpc.WithDefaultServiceConfig(string(configJSON)),
		grpc.WithDefaultCallOptions(
			grpc.MaxCallRecvMsgSize(50*1024*1024), // 50MB max response
			grpc.MaxCallSendMsgSize(50*1024*1024),  // 50MB max request
		),
		grpc.WithUserAgent("myapp/1.0.0"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to dial %s: %w", target, err)
	}

	return conn, nil
}

// BuildServiceConfig constructs a service config programmatically,
// avoiding JSON string escaping issues.
func BuildServiceConfig() string {
	type methodConfig struct {
		Name            []methodEntry       `json:"name"`
		Timeout         *string             `json:"timeout,omitempty"`
		RetryPolicy     *retryPolicy        `json:"retryPolicy,omitempty"`
		HedgingPolicy   *hedgingPolicy      `json:"hedgingPolicy,omitempty"`
		ResponseSize    *int                `json:"responseMessageSize,omitempty"`
		MaxReqSize      *int                `json:"maxRequestMessageBytes,omitempty"`
		MaxRespSize     *int                `json:"maxResponseMessageBytes,omitempty"`
		WaitForReady    *bool               `json:"waitForReady,omitempty"`
	}
	type methodEntry struct {
		Service string `json:"service,omitempty"`
		Method  string `json:"method,omitempty"`
	}
	type retryPolicy struct {
		MaxAttempts         int      `json:"maxAttempts"`
		InitialBackoff      string   `json:"initialBackoff"`
		MaxBackoff          string   `json:"maxBackoff"`
		BackoffMultiplier   float64  `json:"backoffMultiplier"`
		RetryableStatusCodes []string `json:"retryableStatusCodes"`
	}
	type hedgingPolicy struct {
		MaxAttempts            int      `json:"maxAttempts"`
		HedgingThreshold       float64  `json:"hedgingThreshold"`
		HedgedRequestLimit     int      `json:"hedgedRequestCountLimit"`
		NonHedgedRequestLimit  int      `json:"nonHedgedRequestCountLimit"`
		RetryStatusCodes       []string `json:"retryStatusCodes"`
	}

	cfg := map[string]interface{}{
		"loadBalancingConfig": []map[string]interface{}{
			{"round_robin": {}},
		},
		"methodConfig": []map[string]interface{}{
			{
				"name":         []map[string]string{{"service": "myapp.v1.MyService"}},
				"timeout":      "30s",
				"waitForReady": true,
				"retryPolicy": map[string]interface{}{
					"maxAttempts":          3,
					"initialBackoff":       "0.1s",
					"maxBackoff":           "1s",
					"backoffMultiplier":    2.0,
					"retryableStatusCodes": []string{"UNAVAILABLE", "DEADLINE_EXCEEDED"},
				},
				"responseMessageSize": 10485760, // 10MB
			},
			{
				"name":         []map[string]string{{}}, // Default for all methods
				"timeout":      "10s",
				"maxRequestMessageBytes":  4194304,  // 4MB
				"maxResponseMessageBytes": 4194304,  // 4MB
			},
		},
	}

	data, _ := json.Marshal(cfg)
	return string(data)
}
```

```python
# Python — Client channel with service config and retry throttling
import grpc


def create_client_with_retry(target: str, service_config: dict) -> grpc.aio.Channel:
    """Create a gRPC channel with JSON service config for retry policies."""
    import json

    # Retry throttling: token bucket limits excessive retries to prevent thundering herd.
    retry_throttling = {
        "maxTokens": 10,              # Max concurrent retry tokens
        "tokenRatio": 0.1,            # Refill 10% of maxTokens per second
    }

    channel = grpc.aio.insecure_channel(
        target,
        options=[
            ("grpc.service_config", json.dumps(service_config)),
            ("grpc.keepalive_time_ms", 30_000),
            ("grpc.keepalive_timeout_ms", 10_000),
            ("grpc.keepalive_permit_without_calls", 1),
            ("grpc.http2.max_pings_without_data", 0),  # Unlimited (per gRPC spec)
            ("grpc.max_send_message_length", 50 * 1024 * 1024),
            ("grpc.max_receive_message_length", 50 * 1024 * 1024),
        ],
    )
    return channel


# Example service config in Python dict form (serializes to JSON)
DEFAULT_SERVICE_CONFIG = {
    "methodConfig": [
        {
            "name": [{"service": "myapp.v1.MyService"}],
            "timeout": "30s",
            "retryPolicy": {
                "maxAttempts": 3,
                "initialBackoff": "0.1s",    # First retry after 100ms
                "maxBackoff": "1s",          # Capped at 1s
                "backoffMultiplier": 2,      # Exponential: 100ms -> 200ms -> 400ms
                "retryableStatusCodes": [
                    "UNAVAILABLE",
                    "DEADLINE_EXCEEDED",
                ],
            },
            "responseMessageSize": 10_485_760,  # 10MB response limit
        }
    ]
}
```

### Pattern 4: TLS/mTLS Configuration

Server-side TLS with `credentials.NewTLS()` (Go) or `grpc.ssl_channel_credentials()` (Python). Mutual authentication requires both server and client to present valid certificates signed by a shared CA.

```go
// Go — TLS and mTLS configuration
package main

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

// NewTLSServerCredentials loads TLS credentials from PEM files.
func NewTLSServerCredentials(certFile, keyFile, caCertFile string) (credentials.TransportCredentials, error) {
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return nil, fmt.Errorf("load server cert: %w", err)
	}

	// Load CA certificate for client verification (mTLS)
	caCert, err := os.ReadFile(caCertFile)
	if err != nil {
		return nil, fmt.Errorf("load CA cert: %w", err)
	}
	caPool := x509.NewCertPool()
	if !caPool.AppendCertsFromPEM(caCert) {
		return nil, fmt.Errorf("failed to parse CA certificate")
	}

	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		ClientAuth:   tls.RequireAndVerifyClientCert, // mTLS: require client cert
		ClientCAs:    caPool,
		MinVersion:   tls.VersionTLS12,
	}

	return credentials.NewTLS(tlsConfig), nil
}

// NewInsecureOrTLSCredentials selects transport security based on environment.
func NewInsecureOrTLSCredentials(insecure bool, certDir string) (credentials.TransportCredentials, error) {
	if insecure {
		return credentials.NewInsecure(), nil
	}

	caCertFile := certDir + "/ca.crt"
	serverCertFile := certDir + "/server.crt"
	serverKeyFile := certDir + "/server.key"

	return NewTLSServerCredentials(serverCertFile, serverKeyFile, caCertFile)
}

// StartGRPCServerTLS starts a gRPC server with mTLS configured.
func StartGRPCServerTLS(addr string, creds credentials.TransportCredentials) *grpc.Server {
	opts := []grpc.ServerOption{
		grpc.Creds(creds),
		grpc.MaxRecvMsgSize(50 * 1024 * 1024),
		grpc.MaxSendMsgSize(50 * 1024 * 1024),
	}

	return grpc.NewServer(opts...)
}

// DialTLS creates a TLS-secured client connection.
func DialTLS(target string, insecure bool, certDir string) (*grpc.ClientConn, error) {
	var creds credentials.TransportCredentials
	var err error

	if insecure {
		creds = credentials.NewInsecure()
	} else {
		caCertFile := certDir + "/ca.crt"
		clientCertFile := certDir + "/client.crt"
		clientKeyFile := certDir + "/client.key"

		// Client-side TLS credentials with mutual authentication
		creds, err = credentials.NewClientTLSFromFile(caCertFile, "")
		if err != nil {
			return nil, fmt.Errorf("load client TLS: %w", err)
		}

		// For mTLS, also load client certificate
		cert, certErr := tls.LoadX509KeyPair(clientCertFile, clientKeyFile)
		if certErr == nil {
			tlsConf := &tls.Config{
				Certificates: []tls.Certificate{cert},
			}
			creds = credentials.NewTLS(tlsConf)
		}
	}

	return grpc.Dial(
		target,
		grpc.WithTransportCredentials(creds),
		grpc.WithBlock(),
	)
}
```

```python
# Python — TLS/mTLS configuration and certificate rotation
import os
from pathlib import Path
import grpc


def create_secure_server_credentials(
    cert_chain: str | Path,
    private_key: str | Path,
    root_certs: str | Path | None = None,
) -> grpc.ssl_channel_credentials:
    """Create server-side SSL/TLS credentials with optional client certificate verification."""
    cert_chain_bytes = Path(cert_chain).read_bytes()
    private_key_bytes = Path(private_key).read_bytes()

    if root_certs is not None:
        # mTLS: verify client certificates against a CA
        root_certs_bytes = Path(root_certs).read_bytes()
        return grpc.ssl_channel_credentials(
            root_certificates=root_certs_bytes,
            private_key=private_key_bytes,
            certificate_chain=cert_chain_bytes,
        )

    # TLS only (server-side encryption, no client cert required)
    return grpc.ssl_channel_credentials(
        private_key=private_key_bytes,
        certificate_chain=cert_chain_bytes,
    )


def create_secure_client_credentials(
    target: str,
    cert_dir: str | Path = "/etc/ssl/certs",
    use_mtls: bool = True,
) -> grpc.aio.Channel:
    """Create a TLS-secured client channel with optional mTLS."""
    ca_cert_path = Path(cert_dir) / "ca.crt"
    client_cert_path = Path(cert_dir) / "client.pem"

    if use_mtls and client_cert_path.exists():
        # mTLS: both client and server present certificates
        client_pem = client_cert_path.read_bytes()
        ca_pem = ca_cert_path.read_bytes()

        credentials = grpc.ssl_channel_credentials(
            root_certificates=ca_pem,
            private_key=client_pem.split(b"-----BEGIN PRIVATE KEY-----")[0],
            certificate_chain=client_pem,
        )
    else:
        # TLS only
        ca_pem = ca_cert_path.read_bytes() if ca_cert_path.exists() else None
        credentials = grpc.ssl_channel_credentials(
            root_certificates=ca_pem,
        )

    return grpc.aio.secure_channel(target, credentials)


# Example usage: certificate rotation without restart
# Load fresh certificates periodically and update server/channel credentials.
class CertRotator:
    """Reloads TLS certificates on a schedule."""

    def __init__(self, cert_dir: str, reload_interval: float = 3600.0):
        self._cert_dir = Path(cert_dir)
        self._reload_interval = reload_interval

    async def get_credentials(self) -> grpc.ssl_channel_credentials:
        """Reload certificates from disk on each call."""
        ca_pem = (self._cert_dir / "ca.crt").read_bytes()
        server_pem = (self._cert_dir / "server.pem").read_bytes()

        # Parse PEM to extract private key and certificate chain
        parts = server_pem.split(b"-----BEGIN PRIVATE KEY-----")
        private_key = b"-----BEGIN PRIVATE KEY-----" + parts[1] if len(parts) > 1 else b""
        cert_chain = server_pem

        return grpc.ssl_channel_credentials(
            root_certificates=ca_pem,
            private_key=private_key,
            certificate_chain=cert_chain,
        )
```

### Pattern 5: Keepalive and Connection Management

Keepalive settings prevent idle connections from being dropped by load balancers (ALB, Nginx, Envoy). Configure `keepalive_time` (ping interval), `keepalive_timeout` (wait for ping response), and `permitWithoutStream` (send pings even with no active RPCs).

```go
// Go — Keepalive configuration for production gRPC clients and servers
package main

import (
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
)

// ClientKeepaliveConfig returns keepalive settings that survive most load balancer idle timeouts.
// ALB default idle timeout: 60s -> set keepalive time to 30s to probe before drop.
func ClientKeepaliveConfig() grpc.DialOption {
	return grpc.WithKeepaliveParams(keepalive.ClientParameters{
		Time:                30 * time.Second, // Send ping every 30s
		Timeout:             10 * time.Second, // Wait 10s for pong before closing
		PermitWithoutStream: true,             // Send pings even when no RPCs are active
	})
}

// ServerKeepaliveConfig returns server-side keepalive parameters.
func ServerKeepaliveConfig() grpc.ServerOption {
	return grpc.WithKeepaliveParams(keepalive.ServerParameters{
		Time:                  30 * time.Second, // Ping client every 30s
		Timeout:               10 * time.Second, // Wait 10s for pong
		MaxConnectionAge:      5 * time.Minute,  // Force reconnect after 5min (rolling updates)
		MaxConnectionIdle:     0,                // No idle timeout — let keepalive handle it
		TimeWithoutHealthCheck: 10 * time.Second, // Deprecated in newer gRPC versions
	})
}

// MaxStreamsConfig limits concurrent streams per connection to prevent resource exhaustion.
func MaxStreamsConfig(max int) grpc.ServerOption {
	return grpc.WithMaxConcurrentStreams(uint32(max))
}

// MessageSizeConfig sets the max message sizes for send and receive.
func MessageSizeConfig(send, recv int) []grpc.ServerOption {
	return []grpc.ServerOption{
		grpc.MaxRecvMsgSize(recv),
		grpc.MaxSendMsgSize(send),
	}
}
```

```python
# Python — Keepalive and connection management options
import grpc


def keepalive_options(
    time_ms: int = 30_000,
    timeout_ms: int = 10_000,
    permit_without_calls: bool = True,
    max_connection_idle_ms: int = 0,
    max_connection_age_ms: int = 300_000,
    max_connection_age_grace_ms: int = 30_000,
) -> list[tuple[str, int | str]]:
    """Build keepalive and connection management options for gRPC channels."""
    return [
        ("grpc.keepalive_time_ms", time_ms),
        ("grpc.keepalive_timeout_ms", timeout_ms),
        ("grpc.keepalive_permit_without_calls", 1 if permit_without_calls else 0),
        ("grpc.http2.max_pings_without_data", 0),  # Unlimited pings allowed
        ("grpc.http2.min_received_ping_interval_without_data_ms", 0),  # No minimum
        ("grpc.max_connection_idle_ms", max_connection_idle_ms),
        ("grpc.max_connection_age_ms", max_connection_age_ms),
        ("grpc.max_connection_age_grace_ms", max_connection_age_grace_ms),
    ]


def message_size_options(max_send: int, max_recv: int) -> list[tuple[str, int]]:
    """Set maximum message send and receive sizes."""
    return [
        ("grpc.max_send_message_length", max_send),
        ("grpc.max_receive_message_length", max_recv),
    ]


# Full production channel options
PRODUCTION_OPTIONS = keepalive_options(
    time_ms=30_000,
    timeout_ms=10_000,
    permit_without_calls=True,
    max_connection_age_ms=300_000,   # 5 min — forces reconnect for rolling deploys
    max_connection_age_grace_ms=30_000,  # 30s grace period after age limit
) + message_size_options(
    max_send=50 * 1024 * 1024,   # 50MB send
    max_recv=50 * 1024 * 1024,   # 50MB receive
)

# Example: Create channel with all production options
async def create_production_channel(target: str) -> grpc.aio.Channel:
    return grpc.aio.secure_channel(
        target,
        credentials=create_secure_client_credentials(target),
        options=PRODUCTION_OPTIONS,
    )
```

### Pattern 6: Flow Control and Backpressure in Streaming

Server-side streaming must be bounded to prevent memory exhaustion from slow consumers. Bidirectional streaming needs explicit acknowledgment patterns so producers know when to throttle.

```go
// Go — Bounded server-streaming with backpressure via channel buffering
package main

import (
	"context"
	"io"
	"sync"
	"time"

	pb "github.com/myorg/service/proto/gen/service/v1"
	"google.golang.org/grpc"
)

const streamBufferSize = 100 // Max buffered messages before backpressure kicks in

// ServerStreamWithBackpressure handles server-streaming RPC with bounded buffer.
func (s *Server) StreamMetrics(req *pb.StreamMetricsRequest, stream pb.MyService_StreamMetricsServer) error {
	ctx := stream.Context()

	// Bounded channel: producer blocks when buffer is full (backpressure).
	ch := make(chan *pb.MetricPoint, streamBufferSize)

	go func() {
		defer close(ch)
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				point, err := s.metricsCollector.Collect(ctx, req)
				if err != nil {
					return
				}

				// Sending on a full channel blocks here — this IS the backpressure.
				if err := stream.Send(point); err != nil {
					return // Client disconnected or context cancelled
				}
			}
		}
	}()

	// Drain the bounded channel, respecting client cancellation.
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case point, ok := <-ch:
			if !ok {
				return nil // Channel closed normally
			}
			if err := stream.Send(point); err != nil {
				return err
			}
		}
	}
}

// BidirectionalStreamWithACK handles bidirectional streaming with explicit ack pattern.
func (s *Server) ProcessEvents(stream pb.MyService_ProcessEventsServer) error {
	ctx := stream.Context()
	var wg sync.WaitGroup
	done := make(chan struct{})

	// Reader goroutine: reads events from client, processes them, sends acks.
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			event, err := stream.Recv()
			if err == io.EOF {
				return
			}
			if err != nil {
				return
			}

			// Process the event (bounded work, never blocks indefinitely).
			result, err := s.eventProcessor.Process(ctx, event)
			if err != nil {
				_ = stream.Send(&pb.EventAck{
					EventId:   event.GetEventId(),
					Succeeded: false,
					Error:     err.Error(),
				})
				continue
			}

			// Send acknowledgment back to client.
			if err := stream.Send(&pb.EventAck{
				EventId:   event.GetEventId(),
				Succeeded: true,
				Result:    result,
			}); err != nil {
				return // Client disconnected
			}
		}
	}()

	// Writer goroutine: sends server-initiated notifications to client.
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case <-ctx.Done():
				return
			case notification := <-s.notificationChan:
				if err := stream.Send(notification); err != nil {
					return // Client disconnected
				}
			}
		}
	}()

	// Wait for either context cancellation or reader completion.
	select {
	case <-ctx.Done():
		wg.Wait()
		return ctx.Err()
	case <-done:
		wg.Wait()
		return nil
	}
}
```

```python
# Python — Flow control with async bounded queue and explicit ack
import asyncio
from collections import deque


class BackpressureStream:
    """Server-streaming with backpressure via asyncio.Queue (bounded buffer)."""

    def __init__(self, max_buffer: int = 100):
        self._queue: asyncio.Queue = asyncio.Queue(maxsize=max_buffer)
        self._done = asyncio.Event()

    async def produce(self, collect_fn, interval: float = 1.0):
        """Producer: collects data and puts into bounded queue."""
        while not self._done.is_set():
            try:
                data = await collect_fn()
                # Put blocks when queue is full — backpressure applied to producer.
                await self._queue.put(data)
            except Exception:
                break
            await asyncio.sleep(interval)

    async def consume(self):
        """Consumer: yields items from bounded queue."""
        while True:
            data = await self._queue.get()
            yield data
            self._queue.task_done()

    def stop(self):
        self._done.set()


class BidirectionalStreamWithACK:
    """Bidirectional streaming with explicit acknowledgment for flow control."""

    def __init__(self, max_buffer: int = 50):
        self._event_queue: asyncio.Queue = asyncio.Queue(maxsize=max_buffer)
        self._ack_queue: asyncio.Queue = asyncio.Queue()

    async def handle_client_stream(self, event_stream):
        """Read from client stream and queue events for processing."""
        async for event in event_stream:
            try:
                # Put blocks if buffer is full — producer gets backpressure.
                await self._event_queue.put(event)
            except asyncio.QueueFull:
                # Client is sending faster than we can process — send NACK.
                yield {"event_id": event.event_id, "succeeded": False, "error": "buffer_full"}

    async def process_and_ack(self):
        """Process events from queue and send acknowledgments."""
        while True:
            event = await self._event_queue.get()
            result = await self.process_event(event)
            ack = {"event_id": event.event_id, "succeeded": True, "result": result}
            yield ack
            self._event_queue.task_done()

    async def process_event(self, event) -> dict:
        """Process a single event (placeholder)."""
        return {"status": "processed", "event_id": event.event_id}
```

---

## Constraints

### MUST DO
- **Always pair `GracefulStop()` with a timeout safety net** using `time.AfterFunc` (Go) or `asyncio.wait_for` (Python) to prevent indefinite blocking on stuck in-flight RPCs
- **Deploy `grpc.health.v1.Health` service on every production gRPC server** — configure per-service status for readiness probes; use default ("") SERVING only when the entire process is healthy
- **Configure keepalive on both client and server** with `Time: 30s`, `Timeout: 10s`, `PermitWithoutStream: true` to survive load balancer idle timeouts (ALB: 60s, Nginx: 60s, Envoy: varies)
- **Enable TLS or mTLS in production** — never use `grpc.WithTransportCredentials(credentials.NewInsecure())` outside development; set `MinVersion: tls.VersionTLS12` or higher
- **Set max message size explicitly** on both client and server channels (`grpc.MaxRecvMsgSize`, `grpc.MaxSendMsgSize`) — default 4MB is too small for production
- **Use bounded channels (not unbounded)** for all server-streaming RPCs to prevent memory exhaustion from slow consumers; the buffer size should reflect your service's tolerance for latency spikes
- **Use separate goroutines/tasks for Recv and Send** on bidirectional streams — gRPC streams are NOT safe for concurrent `SendMsg`/`RecvMsg` calls from different goroutines; coordinate with done channels
- **Propagate trace context via metadata** (`uber-trace-id`, `traceparent`) in both client and server code so distributed traces follow the request through service boundaries
- **Validate JSON service config against the proto schema** before deployment — invalid configs are silently ignored by gRPC clients

### MUST NOT DO
- **Call `Stop()` instead of `GracefulStop()`** when you have in-flight RPCs — `Stop()` immediately rejects all pending calls, causing data loss and client errors
- **Rely on default keepalive settings** (disabled) behind any load balancer, proxy, or firewall — connections will silently die and clients won't reconnect until the next RPC triggers a dial
- **Configure retry policies for non-idempotent methods** — retries of Write/Update/Creat methods that modify state cause duplicate mutations; only retry GET, List, or explicitly marked idempotent methods
- **Share gRPC channels across unrelated request scopes** — create per-service channels with their own connection pools; don't share one channel between all service calls
- **Omit context cancellation checks in streaming handlers** — every streaming RPC must check `ctx.Done()` on each iteration to release resources promptly
- **Hardcode retry backoff multipliers above 2.0** or omit jitter — without jitter (+/-20%), concurrent clients will retry in lockstep causing thundering herd
- **Put secrets (API keys, tokens) in protobuf message fields** — use metadata headers for transport and ensure TLS encryption; secrets in messages can leak to logs and metrics

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [gRPC Documentation](https://grpc.io/docs/) — Official gRPC documentation covering concepts, language guides, performance tuning, and transport security
- [Envoy Proxy Documentation](https://docs.envoyproxy.io/) — Production-grade service mesh proxy with gRPC health checking, load balancing, and circuit breaking integration
- [gRPC Go Keepalive Configuration](https://pkg.go.dev/google.golang.org/grpc/keepalive) — ServerParameters and ClientParameters API for controlling keepalive behavior and connection health
- [gRPC Service Config Specification](https://github.com/grpc/grpc/blob/master/doc/service_config.md) — JSON service config schema including retry policies, load balancing strategies, and timeout configuration
- [OpenTelemetry Semantic Conventions — gRPC](https://opentelemetry.io/docs/specs/semconv/rpc/grpc/) — Standard metric names, span attributes, and trace context propagation for gRPC observability

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `grpc-patterns` | Proto3 design, service handler implementation, interceptors, code generation, status codes |
| `observability-patterns` | OpenTelemetry patterns, metrics dashboards, distributed tracing architecture |
| `microservice-resilience-patterns` | Circuit breakers, bulkhead isolation, fallback strategies beyond gRPC-level retries |
