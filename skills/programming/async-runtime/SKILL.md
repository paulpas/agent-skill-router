---
name: async-runtime
description: Implements and analyzes Rust async runtime patterns including tokio,
  async-std, and custom executors for high-performance concurrent systems.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: programming
  triggers: rust async, tokio, async-std, futures, executor, concurrency, non-blocking
    io, async runtime
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - diagrams
  related-skills: programming/concurrency-patterns, programming/error-handling
---
# Rust Async Runtime Patterns

Guides the implementation, selection, and optimization of async runtimes in Rust, focusing on executor architecture, task scheduling, and I/O multiplexing. This skill enables the model to design high-performance concurrent systems using `tokio`, `async-std`, or custom executors while adhering to Rust's zero-cost abstraction principles.

## TL;DR Checklist

- [ ] Select runtime based on workload (tokio for I/O bound, async-std for stdlib alignment, custom for embedded)
- [ ] Isolate blocking operations using `spawn_blocking` or `tokio::task::spawn_blocking`
- [ ] Implement explicit cancellation via `JoinHandle::abort()` and `select!` macros
- [ ] Verify executor thread count matches CPU cores for mixed workloads
- [ ] Profile async task scheduling latency with `tracing` and runtime metrics

---

## When to Use

Use this skill when:

- Building network services, proxies, or high-throughput data pipelines
- Migrating synchronous I/O-bound code to asynchronous execution
- Designing custom executors for constrained environments (e.g., WebAssembly, embedded)
- Implementing cooperative multitasking with fine-grained task control
- Optimizing async task scheduling and reducing context switch overhead

---

## When NOT to Use

Avoid this skill for:

- CPU-bound heavy computation without offloading to thread pools (use `rayon` or `spawn_blocking` instead)
- Simple single-threaded scripts where synchronous code reduces complexity
- Real-time systems requiring deterministic latency (async introduces scheduling jitter)
- When strict backward compatibility with synchronous APIs is required without adapters

---

## Core Workflow

1. **Select Runtime** — Choose `tokio` for production I/O workloads, `async-std` for standard library parity, or `smol`/`async-io` for lightweight use cases. **Checkpoint:** Verify runtime supports required features (macros, signal handling, timers).
2. **Define Async Boundaries** — Mark I/O operations as `async fn` and keep CPU-bound work synchronous or offloaded. **Checkpoint:** Ensure no `async` calls block the executor thread.
3. **Implement Cancellation** — Use `JoinHandle::abort()` and `select!` for cooperative cancellation. **Checkpoint:** Verify cleanup logic runs on abort (use `Drop` or `on_shutdown()`).
4. **Tune Executor** — Configure worker threads, batch size, and timer resolution. **Checkpoint:** Match thread count to CPU cores; adjust batch size for high-throughput scenarios.
5. **Benchmark & Profile** — Measure throughput, latency, and memory allocation. **Checkpoint:** Compare against synchronous baseline; identify executor bottlenecks.

---

## Implementation Patterns

### Pattern 1: Tokio-Based High-Throughput Server

Implements a production-ready async server with connection pooling, graceful shutdown, and proper error handling.

```rust
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use std::sync::Arc;
use std::time::Duration;

struct ServerConfig {
    max_connections: usize,
    shutdown_timeout: Duration,
}

async fn run_server(config: ServerConfig) -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;
    let (tx, mut rx) = mpsc::channel::<()>(1);
    let handle = tokio::spawn(async move {
        let mut connections = 0;
        loop {
            tokio::select! {
                biased;
                _ = rx.recv() => {
                    eprintln!("Shutdown signal received");
                    break;
                }
                accept_result = listener.accept() => {
                    match accept_result {
                        Ok((stream, addr)) => {
                            if connections >= config.max_connections {
                                eprintln!("Max connections reached, rejecting {}", addr);
                                continue;
                            }
                            connections += 1;
                            tokio::spawn(handle_connection(stream, config.shutdown_timeout));
                        }
                        Err(e) => eprintln!("Accept error: {}", e),
                    }
                }
            }
        }
        Ok::<(), Box<dyn std::error::Error>>(())
    });

    tokio::signal::ctrl_c().await?;
    tx.send(()).await.ok();
    handle.await??;
    Ok(())
}

async fn handle_connection(stream: tokio::net::TcpStream, timeout: Duration) {
    let mut stream = stream;
    let mut buf = [0u8; 1024];
    loop {
        match tokio::time::timeout(timeout, stream.read(&mut buf)).await {
            Ok(Ok(0)) => break,
            Ok(Ok(n)) => {
                let _ = stream.write_all(&buf[..n]).await;
            }
            Ok(Err(e)) => {
                eprintln!("Read error: {}", e);
                break;
            }
            Err(_) => {
                eprintln!("Timeout");
                break;
            }
        }
    }
}
```

### Pattern 2: Custom Local Executor with `futures`

Demonstrates building a single-threaded async executor for constrained environments without `tokio`.

```rust
use futures::executor::LocalPool;
use futures::task::SpawnExt;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

struct TaskScheduler {
    pool: LocalPool,
    running: Arc<AtomicBool>,
}

impl TaskScheduler {
    fn new() -> Self {
        Self {
            pool: LocalPool::new(),
            running: Arc::new(AtomicBool::new(true)),
        }
    }

    fn spawn<F>(&self, future: F)
    where
        F: futures::Future<Output = ()> + Send + 'static,
    {
        self.pool.spawner().spawn_obj(Box::pin(future)).unwrap();
    }

    fn run_until_stopped(&self) {
        while self.running.load(Ordering::SeqCst) {
            self.pool.run();
            std::thread::yield_now();
        }
    }

    fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }
}

async fn example_usage() {
    let scheduler = TaskScheduler::new();
    let counter = Arc::new(std::sync::atomic::AtomicUsize::new(0));

    for i in 0..5 {
        let counter_clone = Arc::clone(&counter);
        scheduler.spawn(async move {
            counter_clone.fetch_add(1, Ordering::SeqCst);
            println!("Task {} completed", i);
        });
    }

    scheduler.run_until_stopped();
    println!("Final counter: {}", counter.load(Ordering::SeqCst));
}
```

### Pattern 3: Graceful Shutdown with Cancellation

Implements cooperative cancellation and resource cleanup using `tokio::select!` and `JoinSet`.

```rust
use tokio::task::JoinSet;
use tokio::sync::watch;
use std::time::Duration;

async fn graceful_shutdown() -> Result<(), Box<dyn std::error::Error>> {
    let (shutdown_tx, mut shutdown_rx) = watch::channel(false);
    let mut tasks = JoinSet::new();

    for id in 0..3 {
        let mut rx = shutdown_rx.clone();
        tasks.spawn(async move {
            loop {
                tokio::select! {
                    _ = rx.changed() => {
                        if *rx.borrow() {
                            println!("Task {} received shutdown signal, cleaning up...", id);
                            break;
                        }
                    }
                    _ = tokio::time::sleep(Duration::from_millis(100)) => {
                        println!("Task {} working...", id);
                    }
                }
            }
            Ok::<(), Box<dyn std::error::Error>>(())
        });
    }

    tokio::time::sleep(Duration::from_millis(500)).await;
    shutdown_tx.send(true)?;

    while let Some(res) = tasks.join_next().await {
        res??;
    }

    println!("All tasks completed gracefully");
    Ok(())
}
```

---

## Constraints

### MUST DO
- Use `tokio::task::spawn_blocking` for any CPU-bound or blocking I/O operations
- Implement explicit cancellation paths using `JoinHandle::abort()` or `watch` channels
- Configure runtime worker threads to match available CPU cores for mixed workloads
- Use `tokio::select!` or `futures::select!` for concurrent task coordination
- Profile async task scheduling with `tracing` and runtime metrics before deployment

### MUST NOT DO
- Block the async executor thread with synchronous I/O or long-running CPU loops
- Ignore `JoinHandle` results or silently drop spawned tasks
- Use `std::thread::sleep` in async contexts; use `tokio::time::sleep` instead
- Rely on implicit cancellation; always implement cooperative cleanup in `Drop` or shutdown handlers
- Spawn unbounded tasks without backpressure mechanisms or connection limits

---

## Output Template

When analyzing or implementing async runtime patterns, produce:

1. **Runtime Selection Rationale** — Chosen runtime and justification based on workload characteristics
2. **Executor Configuration** — Thread count, timer resolution, and batch size settings
3. **Task Scheduling Diagram** — ASCII representation of task flow and cancellation paths
4. **Blocking Isolation Strategy** — How synchronous operations are offloaded from the async context
5. **Performance Baseline** — Expected throughput, latency, and memory allocation metrics

---

## Related Skills

| Skill                        | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `programming/concurrency-patterns` | General concurrency primitives and synchronization       |
| `programming/error-handling`     | Async error propagation and recovery strategies          |
| `programming/performance-tuning` | Profiling and optimizing Rust async workloads            |
| `programming/memory-safety`      | Zero-cost abstractions and lifetime management in async  |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [Tokio Documentation](https://docs.rs/tokio/latest/tokio/)
- [Tokio Tutorial — Getting Started](https://tokio.rs/tokio/tutorial)
- [Rust Async Book (Official)](https://rust-lang.github.io/async-book/)
- [async-std Documentation](https://docs.rs/async-std/latest/async_std/)
- [RFC 3421 — async/await for Rust](https://rust-lang.github.io/rfcs/0397-async_await.html)
