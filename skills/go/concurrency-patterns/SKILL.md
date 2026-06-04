---




name: concurrency-patterns
description: Implements Go concurrency patterns including goroutines, channels, worker pools, context cancellation, and synchronization for high-performance applications.
license: MIT
compatibility: opencode
metadata:
  archetypes: implementation
  anti_triggers: debugging, inefficient, blocking
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  version: "1.0.0"
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  triggers: go concurrency, go goroutines, go channels, worker pool, synchronization, context cancellation




---





# Go Concurrency Patterns
This skill provides a comprehensive overview of Go concurrency patterns, focusing on the effective use of goroutines and channels. It covers the standard library's tools for synchronization and how to manage concurrent tasks safely in high-performance applications.

## TL;DR Checklist
- [ ] Use channels to communicate between goroutines — never share memory directly.
- [ ] Always cancel goroutines using a context to prevent leaks.
- [ ] Use `sync.WaitGroup` to manage task completion in worker pools.
- [ ] Access shared state with `sync.Mutex` or `sync.RWMutex` — avoid concurrent writes without locks.
- [ ] Implement graceful shutdown of goroutines using structured context cancellation.

## Core Workflow
1. **Identify Concurrency Boundaries:** Determine which functions can run concurrently based on their independence with respect to shared resources.  
   **Checkpoint:** Each goroutine should operate on its own data without shared state.
2. **Design Communication Channels:** Define how data flows between goroutines using channels, including directionality (send vs. receive).  
   **Checkpoint:** Use clear channel types: `<-chan T` for receiving only, `chan<- T` for sending only.
3. **Implement Cancellation Logic:** Utilize `context.Context` to manage goroutine lifecycles and allow for graceful shutdowns.  
   **Checkpoint:** Verify that all goroutines terminate promptly when cancellation is requested.
4. **Synchronize Goroutines:** Collect results from concurrent operations using synchronization primitives like `sync.WaitGroup` safely.  
   **Checkpoint:** Ensure all tasks signal completion before exiting the application.
5. **Test for Data Races:** Use `go test -race` to catch concurrency issues during testing.  
   **Checkpoint:** All tests should pass without race conditions detected.

## Implementation Patterns
### Worker Pool Example
**Pattern:** A bounded worker pool implementation that manages concurrency for processing tasks.
#### ❌ BAD — Unbounded Goroutine Spawning
```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func ProcessAll(items []string) []string {
    var results []string

    for _, item := range items {
        go func(i string) {
            result := process(i) // Potential race condition on results
            results = append(results, result)
        }(item)
    }

    time.Sleep(5 * time.Second)  // Inadequate synchronization
    return results
}

func process(item string) string {
    // Simulated processing
    time.Sleep(1 * time.Second)
    return fmt.Sprintf("processed: %s", item)
}
```
**Critique:**
- Spawns a new goroutine for each item, leading to unbounded growth.
- Results collection is not synchronized, causing data races.
- Utilizes `time.Sleep` for synchronization, which is unreliable.

#### ✅ GOOD — Bounded Worker Pool with Context Cancellation
```go
package main

import (
    "context"
    "fmt"
    "sync"
)

type Task struct { 
    Name  string
}

type WorkerPool struct {
    workers int
    tasks   chan Task
    wg      sync.WaitGroup
}

func NewWorkerPool(workers int) *WorkerPool {
    return &WorkerPool{
        workers: workers,
        tasks:   make(chan Task),
    }
}

func (wp *WorkerPool) Start(ctx context.Context) {
    for i := 0; i < wp.workers; i++ {
        wp.wg.Add(1)
        go wp.worker(ctx)
    }
}

func (wp *WorkerPool) worker(ctx context.Context) {
    defer wp.wg.Done()
    for {
        select {
        case task := <-wp.tasks:
            fmt.Println("Processing task:", task.Name)
            process(task)
        case <-ctx.Done():
            return
        }
    }
}

func process(task Task) {
    fmt.Printf("Task: %s processed\n", task.Name)
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    wp := NewWorkerPool(3)
    wp.Start(ctx)

    // Adding tasks
    go func() {
        for i := 0; i < 10; i++ {
            wp.tasks <- Task{Name: fmt.Sprintf("Task-%d", i)}
        }
        close(wp.tasks)
    }()

    wp.wg.Wait()  // Wait for all workers to finish processing
    cancel()      // Cancel context to stop any remaining goroutines
}
```
**Advantages:**
- Limits concurrency to a fixed number of goroutines.
- Uses context for safe cancellation, preventing goroutine leaks.
- `sync.WaitGroup` ensures all tasks are completed.
- Channels effectively manage work distribution.

## Constraints
### MUST DO
- Utilize Go channels to handle communication between goroutines safely.
- Implement context cancellation to prevent goroutine leaks on application shutdown.
- Protect shared state with `sync.Mutex` or `sync.RWMutex` before access.
### MUST NOT DO
- Spawn a goroutine without limiting its numbers and managing resources effectively.
- Ignore cancellation of goroutines, which can result in resource leaks.
- Use `time.Sleep` for synchronization; opt for structured synchronization techniques instead.
---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Go Tour - Concurrency 1](https://go.dev/tour/concurrency/1)
- [Effective Go - Goroutines](https://go.dev/doc/effective_go#goroutines)
- [Worker Pools in Go](https://gobyexample.com/worker-pools)
- [Select Statement Guide](https://gobyexample.com/select)
- [Go Concurrency Patterns](https://talks.golang.org/2012/concurrency.slide#1)
