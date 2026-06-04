---




name: spring-data-jpa
description: Implements Spring Data JPA repository interfaces, derived query methods, JPQL/native @Query annotations, transaction management with rollback rules, pagination with Pageable, and N+1 query optimization using EntityGraph or JOIN FETCH.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: spring data jpa, repository pattern, entity mapping, jpql queries, transaction management, pagination sorting, n plus one problem, derived queries
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - config
    - do-dont
    - patterns
  related-skills: spring-boot-auto-config, spring-security-core




---





# Spring Data JPA Repository & Entity Mapping

Implements Spring Data JPA repository interfaces with derived query methods, JPQL and native SQL `@Query` annotations, declarative transaction management with rollback rules, pagination with `Pageable`/`Slice`, and N+1 query optimization using `@EntityGraph` and `JOIN FETCH`. When loaded, this skill makes the model write typed repository contracts, entity relationship mappings with proper ID generation, and performant data access patterns for production Spring Boot applications.

## TL;DR Checklist

- [ ] Verify all `@Entity` classes use `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` or `SEQUENCE` — never use `TABLE` strategy in production
- [ ] Confirm repository interfaces extend `JpaRepository<T, ID>` with correct type parameters for derived query methods to work
- [ ] Check that all write operations (`save`, `delete`) are wrapped in `@Transactional` on the service layer, not just the repository
- [ ] Ensure pagination uses `Pageable` returning `Page<T>` and sorting uses `Sort.by()` — never load all entities into memory for large datasets
- [ ] Verify N+1 problems are resolved with `@EntityGraph(attributePaths = ...)` or JPQL `JOIN FETCH` in derived queries
- [ ] Confirm `@Transactional` rollback targets only `RuntimeException` and `Error`, not checked exceptions (unless explicitly configured)

---

## When to Use

Use this skill when:

- Designing JPA entity classes with proper ID generation strategies, relationships (`@OneToMany`, `@ManyToOne`, `@ManyToMany`), and column mappings
- Writing Spring Data JPA repository interfaces with derived query methods (`findByNameOrderByCreatedDateDesc`) that translate to JPQL automatically
- Using `@Query` annotations for complex JPQL or native SQL queries with named parameter binding (`@Param`)
- Configuring transaction boundaries with `@Transactional`, including rollback rules, isolation levels, and propagation behavior
- Implementing pagination and sorting with `Page<T>`, `Slice<T>`, and `Pageable` for large result sets
- Solving N+1 query problems by pre-fetching lazy-loaded relationships using `JOIN FETCH` or `@EntityGraph`

---

## When NOT to Use

Avoid this skill for:

- Simple in-memory data access without a database — use Spring Data's `ListCrudRepository` or custom mock implementations instead
- Raw JDBC operations where queryDSL or jOOQ code generation is preferred — these frameworks provide better type safety and query composition
- Database schema migrations — use Flyway or Liquibase for DDL management; JPA `hibernate.hbm2ddl.auto` is for development only
- Real-time event streaming or CQRS read models — Spring Data JPA is an ORM pattern; event sourcing requires different tools

---

## Core Workflow

1. **Define the JPA Entity with Proper ID Generation** — Create a class annotated with `@Entity` and `@Table(name = "entity_name")`. Define the primary key field with `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` for auto-increment tables or `GenerationType.SEQUENCE` for databases supporting sequences (PostgreSQL, Oracle). Use `@Column(name = "...", nullable = false, length = 255)` for explicit column mapping. For relationships, annotate the field with `@ManyToOne(fetch = FetchType.LAZY)` — always prefer LAZY fetch to avoid eager loading entire object graphs. Set cascade types on owning sides (`CascadeType.PERSIST`, `CascadeType.MERGE`) but never use `CascadeType.REMOVE` on `@ManyToOne` relationships unless deletion semantics are explicitly desired.

   **Checkpoint:** Every entity must have a no-argument constructor (required by JPA providers) and a public or protected constructor for field initialization. Verify that `@PrePersist` and `@PreUpdate` callbacks set audit fields (`createdAt`, `updatedAt`) with `OffsetDateTime.now()`. Confirm the entity class is `final` or has a protected no-arg constructor — Hibernate requires this for proxy generation.

2. **Create Repository Interface with Derived Query Methods** — Define an interface extending `JpaRepository<EntityClass, Long>` (or the appropriate ID type). Spring Data JPA translates method names into JPQL queries automatically: `findByNameOrderByCreatedDateDesc(String name)`, `findByStatusAndCreatedAtBetween(Status status, OffsetDateTime start, OffsetDateTime end)`, `countByActiveTrue()`. Add `@Query("SELECT u FROM User u WHERE u.email = :email") Optional<User> findByEmail(@Param("email") String email)` for JPQL queries that derived names cannot express. Use `nativeQuery = true` on `@Query` when the query requires database-specific SQL syntax (window functions, JSON operators).

   **Checkpoint:** Every derived query method must follow Spring Data JPA naming conventions — check that property paths map to actual entity fields or embedded properties. Verify that methods returning a single entity use `Optional<T>` as the return type to avoid `IncorrectResultSizeDataAccessException` when multiple rows match. Confirm pagination-enabled queries declare `Page<T>` or `Slice<T>` as the return type and accept `Pageable` as the last parameter.

3. **Configure Transaction Boundaries with @Transactional** — Apply `@Transactional` at the service layer on methods that perform read-write operations (`save`, `update`, `delete`). Spring Data JPA's built-in repository methods are already transactional (read methods use `REQUIRED` with read-only semantics, write methods use `REQUIRED` without), so custom service methods are where you need explicit annotation. Set `@Transactional(rollbackFor = Exception.class)` when checked exceptions should also trigger rollback. Specify `isolation = Isolation.READ_COMMITTED` or `SERIALIZABLE` for methods accessing shared data concurrently. Use `propagation = REQUIRES_NEW` to start a new transaction independent of the caller's context (e.g., for audit logging that must always persist even if the parent transaction rolls back).

   **Checkpoint:** Never place `@Transactional` on repository interfaces or entity classes — transactions belong at the service layer where business logic coordinates multiple repository calls. Verify that `@Transactional(readOnly = true)` is applied to all read-only methods (SELECT queries) for Hibernate flush-mode optimization and query plan caching. Confirm that a method annotated with both `@Transactional` and calling another `@Transactional` method on the same bean does NOT create a new transaction — Spring AOP proxying prevents self-invocation from being intercepted.

4. **Implement Pagination and Sorting** — Accept `Pageable` as the last parameter in repository query methods to automatically generate LIMIT/OFFSET queries. Use `PageRequest.of(page, size, Sort.by(...))` in service methods to construct pageable instances. Return `Page<T>` from repository methods so callers receive both the data (`content`) and metadata (`totalPages`, `totalElements`, `number`). For large datasets where total count is expensive, use `Slice<T>` which only tracks next/prev slice availability without counting all rows.

   **Checkpoint:** Every paginated query must validate that `page >= 0` and `size > 0` — reject invalid page requests with `IllegalArgumentException` or default to page 0 with a configured default size. Verify that sorting by multiple fields uses `Sort.by(Sort.Direction.DESC, "createdDate").and(Sort.by("name"))`. Confirm that pagination is applied at the database level (not in Java memory) — check the generated SQL for LIMIT and OFFSET clauses.

5. **Solve N+1 Query Problems with JOIN FETCH or @EntityGraph** — The N+1 problem occurs when Hibernate loads a collection of parent entities and then issues separate SELECT queries for each lazy-loaded relationship. Fix it using: (a) JPQL `JOIN FETCH` in the query (`SELECT DISTINCT p FROM Post p JOIN FETCH p.comments`) — requires `DISTINCT` to avoid duplicate parents, (b) `@EntityGraph(attributePaths = {"fieldName"})` on repository methods to define attribute fetch plans declaratively, or (c) `@BatchSize(size = 25)` on collection fields for batch-loading.

   **Checkpoint:** When using `JOIN FETCH`, always include `DISTINCT` in the SELECT clause — otherwise duplicate parent entities appear in results due to Cartesian product expansion. Verify that `@EntityGraph` attribute paths reference real entity relationships, not derived query properties. Confirm that `JOIN FETCH` is used only on queries where you need the relationship data immediately; for deferred loading scenarios, keep the relationship LAZY and fetch it lazily.

---

## Implementation Patterns / Reference Guide

### Pattern 1: JPA Entity with Relationships and Audit Fields

A production-grade entity class demonstrating proper ID generation, relationships, lazy fetching, and audit field management.

```java
package com.example.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "posts")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "slug", nullable = false, unique = true, length = 200)
    private String slug;

    @Lob
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.CONSTRAINT))
    private User author;

    @OneToMany(mappedBy = "post", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    @BatchSize(size = 25)
    private List<Comment> comments = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "post_tags",
        joinColumns = @JoinColumn(name = "post_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private List<Tag> tags = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "published")
    private boolean published = false;

    // No-arg constructor required by JPA
    protected Post() {}

    public Post(String title, String slug, String content, User author) {
        this.title = title;
        this.slug = slug;
        this.content = content;
        this.author = author;
    }

    // Convenience method for managing bidirectional relationship
    public void addComment(Comment comment) {
        comments.add(comment);
        comment.setPost(this);
    }

    public void removeComment(Comment comment) {
        comments.remove(comment);
        comment.setPost(null);
    }

    // Getters — no setters for immutable fields (title, slug, author, createdAt)
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getSlug() { return slug; }
    public String getContent() { return content; }
    public User getAuthor() { return author; }
    public List<Comment> getComments() { return comments; }
    public List<Tag> getTags() { return tags; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public boolean isPublished() { return published; }

    // Setters for mutable fields only
    public void setContent(String content) { this.content = content; }
    public void setPublished(boolean published) { this.published = published; }
}
```

### Pattern 2: Repository with Derived Queries, JPQL @Query, and Pagination

Demonstrates the full spectrum of Spring Data JPA query capabilities in a single repository interface.

```java
package com.example.repository;

import com.example.model.Post;
import com.example.model.Status;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    // --- Derived Query Methods ---

    /**
     * Automatically translates to:
     * SELECT p FROM Post p WHERE p.author.username = ?1 ORDER BY p.createdAt DESC
     */
    List<Post> findByAuthorUsernameOrderByCreatedAtDesc(String username);

    /**
     * Returns Optional — safe when the query might return zero or one result.
     */
    Optional<Post> findBySlug(String slug);

    /**
     * Multi-condition query with sorting — translates to:
     * SELECT p FROM Post p WHERE p.status = ?1 AND p.createdAt BETWEEN ?2 AND ?3
     */
    List<Post> findByStatusAndCreatedAtBetween(Status status, OffsetDateTime start, OffsetDateTime end);

    /**
     * Aggregate query using derived method naming convention.
     */
    long countByPublishedTrue();

    // --- JPQL Queries with @Param Binding ---

    /**
     * Custom JPQL query for complex filtering — requires @Param for named parameters.
     */
    @Query("SELECT DISTINCT p FROM Post p " +
           "JOIN FETCH p.author a " +
           "JOIN FETCH p.tags t " +
           "WHERE p.slug = :slug")
    Optional<Post> findBySlugWithDetails(@Param("slug") String slug);

    /**
     * Native SQL query for database-specific features (JSON operators, window functions).
     */
    @Query(value = "SELECT p.* FROM posts p " +
                   "WHERE to_jsonb(p.tags) @> :tagFilter::jsonb",
           nativeQuery = true)
    List<Post> findByTagContainsNative(@Param("tagFilter") String tagFilter);

    // --- Pagination Methods ---

    /**
     * Returns Page<T> with metadata (totalPages, totalElements).
     */
    @Query("SELECT p FROM Post p WHERE p.published = true AND p.author.username = :username")
    Page<Post> findPublishedByAuthorUsername(@Param("username") String username, Pageable pageable);

    /**
     * Returns Slice<T> for large datasets where total count is expensive.
     */
    @Query("SELECT p FROM Post p WHERE p.createdAt >= :since")
    Slice<Post> findSliceSince(@Param("since") OffsetDateTime since, Pageable pageable);

    // --- EntityGraph for N+1 Prevention (Declarative Fetch Plan) ---

    /**
     * Uses an entity graph to pre-fetch the 'author' and 'tags' relationships.
     * Equivalent to JOIN FETCH in JPQL but defined declaratively.
     */
    @EntityGraph(attributePaths = {"author", "tags"})
    @Override
    Optional<Post> findById(Long id);

    /**
     * EntityGraph with JPQL query — fetches posts with their comments eagerly.
     */
    @EntityGraph(attributePaths = {"comments"})
    @Query("SELECT p FROM Post p WHERE p.published = true")
    Page<Post> findPublishedWithComments(Pageable pageable);
}
```

### Pattern 3: Transaction Management at the Service Layer

Shows proper transaction boundary placement, rollback rules, and read-only optimization.

```java
package com.example.service;

import com.example.model.Post;
import com.example.model.User;
import com.example.repository.PostRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class PostService {

    private final PostRepository postRepository;

    public PostService(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    /**
     * Read-only query — optimized with readOnly=true for Hibernate flush-mode.
     */
    @Transactional(readOnly = true)
    public Page<Post> findPublishedPosts(
            String username, int page, int size) {

        Pageable pageable = PageRequest.of(
                page, size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return postRepository.findPublishedByAuthorUsername(username, pageable);
    }

    /**
     * Write transaction with default rollback behavior (RuntimeException only).
     */
    @Transactional
    public Post createPost(String title, String slug, String content, User author) {
        Post post = new Post(title, slug, content, author);
        return postRepository.save(post);
    }

    /**
     * Transaction that rolls back on ANY exception, including checked exceptions.
     */
    @Transactional(rollbackFor = Exception.class)
    public Post updatePostWithAudit(Long postId, String newContent, String updater) throws Exception {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found: " + postId));

        post.setContent(newContent);
        // Simulated operation that might throw a checked exception
        validateContent(newContent);
        return postRepository.save(post);
    }

    /**
     * New transaction independent of caller — audit log always persists even if parent rolls back.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    public void logAuditEvent(String entityName, Long entityId, String action) {
        // Audit logging logic — always committed independently
        System.out.println("[Audit] " + action + " on " + entityName + "#" + entityId);
    }

    /**
     * Delete with cascading comments using orphanRemoval=true.
     */
    @Transactional(rollbackFor = Exception.class)
    public void deletePost(Long postId) {
        postRepository.findById(postId)
                .ifPresentOrElse(
                        post -> postRepository.delete(post),
                        () -> { throw new IllegalArgumentException("Post not found: " + postId); }
                );
    }

    private void validateContent(String content) throws Exception {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Content must not be blank");
        }
    }
}
```

### Pattern 4: Solving N+1 with JOIN FETCH vs @EntityGraph

Shows the two primary approaches to eliminating N+1 query problems in Spring Data JPA.

```java
package com.example.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "comments")
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Lob
    @Column(nullable = false)
    private String body;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    protected Comment() {}

    public Comment(String body) {
        this.body = body;
    }

    // Bidirectional relationship setter (called by Post.addComment)
    void setPost(Post post) {
        this.post = post;
    }

    public Long getId() { return id; }
    public String getBody() { return body; }
    public Post getPost() { return post; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}

// --- Repository demonstrating N+1 fixes ---

package com.example.repository;

import com.example.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    /**
     * N+1 PROBLEM (BAD): Without fetch strategy, Hibernate loads posts first,
     * then issues N separate SELECTs for comments.
     *
     * SELECT * FROM posts WHERE published = true;  -- 1 query
     * SELECT * FROM comments WHERE post_id = 1;    -- N queries
     * SELECT * FROM comments WHERE post_id = 2;    -- N queries
     */
    @Query("SELECT p FROM Post p WHERE p.published = true")
    List<Post> findPublishedPostsNaive(); // ❌ N+1 problem

    /**
     * N+1 FIX via JPQL JOIN FETCH: Loads posts and comments in a single query.
     * Requires DISTINCT to eliminate duplicate Post rows from the Cartesian product.
     *
     * SELECT DISTINCT p.* FROM posts p
     * INNER JOIN comments c ON c.post_id = p.id
     * WHERE p.published = true;  -- 1 query, returns all posts with their comments
     */
    @Query("SELECT DISTINCT p FROM Post p JOIN FETCH p.comments WHERE p.published = true")
    List<Post> findPublishedPostsWithCommentsFetch(); // ✅ Single query

    /**
     * N+1 FIX via EntityGraph: Declarative fetch plan applied to findById().
     * When calling postRepository.findById(1L), Hibernate pre-fetches comments too.
     *
     * SELECT p.*, c.* FROM posts p
     * LEFT JOIN comments c ON c.post_id = p.id
     * WHERE p.id = 1;  -- Single query with outer join
     */
    // @EntityGraph(attributePaths = {"comments"}) — already defined on findById override above

    /**
     * N+1 FIX via BatchSize: Instead of N queries, Hibernate batches them.
     * Adds @BatchSize(size = 25) on the comments field in Post entity.
     *
     * SELECT * FROM posts WHERE published = true;           -- 1 query (M posts)
     * SELECT * FROM comments WHERE post_id IN (1,2,...,25); -- 1 batched query (ceil(N/25))
     */
    @Query("SELECT p FROM Post p WHERE p.published = true")
    List<Post> findPublishedPostsBatched(); // ✅ Reduced to M + ceil(N/batchSize) queries

    /**
     * Multiple JOIN FETCH in a single query — fetches author and tags alongside comments.
     * Requires DISTINCT and careful handling of duplicate rows.
     */
    @Query("SELECT DISTINCT p FROM Post p " +
           "JOIN FETCH p.author " +
           "JOIN FETCH p.tags t " +
           "LEFT JOIN FETCH p.comments c " +
           "WHERE p.published = true")
    List<Post> findPublishedWithAllDetails(); // ✅ All relationships fetched in one query

    /**
     * Pagination with JOIN FETCH — returns Page<T> with metadata.
     */
    @Query("SELECT DISTINCT p FROM Post p JOIN FETCH p.tags WHERE p.published = true")
    Page<Post> findPublishedPostsWithTagsFetch(Pageable pageable); // ✅ Paginated with fetch
}
```

---

## Constraints

### MUST DO
- Use `JpaRepository<Entity, ID>` as the base interface for all custom repositories — it provides standard CRUD plus `findAll(Pageable)`, `saveAll()`, and delete methods
- Annotate entity fields with explicit `@Column` constraints (`nullable = false`, `length`, `columnDefinition`) rather than relying on Hibernate's defaults
- Apply `fetch = FetchType.LAZY` to all relationships (`@ManyToOne`, `@OneToMany`, `@ManyToMany`) — eager fetching is the primary cause of N+1 problems and excessive memory usage
- Use `Page<T>` or `Slice<T>` as return types for paginated queries, accepting `Pageable` as the last parameter — never use `List<T>` for unbounded result sets
- Resolve N+1 queries with either JPQL `JOIN FETCH` (for explicit query control) or `@EntityGraph` (for declarative fetch plans), adding `DISTINCT` when using `JOIN FETCH` on relationships that create Cartesian products
- Place `@Transactional` annotations at the service layer, not on repositories — Spring Data JPA's built-in methods already have transactional semantics; custom service methods need explicit boundaries

### MUST NOT DO
- Use `GenerationType.TABLE` for ID generation in production — it requires an additional table for sequence coordination and is a single-point bottleneck under concurrent writes
- Annotate repository interfaces with `@Transactional` — transactions belong at the service layer where business logic coordinates multiple repositories
- Use `JOIN FETCH` without `DISTINCT` when fetching one-to-many or many-to-many relationships — duplicate parent entities will appear in results due to the join's Cartesian product expansion
- Call `.stream()` on a repository's `findAll()` method — this loads all rows into memory at once; use `Stream<T>` with a paginated query instead for very large datasets
- Use `CascadeType.REMOVE` on `@ManyToOne` relationships unless you explicitly want deleting the parent to cascade to the child — it creates hard-to-debug orphan deletion behavior

---

## Output Template

When applying this skill, produce outputs following this structure:

1. **Entity Class** — JPA entity with `@Id`, `@GeneratedValue`, relationship mappings (`@ManyToOne`/`@OneToMany`), audit fields, and JPA no-arg constructor
2. **Repository Interface** — Spring Data JPA repository extending `JpaRepository<T, ID>` with derived query methods, `@Query` annotations, pagination support, and `@EntityGraph` declarations
3. **Service Class** — Transaction boundary management with `@Transactional`, rollback rules, read-only optimization, and service-layer composition of multiple repository calls
4. **N+1 Fix Example** — Side-by-side comparison showing the N+1 problem query and the optimized `JOIN FETCH` or `@EntityGraph` solution
5. **Pagination Implementation** — Pageable construction with `Sort.by()`, `PageRequest.of()`, and `Page<T>` return type usage in service methods

---

## Related Skills

| Skill | Purpose |
|---|---|
| `spring-boot-auto-config` | Auto-configuration of DataSource, JPA/Hibernate settings, and Actuator health checks for database availability monitoring |
| `spring-security-core` | Authentication and authorization layer that queries UserDetailsService (which uses JPA repositories) to load user credentials and role assignments from the database |

---

## Live References

1. [Spring Data JPA Reference — Repository Declaration](https://docs.spring.io/spring-data/jpa/reference/repositories.html)
2. [@EntityGraph Documentation](https://docs.spring.io/spring-data/jpa/reference/entity-graphs.html)
3. [JPA @Query with JPQL and Native Queries](https://docs.spring.io/spring-data/jpa/reference/repositories/query-creation.html#repositories.core-concepts.query-methods)
4. [@Transactional Propagation and Isolation](https://docs.spring.io/spring-framework/reference/data-access/transaction.html)
5. [JPA Entity Relationships — @ManyToOne / @OneToMany](https://docs.oracle.com/javaee/7/tutorial/persistence-entityrelationships002.htm)
6. [Pagination and Sorting with Spring Data JPA](https://docs.spring.io/spring-data/jpa/reference/repositories.html#repositories.pagination)
7. [N+1 Problem and Solutions in Hibernate](https://docs.jboss.org/hibernate/orm/current/userguide/single-page/html/#performance-fetching-strategies)
