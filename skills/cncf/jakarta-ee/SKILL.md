---
name: jakarta-ee
description: Jakarta EE platform reference covering specifications, APIs, reference implementations, build configuration, and architecture patterns for enterprise Java development.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: jakarta ee, jakarta-ee, enterprise java, servlet, jax-rs, cdi, jsf, ejb, javanamespace migration, javax to jakarta, payara, wildfly, openliberty, tomcat, maven build
  role: reference
  scope: infrastructure
  output-format: manifests
  content-types: [guidance, examples, do-dont, config]
  related-skills: microprofile, jakarta-migration
---

# Jakarta EE Platform

Provides architecture guidance, specification references, and implementation patterns for building enterprise Java applications on the Jakarta EE platform. Acts as a reference for selecting containers, configuring build systems, wiring CDI beans, JAX-RS resources, JPA entities, and JSF pages into production-grade deployments.

## TL;DR Checklist

- [ ] Choose the right container (WildFly for full EE, Payara for GlassFish compatibility, OpenLiberty for modular cloud-native)
- [ ] Use `jakarta.platform:jakarta.jakartaee-api` dependency — never `javax.*` coordinates
- [ ] Configure CDI producers and beans.xml before wiring cross-cutting concerns
- [ ] Set JTA transaction boundaries at the service/manager layer, not on individual DAO methods
- [ ] Include a complete WAR structure with web.xml namespace declarations matching jakarta.* schema

---

## Purpose and Use Cases

Jakarta EE is the open-source evolution of Java EE (formerly J2EE), governed by the Eclipse Foundation. It provides standardized APIs for enterprise application development: servlets, REST services, dependency injection, persistence, messaging, security, and more.

**Use Jakarta EE when:**

- Building large-scale enterprise applications requiring certified platform compatibility
- Migrating from legacy Java EE / GlassFish deployments
- Needing transaction management, connection pooling, and JMS out of the box
- Targeting multi-vendor interoperability (any Jakarta EE 10/11 server runs the same WAR)
- Building services that integrate with MicroProfile for cloud-native capabilities

**Consider Spring Boot instead when:**

- The team has deep Spring ecosystem expertise and no legacy Java EE investments
- You need rapid prototyping with embedded servers and auto-configuration
- The deployment model is exclusively Kubernetes with containerized microservices
- You require non-standard or experimental features before they reach Jakarta EE spec status

**Consider plain Java SE when:**

- The application has no enterprise concerns (no transactions, persistence, or web layer)
- Building CLI tools, background daemons, or simple HTTP servers using frameworks like Spark or javalin
- The team prefers minimal dependencies and explicit configuration over platform conveniences

---

## When to Use

Use this skill when:

- Architecting a new enterprise Java application on a Jakarta EE 10 or 11 server
- Migrating a legacy Java EE 8 (GlassFish, JBoss EAP 7.x) application to Jakarta EE 9+
- Selecting the right container runtime (WildFly full platform vs. OpenLiberty modular vs. Payara)
- Configuring CDI beans, JAX-RS resources, and JPA persistence layers with proper transaction boundaries
- Deploying a WAR-based application to Kubernetes using containerized Jakarta EE servers
- Integrating MicroProfile specifications (health, metrics, config) on top of the Jakarta EE platform
- Setting up database connection pooling and JTA distributed transactions in a multi-datasource environment

---

## When NOT to Use

Avoid this skill for:

- Starting a greenfield microservice project — Spring Boot or Quarkus may be more productive choices
- Building simple HTTP services without enterprise concerns — consider lightweight frameworks like Spark Java, Javalin, or Helidon SE
- Containerizing Node.js, Python, or Go applications — Jakarta EE is exclusively for the Java ecosystem

---

## Core Workflow

1. **Select Container Runtime** — Choose the appropriate Jakarta EE server based on requirements:
   - Full platform compliance (EJB, JMS, Batch): WildFly or Payara Server
   - Cloud-native with modular features and fast startup: OpenLiberty
   - Small footprint with existing Tomcat infrastructure: TomEE
   - Native GraalVM compilation: Quarkus (Jakarta EE compatibility mode)
   **Checkpoint:** Verify the chosen server supports at least Jakarta EE 10 Web Profile for the target deployment environment.

2. **Configure Build Dependencies** — Declare `jakarta.platform:jakarta.jakartaee-api` with `<scope>provided</scope>` in pom.xml. For fine-grained control, declare individual jakarta.* API dependencies instead of the umbrella artifact. Never add implementation JARs as compile-time dependencies.
   **Checkpoint:** Run `mvn dependency:tree` to confirm no javax.* artifacts appear in the transitive dependency graph.

3. **Wire CDI Components** — Define beans with appropriate scopes (`@RequestScoped` for web-layer, `@ApplicationScoped` for stateless services). Configure `beans.xml` with `bean-discovery-mode="annotated"` or `"all"`. Add producer methods for cross-cutting concerns (datasources, interceptors).
   **Checkpoint:** Ensure every injected dependency has exactly one qualifying bean or is wrapped in Optional.

4. **Configure Persistence Layer** — Define `persistence.xml` with JTA-managed entity manager factory. Annotate service methods with `@TransactionAttribute` (REQUIRED for writes, SUPPORTS for reads). Never annotate repository/DAO methods with transaction attributes — they inherit from the caller.
   **Checkpoint:** Verify all entity classes have `@Entity`, `@Table`, and a default no-arg constructor required by JPA providers.

5. **Deploy as Packaged WAR** — Package the application using Maven Assembly or Shade plugin for uber-jars, or use container-native deployment (copy .war to config/apps/ for OpenLiberty). For Kubernetes, create a ConfigMap with the artifact and mount it into the container.
   **Checkpoint:** Test deployment on a local Jakarta EE reference server before pushing to CI/CD pipeline artifacts.

---

## Architecture Design Patterns

### Jakarta EE Component Model

Jakarta EE applications follow a layered architecture where the container provides lifecycle management for each component type:

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│              (Browser, Mobile, REST Consumer)            │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / JMS
┌───────────────────────▼─────────────────────────────────┐
│                Web Tier                                  │
│  ┌────────────┐  ┌──────────┐  ┌─────────────────────┐  │
│  │   JSF      │  │ JAX-RS   │  │ Servlet Filter Chain│  │
│  │ (Faces)    │  │ Resources│  │ Security / Logging  │  │
│  └─────┬──────┘  └────┬─────┘  └──────────┬──────────┘  │
│        │              │                    │             │
│  ┌─────▼──────────────▼────────────────────▼──────────┐  │
│  │               CDI Context & DI Container            │  │
│  │  (Wires beans, manages scopes: @RequestScoped,     │  │
│  │   @SessionScoped, @ApplicationScoped, @Conversation)│  │
│  └─────────────────────┬──────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────┘
                         │ JPA / JDBC / JMS
┌────────────────────────▼─────────────────────────────────┐
│               Persistence Tier                           │
│  ┌────────────┐  ┌──────────┐  ┌─────────────────────┐  │
│  │   JPA      │  │  JTA     │  │  Connection Pool    │  │
│  │ (Hibernate)│  │ Tx Mgr   │  │  (HikariCP/Tomcat)  │  │
│  └─────┬──────┘  └──────────┘  └─────────────────────┘  │
│        │                                                  │
│  ┌─────▼──────────────────────────────────────────────┐  │
│  │              Database (JDBC)                        │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

          Background Tier: Message-Driven Beans (JMS consumers)
          Scheduled Tasks @Schedule / Concurrency Utils
```

### WAR Structure

A Jakarta EE web application packaged as a WAR follows this standard layout:

```
myapp.war
├── META-INF/
│   ├── MANIFEST.MF
│   └── context.xml           # Container-specific configuration
├── WEB-INF/
│   ├── web.xml               # Deployment descriptor (optional in EE 10+)
│   ├── beans.xml             # CDI configuration
│   ├── persistence.xml       # JPA entity manager factory config
│   ├── faces-config.xml      # JSF navigation config (if used)
│   └── classes/
│       └── com/example/
│           ├── resource/
│           │   └── MyResource.class        # JAX-RS
│           ├── service/
│           │   ├── UserService.class       # CDI @ApplicationScoped
│           │   └── UserDTO.class
│           ├── repository/
│           │   └── UserRepository.class    # JPA DAO
│           ├── entity/
│           │   └── UserEntity.class        # @Entity
│           └── interceptor/
│               └── LoggingInterceptor.class
├── resources/
│   └── application.properties
└── index.html                # Static web content
```

### Key Build Configuration

The build system declares the Jakarta EE API dependency and compiles against it. The actual implementation is provided by the runtime container at deployment time:

```xml
<!-- pom.xml — Jakarta EE 10 Web Profile -->
<dependency>
    <groupId>jakarta.platform</groupId>
    <artifactId>jakarta.jakartaee-api</artifactId>
    <version>10.0.0</version>
    <scope>provided</scope>
</dependency>

<!-- Specific API dependencies for precise control -->
<dependency>
    <groupId>jakarta.servlet</groupId>
    <artifactId>jakarta.servlet-api</artifactId>
    <version>6.1.0</version>
    <scope>provided</scope>
</dependency>
<dependency>
    <groupId>jakarta.enterprise</groupId>
    <artifactId>jakarta.enterprise.cdi-api</artifactId>
    <version>4.1.0</version>
    <scope>provided</scope>
</dependency>
<dependency>
    <groupId>jakarta.ws.rs</groupId>
    <artifactId>jakarta.ws.rs-api</artifactId>
    <version>3.1.0</version>
    <scope>provided</scope>
</dependency>
```

### Component Interaction Flow

**REST API request lifecycle:**

1. HTTP request enters the container (WildFly/Payara/OpenLiberty)
2. CDI creates or retrieves a request-scoped proxy for the JAX-RS resource class
3. The JAX-RS runtime dispatches to the method annotated with `@GET`, `@POST`, etc.
4. CDI dependency injection populates `@Inject` fields (services, repositories)
5. The service layer invokes JPA repository methods
6. JTA coordinates the transaction — begins before first DB call, commits after response
7. Response serializes to JSON/XML via Jakarta JSON-P or JSON-B

---

## Key Specifications Table

| Specification | Spec Number | Maven Group ID | Brief Description |
|--------------|-------------|----------------|-------------------|
| **Servlet** | JSR 369 / 6.0 | `jakarta.servlet` | HTTP request/response processing, filter chains, session management |
| **JAX-RS** | JSR 388 / 3.1 | `jakarta.ws.rs` | RESTful web services with annotations (`@Path`, `@GET`, `@POST`) |
| **CDI** | JSR 365 / 4.0 | `jakarta.enterprise` | Dependency injection, contextual lifecycle, events, interceptors, alternatives |
| **JPA** | JSR 338 / 3.1 | `jakarta.persistence` | Object-relational mapping, entity management, JPQL queries |
| **JSF** | JSR 372 / 4.0 | `jakarta.faces` | Component-based web UI framework with server-side state management |
| **EJB** | JSR 383 / 4.0 | `jakarta.ejb` | Enterprise JavaBeans — session beans, message-driven beans, timers |
| **Bean Validation** | JSR 380 / 3.0 | `jakarta.validation` | Declarative constraint validation (`@NotNull`, `@Size`, custom validators) |
| **JSON-P** | JSR 374 / 3.1 | `jakarta.json` | Streaming (JsonReader/Writer) and object model (JsonObject) JSON processing |
| **JSON-B** | JSR 367 / 2.0 | `jakarta.json.bind` | Java-to-JSON binding with annotations (`@JsonbProperty`, type adapters) |
| **JMS** | JSR 238 / 3.1 | `jakarta.jms` | Messaging API — queues, topics, producers, consumers, message listeners |
| **JTA** | JSR 907 / 2.1 | `jakarta.transaction` | Distributed transaction management, `@Transactional`, UserTransaction |
| **WebSocket** | JSR 368 / 3.1 | `jakarta.websocket` | Full-duplex bidirectional communication over a single TCP connection |
| **Interceptors** | JSR 318 / 3.0 | `jakarta.interceptor` | AOP-style cross-cutting concerns — logging, security, transactions |
| **Security** | JSR 375 / 3.1 | `jakarta.security.enterprise` | Programmatic and declarative authentication, identity stores |
| **Concurrency Utils** | JSR 236 / 2.0 | `jakarta.concurrent` | Managed thread pools, async execution, managed executors |
| **Mail** | JSR 337 / 2.1 | `jakarta.mail` | Email sending/receiving API (Eclipse Mail) |

---

## Reference Implementations

| Server | Description | Best Used For | Notable Features |
|--------|-------------|---------------|------------------|
| **WildFly** (JBoss) | Red Hat's reference implementation of Jakarta EE Full Platform | Large enterprises, microservices with full EE spec support | WildFly Swarm/JAR overlay for uber-jar distribution, Kubernetes operators, extensive management CLI |
| **Payara Server** | GlassFish-based server with commercial support options | Migration from Oracle/Sun GlassFish, high-availability clusters | Auto-deployment of MicroProfile, built-in clustering (Hazelcast), Payara Micro for lightweight deployment |
| **OpenLiberty** (IBM) | Modular, cloud-native Jakarta EE server | Containerized deployments, fast startup in Kubernetes | Feature-based activation (only load what you need), rapid restart, OpenTelemetry built-in, Liberty Profile |
| **TomEE** | Apache Tomcat + EJB/CDI/JAX-RS addons | Lightweight deployments, teams already using Tomcat | Smallest footprint of full EE servers, pluggable profiles (Plus, PlusJSR356, JavaEE), Maven plugin for assembly |
| **Quarkus** | Cloud-native Java framework with Jakarta EE compatibility | Native compilation with GraalVM, Kubernetes-first architecture | Super-fast startup (< 1s), dev mode with hot reload, extension-based architecture, not a full container but supports most specs |

---

## Integration Approaches

### MicroProfile Integration

MicroProfile sits on top of Jakarta EE as a cloud-native overlay. It adds specifications focused on microservice operational concerns:

```xml
<!-- Enable MicroProfile features in pom.xml -->
<dependency>
    <groupId>org.eclipse.microprofile</groupId>
    <artifactId>microprofile</artifactId>
    <version>6.1</version>
    <type>pom</type>
    <scope>provided</scope>
</dependency>
```

On WildFly, install the MicroProfile feature: `feature-manager add microprofile-6.1`
On OpenLiberty, add features to `server.xml`: `<feature>microprofile-6.1</feature>`

### Database Connectivity

JPA with JTA provides transaction-scoped persistence contexts:

```java
@Stateless
public class UserService {

    @PersistenceContext(unitName = "default")
    private EntityManager entityManager;

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public UserDTO createUser(UserCreateRequest request) {
        // Transaction begins before this line, commits after return
        UserEntity entity = new UserEntity();
        entity.setUsername(request.username());
        entity.setEmail(request.email());
        
        entityManager.persist(entity);
        
        // Convert to DTO for layer boundary separation
        return mapToDto(entity);
    }
}
```

### JMS Messaging

Jakarta EE containers provide managed connection factories and resource adapters:

```java
@Stateless
public class OrderMessageProcessor implements MessageListener {

    @Resource(lookup = "java:comp/env/jms/OrderConnectionFactory")
    private ConnectionFactory connectionFactory;

    @PersistenceContext(unitName = "orderDatabase")
    private EntityManager entityManager;

    @Override
    public void onMessage(Message message) {
        try {
            if (message instanceof TextMessage textMsg) {
                Order order = parseOrder(textMsg.getText());
                processOrder(order);
                // JTA transaction commits with the EJB method completion
            }
        } catch (JMSException e) {
            LOGGER.error("Failed to process JMS message", e);
            throw new RuntimeException("Message processing failed", e);
        }
    }

    private void processOrder(Order order) {
        OrderEntity entity = new OrderEntity();
        entity.setOrderId(order.id());
        entity.setStatus("PROCESSING");
        entityManager.persist(entity);
    }
}
```

### Kubernetes Deployment Manifest

Complete deployment for a Jakarta EE application on OpenLiberty:

```yaml
# kubernetes/deployment.yaml — Jakarta EE app on OpenLiberty
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enterprise-app
  labels:
    app: enterprise-app
    version: v1.0.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: enterprise-app
  template:
    metadata:
      labels:
        app: enterprise-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9080"
    spec:
      containers:
        - name: enterprise-app
          image: openliberty/wlp-javaee10:24.0.0.12-full-jre
          ports:
            - containerPort: 9080
              name: http
            - containerPort: 9443
              name: https
            - containerPort: 9090
              name: mgmt
          volumeMounts:
            - name: app-deployments
              mountPath: /config/configDropins/defaults/autoscale.xml
              subPath: autoscale.xml
            - name: myapp
              mountPath: /config/apps/myapp.war
              subPath: myapp.war
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /liveness
              port: 9080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readiness
              port: 9080
            initialDelaySeconds: 20
            periodSeconds: 5
      volumes:
        - name: myapp
          configMap:
            name: app-artifacts
        - name: app-deployments
          configMap:
            name: openliberty-config

---
# Service exposing the application
apiVersion: v1
kind: Service
metadata:
  name: enterprise-app-service
spec:
  selector:
    app: enterprise-app
  ports:
    - port: 80
      targetPort: 9080
      name: http
  type: ClusterIP
```

---

## Complete Working Example

### JAX-RS Resource with CDI, JPA, and Bean Validation

```java
package com.example.resource;

import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.stream.Collectors;

@Path("users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {

    @Inject
    private UserService userService;

    @GET
    public Response getAllUsers() {
        List<UserDTO> users = userService.findAll();
        return Response.ok(users).build();
    }

    @GET
    @Path("{id}")
    public Response getUserById(@PathParam("id") Long id) {
        UserDTO user = userService.findById(id);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErrorResponse("User not found: " + id)).build();
        }
        return Response.ok(user).build();
    }

    @POST
    @Transactional
    public Response createUser(@Valid UserCreateRequest request) {
        // Bean Validation intercepts here — @Valid triggers constraint checks
        // on the request body before this method body executes
        UserDTO created = userService.create(request);
        return Response.status(Response.Status.CREATED)
                .location(java.net.URI.create("/users/" + created.id()))
                .entity(created).build();
    }

    @PUT
    @Path("{id}")
    @Transactional
    public Response updateUser(@PathParam("id") Long id, @Valid UserUpdateRequest request) {
        UserDTO updated = userService.update(id, request);
        if (updated == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(updated).build();
    }

    @DELETE
    @Path("{id}")
    @Transactional
    public Response deleteUser(@PathParam("id") Long id) {
        boolean deleted = userService.delete(id);
        if (!deleted) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.noContent().build();
    }

    // Validation request DTO — Bean Validation annotations are enforced by @Valid
    public record UserCreateRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        String username,

        @NotBlank(message = "Email is required")
        @Email(message = "Must be a valid email address")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password
    ) {}

    public record ErrorResponse(String message) {}
}
```

### CDI Service Layer with JPA Persistence

```java
package com.example.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaDelete;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import jakarta.transaction.Transactional;

@ApplicationScoped
@Transactional
public class UserService {

    @Inject
    private EntityManager entityManager;

    public UserDTO findById(Long id) {
        var entity = entityManager.find(UserEntity.class, id);
        return entity != null ? toDto(entity) : null;
    }

    public java.util.List<UserDTO> findAll() {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<UserEntity> query = cb.createQuery(UserEntity.class);
        Root<UserEntity> root = query.from(UserEntity.class);
        query.select(root).orderBy(cb.asc(root.get("username")));

        TypedQuery<UserEntity> typedQuery = entityManager.createQuery(query);
        return typedQuery.getResultStream().map(this::toDto)
                .collect(java.util.stream.Collectors.toList());
    }

    public UserDTO create(UserResource.UserCreateRequest request) {
        // Check uniqueness before persisting
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<UserEntity> root = countQuery.from(UserEntity.class);
        countQuery.select(cb.count(root))
                .where(cb.equal(root.get("username"), request.username()));

        Long existingCount = entityManager.createQuery(countQuery).getSingleResult();
        if (existingCount > 0) {
            throw new IllegalStateException("Username already exists: " + request.username());
        }

        UserEntity entity = new UserEntity();
        entity.setUsername(request.username());
        entity.setEmail(request.email());
        entity.setPasswordHash(hashPassword(request.password()));
        entityManager.persist(entity);
        entityManager.flush(); // Ensure ID is assigned

        return toDto(entity);
    }

    public boolean delete(Long id) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaDelete<UserEntity> delete = cb.createCriteriaDelete(UserEntity.class);
        Root<UserEntity> root = delete.from(UserEntity.class);
        delete.where(cb.equal(root.get("id"), id));
        int affected = entityManager.createQuery(delete).executeUpdate();
        return affected > 0;
    }

    private String hashPassword(String rawPassword) {
        // In production, use BCrypt or Argon2 — shown here for example completeness
        return java.security.MessageDigest.getInstance("SHA-256")
                .digest(rawPassword.getBytes(java.nio.charset.StandardCharsets.UTF_8))
                .map(b -> String.format("%02x", b))
                .reduce("", String::concat);
    }

    private UserDTO toDto(UserEntity entity) {
        return new UserDTO(
            entity.getId(),
            entity.getUsername(),
            entity.getEmail()
            // Password hash is never exposed in the DTO
        );
    }

    public record UserDTO(Long id, String username, String email) {}
}
```

### JPA Entity with Bean Validation

```java
package com.example.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Entity
@Table(name = "app_users",
       uniqueConstraints = @UniqueConstraint(columnNames = "username"))
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50)
    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Email
    @NotBlank(message = "Email is required")
    @Column(nullable = false, length = 120)
    private String email;

    @NotBlank
    @Size(min = 8)
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Default constructor required by JPA
    protected UserEntity() {}

    public UserEntity(String username, String email, String passwordHash) {
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
```

---

## Common Pitfalls

| Pitfall | Cause | Prevention |
|---------|-------|------------|
| **javax vs jakarta namespace confusion** | Mixing old `javax.servlet` imports with new server or vice versa | Use `jakarta.*` exclusively; verify all transitive dependencies declare Jakarta namespaces |
| **CDI proxy limitations** | `@RequestScoped` proxies cannot be used in static contexts or when serializing | Never call `.getClass()` on a CDI bean expecting the target type — use interfaces and inject at runtime |
| **Transaction boundary misconfiguration** | Placing `@Transactional` on repository methods instead of service layer causes nested transaction overhead | Annotate service/manager methods only; repositories remain non-transactional and rely on the caller's context |
| **JSF state management bloat** | Server-side view state stored in HTTP session grows large for pages with many components | Use client-side state saving (`<param><name>javax.faces.STATE_SAVING_METHOD</name><value>client</value></param>`) or switch to RESTeasy + JSON for APIs |
| **Missing beans.xml** | CDI scanning fails if `beans.xml` is absent in a module that requires explicit bean discovery | Include an empty `<beans/>` descriptor in `WEB-INF/beans.xml` when using `bean-discovery-mode="all"` |
| **Memory pressure on large WARs** | Heavy JSF pages with many components, unlimited session scopes holding entities | Profile heap usage with Eclipse MAT; implement lazy loading (`FetchType.LAZY`) for all entity associations |

---

## Constraints

### MUST DO
- Use `jakarta.*` namespace exclusively — never import `javax.*` packages in new code
- Set JTA transaction boundaries at the service layer, not on individual DAO or repository methods
- Include an explicit `beans.xml` with `bean-discovery-mode="annotated"` or `"all"` for CDI modules
- Configure connection pooling via the container (not application-level pools like HikariCP directly)
- Use Jakarta Bean Validation annotations (`@NotNull`, `@Size`) on DTOs passed to JAX-RS resources
- Separate entity models from DTOs at service boundaries — never expose JPA entities to the REST layer

### MUST NOT DO
- Mix `javax.*` and `jakarta.*` dependencies in the same application — this causes class loader conflicts
- Use `@Stateless` or `@Singleton` EJB annotations for everything — prefer CDI `@ApplicationScoped` for stateless services
- Store large objects (blobs, lists of entities) in HTTP sessions without size limits
- Annotate entity fields with Bean Validation instead of using XML mapping or separate constraint groups
- Deploy applications as exploded WARs in production — use packaged `.war` archives for performance and security

---

## Output Template

When configuring or reviewing a Jakarta EE application, produce:

1. **Container Selection** — Recommended server with rationale (full platform vs. web profile, cloud-native requirements)
2. **Build Configuration** — Complete `pom.xml` dependency declarations with scope annotations
3. **Component Architecture** — WAR structure diagram listing all layers and their dependencies
4. **CDI Wiring Plan** — Bean scopes, producer methods, and interceptors configured for cross-cutting concerns
5. **Transaction Design** — Service method transaction attributes and boundary decisions

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `microprofile` | Cloud-native overlay specifications (config, health, metrics) that run on top of Jakarta EE |
| `jakarta-migration` | Step-by-step process for migrating Java EE 8 (`javax.*`) applications to Jakarta EE 9+ |

---

## Live References

> Authoritative documentation links for the Jakarta EE platform.

- [Jakarta EE Official Site](https://jakarta.ee/)
- [Jakarta EE Specification Repository (GitHub)](https://github.com/eclipse-jakartaee)
- [WildFly Documentation](https://docs.wildfly.org/)
- [Payara Server Documentation](https://docs.payara.fish/)
- [OpenLiberty Documentation](https://openliberty.io/docs/)
- [TomEE Documentation](https://tomee.apache.org/documentation.html)
- [Jakarta EE API Javadoc](https://javadoc.io/doc/jakarta.platform/jakarta.jakartaee-api/latest/)
