---
name: jakarta-testing
description: Tests Jakarta EE applications using Arquillian, ShrinkWrap, container adapters (WildFly managed/remote, Weld embedded), JUnit 5 integration, and in-container CDI injection with real Java examples.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: arquillian, shrinkwrap, container testing, junit5 testing, jakarta ee testing, wildfly managed, in-container test, test deployment
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, examples]
  related-skills: jakarta-ee, jakarta-security, microprofile
---

# Jakarta EE Container Testing with Arquillian and ShrinkWrap

Implements in-container testing for Jakarta EE applications using the Arquillian framework. Provides patterns for container-managed CDI injection, programmatic test archive construction with ShrinkWrap, JUnit 5 integration, REST endpoint verification, database integration tests with embedded containers, and security component validation across WildFly managed, WildFly remote, Weld embedded, and GlassFish Managed adapters.

## TL;DR Checklist

- [ ] Import `org.jboss.arquillian:arquillian-bom` with `<scope>import</scope>` in your pom.xml dependency management
- [ ] Select a container adapter (`wildfly-managed`, `weld-embedded`, or `wildfly-remote`) matching your test environment
- [ ] Every test class annotated with `@RunWith(Arquillian.class)` or extending an Arquillian base must declare exactly one `@Deployment` method returning `WebArchive`, `EjbArchive`, or `JavaArchive`
- [ ] Use ShrinkWrap's fluent API (`addPackages()`, `addClasses()`, `as()`) to construct test archives — never rely on pre-built artifacts from target/
- [ ] Inject container-managed beans directly into test fields with `@Inject` — the container resolves them before each test method runs
- [ ] For JUnit 5, register `ArquillianExtension.class` and use `@ArquillianResource URL` or `@ArquillianResource TestRunners` instead of `@RunWith`

---

## When to Use

Use this skill when:

- Writing integration tests that require the full Jakarta EE container lifecycle (CDI, JAX-RS, JPA, EJB) for a single test class
- Needing in-container dependency injection (`@Inject`) so beans are proxied, intercepted, and transactionally managed exactly as in production
- Testing JAX-RS resources with real HTTP-level routing through the container rather than manual `ResourceConfig` wiring
- Validating Jakarta Security components (`IdentityStore`, `SecurityContext`, `AuthenticationMechanism`) with actual container authentication flows
- Integrating Arquillian tests into a CI/CD pipeline (GitHub Actions, GitLab CI, Jenkins) where WildFly remote or Weld embedded is required for headless execution
- Testing EJB session beans with container-managed transactions and declarative security

---

## When NOT to Use

Avoid this skill for:

- Unit testing pure Java POJOs without CDI/JPA/transactional concerns — use plain JUnit 5 with Mockito instead of pulling in the full container
- Performance/load testing REST endpoints — Arquillian's container startup adds significant overhead per test; use Gatling, k6, or JMeter for load profiles
- Testing third-party libraries where you don't control the source code — create a thin Jakarta EE adapter and test your adapter with Arquillian instead
- Quick smoke tests that only need Spring-managed beans — Spring Boot provides `@SpringBootTest` which is faster to set up for Spring-centric teams

---

## Core Workflow

1. **Declare Arquillian Dependencies** — Import the Arquillian BOM in `<dependencyManagement>`, then declare individual test-scoped dependencies: `arquillian-junit5`, the container adapter (`arquillian-wildfly-managed` or `arquillian-weld-embedded`), and optionally `arquillian-shrinkwrap-resolver-maven` for classpath-based archive building.
   **Checkpoint:** Run `mvn dependency:tree -Dincludes=org.jboss.arquillian:*` to confirm exactly one container adapter is in the test runtime classpath (not transitive from multiple adapters).

2. **Select and Configure Container Adapter** — Choose the adapter matching your environment. For local development, prefer `wildfly-managed` (Arquillian starts and stops WildFly for you). For CI, use `weld-embedded` (no external server) or `wildfly-remote` (connects to a pre-existing instance). Create `src/test/resources/arquillian.xml` with container properties (`managementAddress`, `managementPort`, `daemon`).
   **Checkpoint:** For managed containers, verify the WildFly version in the adapter's `<extension>` matches your application's target server.

3. **Build Test Archives with ShrinkWrap** — Implement a static method annotated with `@Deployment` that returns `WebArchive` (for WAR), `EjbArchive`, or `JavaArchive`. Use `ShrinkWrap.create()` and chain `.addClasses()`, `.addPackages()`, `.merge()`, or use the Maven resolver to pull dependencies. Name the archive meaningfully (e.g., `"myapp-test.war"`).
   **Checkpoint:** Print the archive structure with `archive.toString(true)` inside the deployment method to verify every required class and descriptor is included before the test runs.

4. **Write Container-Managed Tests** — Annotate your test class. Inject container-managed beans with `@Inject` into private fields. The container creates proxies for the injected instances, resolves all dependencies, applies interceptors, and manages transactions. Use `@Before`, `@After`, or JUnit 5 lifecycle annotations (`@BeforeEach`, `@AfterEach`) for setup/teardown.
   **Checkpoint:** Ensure injected beans are not null after injection — a null injection means the bean has an unresolvable dependency, wrong scope, or is missing from the archive.

5. **Execute Assertions and Verify** — Call business logic on injected beans, fire HTTP requests to deployed JAX-RS endpoints (using `@ArquillianResource URL`), or query persisted entities from the container-managed EntityManager. Assert expected outcomes with JUnit 5 assertions (`assertThat`, `assertEquals`). For REST tests, assert status codes, JSON bodies, and headers.
   **Checkpoint:** After every test that modifies state (writes to database, mutates a bean), verify cleanup occurs either via transaction rollback or explicit deletion in `@AfterEach`.

---

## Implementation Patterns

### Pattern 1: WildFly Managed Container with ShrinkWrap Archive

The most common Arquillian setup. Arquillian downloads WildFly if needed, starts it, deploys your test archive, runs the tests, undeploys, and stops the container — all automatically.

```java
import static org.assertj.core.api.Assertions.assertThat;
import static org.jboss.shrinkwrap.api.ShrinkWrap.create;
import static org.jboss.shrinkwrap.api.spec.JavaArchive.archiveName;

import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import org.jboss.arquillian.container.test.api.Deployment;
import org.jboss.arquillian.junit5.ArquillianExtension;
import org.jboss.shrinkwrap.api.asset.EmptyAsset;
import org.jboss.shrinkwrap.api.spec.WebArchive;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(ArquillianExtension.class)
class OrderServiceIntegrationTest {

    @Inject
    private OrderService orderService;

    @Deployment
    static WebArchive createDeployment() {
        return create(WebArchive.class, "order-test.war")
            .addClasses(OrderService.class, OrderServiceImpl.class, Order.class)
            .addAsWebInfResource(EmptyAsset.INSTANCE, "beans.xml")
            .addAsManifestResource(
                archiveName("beans.xml").add(EmptyAsset.INSTANCE),
                "beans.xml");
    }

    @Test
    void shouldCalculateTotalWithTax() {
        Order order = new Order("ORD-001", 29.99, 3);
        double total = orderService.calculateTotal(order);

        assertThat(total).isGreaterThan(0);
        assertThat(total).isEqualTo(order.getSubtotal());
    }
}

@Stateless
class OrderServiceImpl implements OrderService {
    @Override
    public double calculateTotal(Order order) {
        return order.getQuantity() * order.getPrice();
    }
}

interface OrderService {
    double calculateTotal(Order order);
}

class Order {
    private final String orderId;
    private final double price;
    private final int quantity;

    public Order(String orderId, double price, int quantity) {
        this.orderId = orderId;
        this.price = price;
        this.quantity = quantity;
    }

    public double getSubtotal() { return price * quantity; }
    public double getPrice() { return price; }
    public int getQuantity() { return quantity; }
}
```

### Pattern 2: JUnit 5 + ArquillianExtension with @ArquillianResource and REST Testing

Use `@ArquillianResource` to access the deployment URL, then test JAX-RS endpoints through the actual container. This exercises the full request pipeline — interceptors, message body readers/writers, exception mappers.

```java
import static org.assertj.core.api.Assertions.assertThat;

import java.net.URL;

import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import org.jboss.arquillian.container.test.api.Deployment;
import org.jboss.arquillian.container.test.api.RunAsClient;
import org.jboss.arquillian.junit5.ArquillianExtension;
import org.jboss.shrinkwrap.api.ShrinkWrap;
import org.jboss.shrinkwrap.api.asset.EmptyAsset;
import org.jboss.shrinkwrap.api.spec.WebArchive;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(ArquillianExtension.class)
class ProductResourceIntegrationTest {

    private static URL baseURL;
    private static Client client;

    @ArquillianResource
    void setBaseURL(URL url) {
        baseURL = url;
    }

    @Deployment(testable = false)
    static WebArchive createDeployment() {
        return ShrinkWrap.create(WebArchive.class, "product-test.war")
            .addClasses(ProductResource.class, Product.class)
            .addAsWebInfResource(EmptyAsset.INSTANCE, "beans.xml");
    }

    @BeforeAll
    static void initClient() {
        client = ClientBuilder.newClient();
    }

    @AfterAll
    static void closeClient() {
        if (client != null) {
            client.close();
        }
    }

    @Test
    @RunAsClient
    void shouldReturnProductAsJson() {
        Response response = target("api/products/42")
            .request(MediaType.APPLICATION_JSON)
            .get();

        assertThat(response.getStatus()).isEqualTo(200);
        String json = response.readEntity(String.class);
        assertThat(json).contains("\"id\":42");
        assertThat(response.getHeaderString("Content-Type"))
            .startsWith(MediaType.APPLICATION_JSON);

        response.close();
    }

    private jakarta.ws.rs.client.WebTarget target(String path) {
        return client.target(baseURL.toString()).path(path);
    }
}

import jakarta.inject.Singleton;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

@Path("api/products")
@Singleton
class ProductResource {

    @GET
    @Path("{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Product getProduct(@PathParam("id") long id) {
        return new Product(id, "Sample Widget", 19.95);
    }
}

class Product {
    private final long id;
    private final String name;
    private final double price;

    public Product(long id, String name, double price) {
        this.id = id;
        this.name = name;
        this.price = price;
    }

    // Default constructor required by JSON providers
    public Product() { this(0, "", 0.0); }

    public long getId() { return id; }
    public String getName() { return name; }
    public double getPrice() { return price; }
}
```

### Pattern 3: Weld Embedded Container for CDI Testing Without External Server

Useful for CI pipelines where installing a full WildFly is too slow. Weld embedded bootstraps the CDI container in-process, so tests run in seconds with real `@Inject` semantics but no network I/O.

```java
import static org.assertj.core.api.Assertions.assertThat;

import jakarta.inject.Inject;

import org.jboss.weld.environment.se.Weld;
import org.jboss.weld.environment.se.WeldContainer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class OrderProcessorCDITest {

    private static WeldContainer weldContainer;

    @Inject
    private static OrderProcessor orderProcessor;

    @BeforeAll
    static void startWeld() {
        Weld weld = new Weld();
        weld.option("org.jboss.weld.execution.proxyors.disable", "true");
        weldContainer = weld.initialize();
        // Force field injection into the static field
        weldContainer.instance().select(OrderProcessor.class);
    }

    @AfterAll
    static void shutdownWeld() {
        if (weldContainer != null) {
            weldContainer.shutdown();
        }
    }

    @Test
    void shouldProcessOrderWithValidData() {
        Order order = new Order("ORD-100", 99.99, 2);
        ProcessingResult result = orderProcessor.process(order);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(ProcessingStatus.ACCEPTED);
        assertThat(result.getOrderId()).isEqualTo("ORD-100");
    }
}

import jakarta.inject.Singleton;

@Singleton
class OrderProcessor {

    private final ValidationService validationService = new ValidationService();

    public ProcessingResult process(Order order) {
        if (!validationService.isValid(order)) {
            return new ProcessingResult(order.getOrderId(), ProcessingStatus.REJECTED);
        }
        return new ProcessingResult(order.getOrderId(), ProcessingStatus.ACCEPTED);
    }
}

import jakarta.inject.Singleton;

@Singleton
class ValidationService {
    boolean isValid(Order order) {
        return order != null
            && order.getPrice() > 0
            && order.getQuantity() > 0;
    }
}

enum ProcessingStatus { ACCEPTED, REJECTED, PENDING }

record ProcessingResult(String orderId, ProcessingStatus status) {}
```

### Pattern 4: Database Integration Test with Embedded Derby via ShrinkWrap

Tests JPA persistence with an embedded container database. The archive includes the `persistence.xml` and entity classes; Arquillian starts a Derby network server (via the derby-container adapter) or you use the built-in JavaDB that ships with the JDK.

```java
import static org.assertj.core.api.Assertions.assertThat;

import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;

import org.jboss.arquillian.container.test.api.Deployment;
import org.jboss.arquillian.junit5.ArquillianExtension;
import org.jboss.shrinkwrap.api.ShrinkWrap;
import org.jboss.shrinkwrap.api.spec.JavaArchive;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(ArquillianExtension.class)
class CustomerRepositoryTest {

    @Inject
    private EntityManager entityManager;

    @Inject
    private CustomerService customerService;

    @Deployment
    static JavaArchive createDeployment() {
        return ShrinkWrap.create(JavaArchive.class, "customer-test.jar")
            .addClasses(Customer.class, CustomerEntity.class)
            .addAsResource("META-INF/persistence.xml", "META-INF/persistence.xml")
            .addAsManifestResource(
                org.jboss.shrinkwrap.api.ShrinkWrap.create(org.jboss.shrinkwrap.api.spec.JavaArchive.class)
                    .add(org.jboss.shrinkwrap.api.asset.StringAsset(
                        "<beans xmlns=\"http://xmlns.jcp.org/xml/ns/javaee\" " +
                        "bean-discovery-mode=\"all\"></beans>"),
                        "beans.xml"),
                "beans.xml");
    }

    @Test
    void shouldPersistAndRetrieveCustomer() {
        CustomerEntity customer = new CustomerEntity();
        customer.setEmail("alice@example.com");
        customer.setFirstName("Alice");
        customer.setLastName("Smith");

        customerService.create(customer);

        TypedQuery<CustomerEntity> query = entityManager.createQuery(
            "SELECT c FROM CustomerEntity c WHERE c.email = :email", CustomerEntity.class);
        query.setParameter("email", "alice@example.com");

        CustomerEntity found = query.getSingleResult();

        assertThat(found).isNotNull();
        assertThat(found.getFirstName()).isEqualTo("Alice");
        assertThat(found.getLastName()).isEqualTo("Smith");
    }
}

import jakarta.persistence.*;

@Entity
@Table(name = "customers")
class CustomerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String firstName;
    private String lastName;
    private String email;

    public CustomerEntity() {}

    public CustomerEntity(String firstName, String lastName, String email) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
    }

    public Long getId() { return id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String name) { this.firstName = name; }
    public String getLastName() { return lastName; }
    public void setLastName(String name) { this.lastName = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

import jakarta.inject.Singleton;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@Singleton
@Transactional
class CustomerService {

    @Inject
    private EntityManager em;

    public CustomerEntity create(CustomerEntity customer) {
        em.persist(customer);
        return customer;
    }
}
```

### Pattern 5: Testing Jakarta Security with IdentityStore and SecurityContext

Validates authentication flows by injecting `SecurityContext` and testing `IdentityStore` implementations in a container-managed environment. This exercises the full Jakarta Security pipeline — request interception, identity validation, principal resolution.

```java
import static org.assertj.core.api.Assertions.assertThat;

import jakarta.annotation.security.DeclareRoles;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.security.enterprise.identitystore.DatabaseIdentityStore;
import jakarta.security.enterprise.identitystore.PwdHash;
import jakarta.security.enterprise.SecurityContext;
import jakarta.servlet.http.HttpServletRequest;

import org.jboss.arquillian.container.test.api.Deployment;
import org.jboss.arquillian.junit5.ArquillianExtension;
import org.jboss.shrinkwrap.api.ShrinkWrap;
import org.jboss.shrinkwrap.api.spec.WebArchive;
import org.junit.jupiter.api.BeforeEach;
import jakarta.inject.Inject;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(ArquillianExtension.class)
@DeclareRoles({"USER", "ADMIN"})
class SecurityContextTest {

    @Inject
    private SecurityContext securityContext;

    @Inject
    private AuthService authService;

    @Deployment(testable = false)
    static WebArchive createDeployment() {
        return ShrinkWrap.create(WebArchive.class, "security-test.war")
            .addClasses(AuthService.class, AppSecurityConfig.class, UserPrincipal.class)
            .addAsWebInfResource(
                org.jboss.shrinkwrap.api.ShrinkWrap.create(org.jboss.shrinkwrap.api.spec.JavaArchive.class)
                    .add(org.jboss.shrinkwrap.api.asset.StringAsset(
                        "<beans xmlns=\"http://xmlns.jcp.org/xml/ns/javaee\" " +
                        "bean-discovery-mode=\"all\">" +
                        "<alternatives><class>AppSecurityConfig</class></alternatives>" +
                        "</beans>"),
                        "beans.xml"),
                "beans.xml");
    }

    @Test
    void shouldRecognizeAuthenticatedUser() {
        boolean authenticated = securityContext.authenticate(
            new TestRequest("admin@example.com", "securePassword123"),
            new MyFormAuthenticationMechanismDefinition());

        assertThat(authenticated).isTrue();
        assertThat(securityContext.getCallerPrincipal().getName())
            .isEqualTo("admin@example.com");
    }

    // A lightweight test request wrapper for authenticate()
    private static class TestRequest implements HttpServletRequest {
        private final String username;
        private final String password;
        TestRequest(String u, String p) { this.username = u; this.password = p; }
        public String getRemoteUser() { return null; }
        public boolean isUserInRole(String role) { return false; }
        public java.util.Principal getUserPrincipal() { return null; }
        // Delegate all other HttpServletRequest methods with UnsupportedOperationException
        // In practice, use a real servlet test container or mock with Mockito
    }
}

import jakarta.inject.Singleton;

@Singleton
class AuthService {
    public boolean authenticate(String username, String password) {
        // Container-managed — delegate to SecurityContext in production code
        return username != null && password != null && password.length() >= 8;
    }
}
```

---

## Configuration Reference

### arquillian.xml — WildFly Managed Adapter

```xml
<arquillian xmlns="http://jboss.org/schema/arquillian"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="
                http://jboss.org/schema/arquillian
                http://jboss.org/schema/arquillian/arquillian_1_0.xsd">

    <engine>
        <property name="deploymentExportPath">target/archive-export</property>
    </engine>

    <container qualifier="wildfly-managed" default="true">
        <configuration>
            <property name="managementAddress">127.0.0.1</property>
            <property name="managementPort">9990</property>
            <property name="allowConnectingToRunningServer">true</property>
        </configuration>
    </container>
</arquillian>
```

### arquillian.xml — Weld Embedded Adapter (CI-friendly)

```xml
<arquillian xmlns="http://jboss.org/schema/arquillian"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="
                http://jboss.org/schema/arquillian
                http://jboss.org/schema/arquillian/arquillian_1_0.xsd">

    <container qualifier="weld-embedded">
        <configuration>
            <property name="classesExcludedFromScanning">
                org.jboss.arquillian.protocol.servlet.*
            </property>
        </configuration>
    </container>
</arquillian>
```

---

## Constraints

### MUST DO
- Always declare exactly one `@Deployment` method per test class; multiple deployments cause container ambiguity errors.
- Import the Arquillian BOM with `<scope>import</scope>` in `<dependencyManagement>` to avoid version conflicts between adapter and core artifacts.
- Use `assertj-core` for assertions (`assertThat()`) rather than plain JUnit `assertEquals()` — assertJ's error messages are significantly clearer when container-managed objects differ from expectations.
- For JAX-RS endpoint tests that fire HTTP requests, annotate the test method with `@RunAsClient` so Arquillian executes the assertion on the client JVM rather than the container JVM (avoids serialization issues).
- Name your ShrinkWrap archives descriptively (`"order-service-test.war"`, not `"test.war"`) — this makes it easier to identify which archive failed during CI builds.
- Include `beans.xml` in every WAR/EJB archive deployment, even when using bean-discovery-mode="annotated", because the container requires the descriptor to activate CDI.

### MUST NOT DO
- Never use `@BeforeClass` or `@AfterClass` (JUnit 4 style) inside `@ExtendWith(ArquillianExtension.class)` tests — Arquillian's lifecycle is incompatible with JUnit 4 class-level hooks. Use `@BeforeAll` / `@AfterAll` instead.
- Never mix `@RunWith(Arquillian.class)` and `@ExtendWith(ArquillianExtension.class)` in the same project — pick one per test class consistently to avoid conflicting lifecycle behavior.
- Never add implementation JARs (WildFly server modules, Weld runtime) as compile-time dependencies; Arquillian provides them transitively through the container adapter.
- Never rely on `target/classes` or pre-built artifacts from a previous Maven build phase in your ShrinkWrap archive — always use `.addClasses()`, `.addPackages()`, or the Maven resolver to construct the archive deterministically from source.
- Do not call `weld.shutdown()` manually inside a `@Test` method when using Weld embedded — shutdown happens automatically after the test class completes; premature shutdown breaks subsequent tests.

---

## Output Template

When this skill is active, provide output in the following structure:

1. **Container Adapter Recommendation** — Which adapter (`wildfly-managed`, `weld-embedded`, `wildfly-remote`, `glassfish-managed`) fits the user's environment and CI constraints, with a one-line justification.
2. **pom.xml Dependency Snippet** — Complete `<dependencyManagement>` block with BOM import plus test-scoped dependencies for the selected adapter, JUnit 5, AssertJ, and ShrinkWrap.
3. **arquillian.xml Configuration** — Full XML file with container properties tuned to the recommended adapter.
4. **Complete Test Class** — A compilable Java class with `@Deployment` using ShrinkWrap, all field injections, test methods with assertions, and lifecycle annotations matching JUnit 5 conventions.
5. **Archive Structure Summary** — A textual representation of the ShrinkWrap archive contents showing every class, descriptor, and resource included.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `jakarta-ee` | Jakarta EE platform reference — container selection, module structure, namespace migration from javax.* to jakarta.* for test applications |
| `jakarta-security` | Jakarta Security Enterprise API (JSR 375) — IdentityStore patterns and security component testing with Arquillian |
| `microprofile` | MicroProfile specifications — health checks and metrics endpoints tested via Arquillian REST client integration |

---

## Live References

- [Arquillian Documentation](https://arquillian.org/arquillian-core/) — Official reference for container adapters, test lifecycle, and ShrinkWrap API
- [ShrinkWrap API Javadoc](https://docs.jboss.org/shrinkwrap/javadoc/) — Fluent archive construction API documentation with all `WebArchive`, `JavaArchive`, and `EjbArchive` methods
- [Arquillian Container Guide](https://docs.jboss.org/arquillian/guide/) — Step-by-step container adapter configuration for WildFly, GlassFish, Weld embedded, and remote modes
- [Jakarta EE Testing Specification](https://jakarta.ee/specifications/platform/) — Jakarta EE 10/11 specification including container-managed testing guidelines
- [WildFly Arquillian Adapter](https://github.com/wildfly/wildfly-arquillian) — Source code for `arquillian-wildfly-managed` and `arquillian-wildfly-remote` adapters with configuration examples
- [Weld Embedded SE](https://docs.jboss.org/weld/reference/latest/en-US/html_single/) — CDI container bootstrapping documentation for headless test environments
- [JUnit 5 Arquillian Extension](https://github.com/arquillian/arquillian-core/tree/master/junit/junit-vintage) — JUnit Jupiter (JUnit 5) integration guide with `ArquillianExtension` usage patterns
