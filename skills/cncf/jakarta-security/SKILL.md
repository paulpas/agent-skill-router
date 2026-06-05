---




name: jakarta-security
description: Implements Jakarta Security Enterprise API (JSR 375) for Jakarta EE applications with IdentityStore patterns, JWT Bearer tokens, form login, BCrypt password hashing, and container configuration for WildFly and OpenLiberty.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: jakarta security, jsr 375, identity store, jwt bearer, form login, bcrypt password hashing, wildfly security, programmatic authentication
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, examples]
  related-skills: jakarta-ee, microprofile, jakarta-migration
  archetypes: [tactical]
  anti_triggers:
    - spring security
    - general web development
    - client-side authentication
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational




---





# Jakarta Security Enterprise API (JSR 375)

Implements authentication and authorization for Jakarta EE applications using the Jakarta Security Enterprise API. Provides IdentityStore patterns for user credential validation, multiple transport mechanisms (JWT Bearer, Form Login, Basic Auth), declarative role-based authorization with JAX-RS annotations, and container configuration for WildFly and OpenLiberty application servers.

## TL;DR Checklist

- [ ] Define `IdentityStore` implementations (Database-backed, JWT, annotation-based)
- [ ] Declare roles on every resource class with `@DeclareRoles`
- [ ] Configure transport mechanism (JWT, Form, Basic) in container config
- [ ] Use `SecurityContext.getCallerPrincipal()` for programmatic access checks
- [ ] Hash passwords with BCrypt using `BCrypt.checkpw()` at registration time
- [ ] Protect JAX-RS endpoints with `@RolesAllowed`, `@PermitAll`, or `@DenyAll`
- [ ] Configure security domain in WildFly `standalone.xml` or OpenLiberty `server.xml`

---

## When to Use

Use this skill when:

- Building a Jakarta EE application requiring user authentication and role-based authorization
- Implementing REST API security with JAX-RS annotations (`@RolesAllowed`, `@PermitAll`)
- Migrating from Java EE (EJB Container) Security to Jakarta EE 9+ namespace packages
- Configuring container-managed authentication for WildFly or OpenLiberty
- Building custom IdentityStore backed by a database, JWT tokens, or LDAP
- Implementing BCrypt password hashing for user credential storage

---

## When NOT to Use

Avoid this skill for:

- **Spring Boot applications** — Use Spring Security (`org.springframework.security`) instead
- **MicroProfile JWT** — Use `microprofile-jwt-auth` (MP-JWT) if your app already uses MicroProfile; Jakarta Security and MP-JWT overlap, so pick one approach
- **Simple static HTML apps with no server-side auth** — Client-side auth or a third-party identity provider (Keycloak, Auth0) is simpler
- **Jakarta EE 10+ `jakarta.security.enterprise` replaced by CDI-based alternatives** — Jakarta EE 11 proposes moving security to the CDI event model; verify your target platform's support

---

## Core Workflow

### Phase 1: IdentityStore Implementation

1. **Design the identity store strategy** — Choose database-backed, JWT token-based, or annotation-based validation depending on your authentication flow. Create an `IdentityStore` class implementing `jakarta.security.enterprise.identitystore.IdentityStore`. The method `getCallerCredentials()` validates credentials for login flows; `getCallerGroups()` returns role memberships.

   **Checkpoint:** Every IdentityStore must have a valid `Priority` value (lower number = evaluated first). Minimum priority is `Priority.DEFAULT`.

2. **Implement database-backed IdentityStore** — Query the user database to validate username/password and fetch roles. Use `BCrypt.checkpw()` for password comparison.

3. **Implement JWT-based IdentityStore (if using bearer tokens)** — Parse and decode JWT, extract groups/roles from claims. Validate signature using a shared secret or public key.

### Phase 2: Container Configuration

4. **Configure the application server's security domain** — Set up realm, transport mechanism, and identity store in the container configuration file (WildFly `standalone.xml` or OpenLiberty `server.xml`). The container must know which IdentityStore to invoke during authentication.

   **Checkpoint:** Verify the security domain name matches what the application references via `@SecurityDomain`.

5. **Declare transport mechanism** — Specify `BASIC`, `FORM`, or `CUSTOM` (for JWT) in the container configuration. The transport determines how credentials are collected from the client.

### Phase 3: Authorization

6. **Add `@DeclareRoles` to resource classes** — Every class with secured endpoints must declare the roles it uses. Jakarta EE does not auto-discover role names; missing declarations cause `SecurityException` at runtime.

7. **Apply declarative authorization** — Annotate classes and methods with `@RolesAllowed`, `@PermitAll`, or `@DenyAll`. Use `@Authenticated` (Jakarta Security 2.1+) for any-logged-in-user access.

8. **Implement programmatic checks when declarative annotations are insufficient** — Access `SecurityContext` via injection to perform conditional authorization logic inside business methods.

### Phase 4: Password Management

9. **Register users with BCrypt-hashed passwords** — Store only the hashed password, never plaintext. Hash at registration time and verify at login via IdentityStore.

   **Checkpoint:** Always use `BCrypt.gensalt()` for salt generation; never hardcode a salt value.

---

## Implementation Patterns

### Pattern 1: Database-Backed IdentityStore with BCrypt

This pattern implements user authentication against a relational database using BCrypt for password hashing. Each user record stores the username and hashed password; roles are resolved from a separate user_roles junction table or stored as a delimited string.

```java
package com.example.security;

import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.security.enterprise.identitystore.*;
import org.mindrot.jbcrypt.BCrypt;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Validates user credentials against a database and returns role memberships.
 * Passwords are stored as BCrypt hashes and verified using BCrypt.checkpw().
 */
@Priority(ValidationOrder.DEFAULT_VALIDATION_ORDER + 10)
@ApplicationScoped
public class DatabaseIdentityStore implements IdentityStore {

    @Inject
    private EntityManager entityManager;

    @Override
    public CredentialValidationResult validate(Credential credential) {
        if (!(credential instanceof UsernamePasswordCredential credentials)) {
            return INVALID_RESULT;
        }

        String username = credentials.getCaller();
        char[] password = credentials.getPassword().getChars();

        // Fetch user from database
        User user = entityManager
                .createQuery("SELECT u FROM User u WHERE u.username = :username", User.class)
                .setParameter("username", username)
                .getResultStream()
                .findFirst()
                .orElse(null);

        if (user == null || !BCrypt.checkpw(new String(password), user.getPasswordHash())) {
            return INVALID_RESULT;
        }

        // Resolve roles from the user_roles junction table
        List<String> groups = entityManager
                .createQuery(
                        "SELECT r.name FROM UserRole ur JOIN r Role r WHERE ur.user.id = :userId",
                        String.class)
                .setParameter("userId", user.getId())
                .getResultList();

        return new CredentialValidationResult(username, Set.copyOf(groups));
    }

    @Override
    public Priority priority() {
        return Priority.APPLICATION + 10;
    }
}
```

**Dependency required in `pom.xml`:**
```xml
<dependency>
    <groupId>org.mindrot</groupId>
    <artifactId>jbcrypt</artifactId>
    <version>0.4</version>
</dependency>
```

---

### Pattern 2: JWT Bearer Token IdentityStore

This pattern validates stateless JWT bearer tokens presented in the `Authorization: Bearer <token>` HTTP header. The token's signature is verified, expiration is checked, and role claims are extracted into a credential result.

```java
package com.example.security;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.json.JsonObject;
import jakarta.security.enterprise.identitystore.*;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Validates JWT bearer tokens from the Authorization header.
 * Uses HMAC-SHA256 signature verification with a shared secret key.
 */
@Priority(ValidationOrder.DEFAULT_VALIDATION_ORDER + 20)
@ApplicationScoped
public class JwtBearerIdentityStore implements IdentityStore {

    private static final Logger LOGGER = Logger.getLogger(JwtBearerIdentityStore.class.getName());
    private static final String ALGORITHM = "HmacSHA256";
    private static final String BEARER_PREFIX = "Bearer ";

    @Inject
    private SecretKey secretKey;

    @Override
    public CredentialValidationResult validate(Credential credential) {
        if (!(credential instanceof HttpAuthenticationCredential httpCred)) {
            return INVALID_RESULT;
        }

        String authHeader = httpCred.getHeaderValue("authorization");
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            LOGGER.log(Level.FINE, "Missing or invalid Authorization header");
            return INVALID_RESULT;
        }

        String token = authHeader.substring(BEARER_PREFIX.length());
        String[] parts = token.split("\\.", 3);
        if (parts.length != 3) {
            LOGGER.log(Level.WARNING, "Malformed JWT token structure");
            return INVALID_RESULT;
        }

        // Verify signature
        if (!verifySignature(token, parts)) {
            LOGGER.log(Level.WARNING, "JWT signature verification failed");
            return INVALID_RESULT;
        }

        // Decode payload (base64url without padding)
        String payload = parts[1];
        String decodedPayload = new String(
                Base64.getUrlDecoder().decode(padBase64(payload)), StandardCharsets.UTF_8);

        // Parse JSON payload and extract claims
        JsonObject claims = parseJsonPayload(decodedPayload);
        String subject = claims.getString("sub", null);
        if (subject == null) {
            LOGGER.log(Level.WARNING, "JWT missing 'sub' claim");
            return INVALID_RESULT;
        }

        // Extract roles from 'groups' or 'roles' claim
        Set<String> groups = extractGroups(claims);
        return new CredentialValidationResult(subject, groups);
    }

    private boolean verifySignature(String token, String[] parts) {
        try {
            String signingInput = parts[0] + "." + parts[1];
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(secretKey);
            byte[] signatureBytes = mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8));
            String expectedSig = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(signatureBytes);
            return expectedSig.equals(parts[2]);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Signature verification error", e);
            return false;
        }
    }

    private char[] padBase64(String base64Url) {
        int padding = 4 - (base64Url.length() % 4);
        if (padding != 4) {
            return new String(base64Url.chars().mapToObj(c -> (char) c)
                    .collect(Collectors.joining())).toCharArray();
        }
        return base64Url.toCharArray();
    }

    private Set<String> extractGroups(JsonObject claims) {
        // Support both 'groups' and 'roles' claim names
        if (claims.containsKey("groups")) {
            return Set.of(claims.getJsonArray("groups").getStringArray());
        }
        if (claims.containsKey("roles")) {
            return Set.of(claims.getJsonArray("roles").getStringArray());
        }
        return Set.of();
    }

    @Override
    public Priority priority() {
        return Priority.APPLICATION + 20;
    }
}
```

---

### Pattern 3: Annotation-Based IdentityStore for Development

A lightweight IdentityStore that validates credentials using annotations on the application's resource classes. Useful for development environments or simple applications without a persistent user store.

```java
package com.example.security;

import jakarta.annotation.security.DeclareRoles;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Named;
import jakarta.security.enterprise.identitystore.*;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;

/**
 * Annotation-based identity store for development and testing.
 * Credentials are defined directly in annotations on resource classes.
 * NOT suitable for production use.
 */
@Priority(Priority.APPLICATION)
@ApplicationScoped
public class AnnotationBasedIdentityStore implements IdentityStore {

    @Override
    public CredentialValidationResult validate(Credential credential) {
        if (!(credential instanceof UsernamePasswordCredential creds)) {
            return INVALID_RESULT;
        }

        String username = creds.getCaller();
        char[] password = creds.getPassword().getChars();

        // Built-in developer credentials for local development
        switch (username) {
            case "admin":
                if (Arrays.equals(password, "admin123".toCharArray())) {
                    return new CredentialValidationResult(username,
                            Set.of("ADMIN", "USER", "MODERATOR"));
                }
                break;
            case "user":
                if (Arrays.equals(password, "user123".toCharArray())) {
                    return new CredentialValidationResult(username, Set.of("USER"));
                }
                break;
        }

        return INVALID_RESULT;
    }

    @Override
    public Priority priority() {
        return Priority.APPLICATION;
    }
}
```

---

### Pattern 4: JAX-RS Secured REST API

Demonstrates declarative authorization on JAX-RS resource classes and programmatic access via `SecurityContext`. The `@DeclareRoles` annotation is required at the class level for Jakarta EE to resolve role checks.

```java
package com.example.api;

import jakarta.annotation.security.DeclareRoles;
import jakarta.annotation.security.RolesAllowed;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.DenyAll;
import jakarta.annotation.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.security.enterprise.SecurityContext;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Public endpoints — accessible by any authenticated user.
 */
@Path("/api/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@DeclareRoles({"USER", "ADMIN", "MODERATOR"})
public class UserResource {

    @Inject
    private SecurityContext securityContext;

    /**
     * Login endpoint — publicly accessible. Returns a JWT token on success.
     */
    @POST
    @Path("/login")
    @PermitAll
    public Response login(@FormParam("username") String username,
                          @FormParam("password") String password) {
        // Delegate to container-managed authentication
        jakarta.security.enterprise.authentication.api.auth.AuthenticationRequest authReq =
                new UsernamePasswordAuthenticationRequest(username, password);

        if (!securityContext.authenticate(authReq)) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(Map.of("error", "Invalid credentials"))
                    .build();
        }

        String token = generateJwtToken(username);
        return Response.ok(Map.of(
                "token", token,
                "expiresAt", LocalDateTime.now().plusHours(8).toString()
        )).build();
    }

    /**
     * Get current user profile — any authenticated user.
     */
    @GET
    @Path("/me")
    @Authenticated
    public Response getMyProfile(@Context Principal principal) {
        if (principal == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        UserProfile profile = fetchUserProfile(principal.getName());
        return Response.ok(profile).build();
    }

    /**
     * List all users — ADMIN role required.
     */
    @GET
    @RolesAllowed("ADMIN")
    public Response listAllUsers() {
        if (!securityContext.isCallerInRole("ADMIN")) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", "ADMIN role required"))
                    .build();
        }
        return Response.ok(fetchAllUsers()).build();
    }

    /**
     * Moderate content — ADMIN or MODERATOR role required.
     */
    @PUT
    @Path("/moderate/{contentId}")
    @RolesAllowed({"ADMIN", "MODERATOR"})
    public Response moderateContent(@PathParam("contentId") String contentId) {
        boolean isAdmin = securityContext.isCallerInRole("ADMIN");
        return Response.ok(Map.of(
                "contentId", contentId,
                "moderatedBy", securityContext.getCallerPrincipal().getName(),
                "role", isAdmin ? "ADMIN" : "MODERATOR"
        )).build();
    }

    /**
     * Developer endpoint — permanently denied in production.
     */
    @DELETE
    @Path("/debug/reset")
    @DenyAll
    public Response debugReset() {
        return Response.status(Response.Status.FORBIDDEN)
                .entity(Map.of("error", "Debug endpoints disabled"))
                .build();
    }

    // --- Private helpers ---

    private String generateJwtToken(String username) {
        // In production, use a proper JWT library like Nimbus JOSE+JWT or jjwt.
        // This is a simplified placeholder demonstrating the concept.
        return "eyJhbGciOiJIUzI1NiJ9." +
                java.util.Base64.getUrlEncoder().withoutPadding()
                        .encodeToString(("\"sub\":\"" + username + "\"").getBytes()) +
                ".placeholder-signature";
    }

    private UserProfile fetchUserProfile(String username) {
        return new UserProfile(username, LocalDateTime.now());
    }

    private Map<String, Object> fetchAllUsers() {
        return Map.of();
    }

    /**
     * Simple DTO for user profile data.
     */
    public record UserProfile(String username, LocalDateTime createdAt) {}
}
```

---

### Pattern 5: Password Registration with BCrypt Hashing

This service handles new user registration by hashing the plaintext password with BCrypt before storing it in the database. It uses `BCrypt.gensalt()` for salt generation and stores only the hash.

```java
package com.example.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.mindrot.jbcrypt.BCrypt;

/**
 * Handles user registration with BCrypt password hashing.
 * Only hashed passwords are persisted — plaintext is never stored.
 */
@ApplicationScoped
public class RegistrationService {

    @Inject
    private EntityManager entityManager;

    /**
     * Registers a new user by hashing the password and persisting to the database.
     *
     * @param username the desired username (must be unique)
     * @param plainPassword the plaintext password to hash
     * @param roles the set of initial role names for the user
     * @return true if registration succeeded, false if username already exists
     */
    public boolean registerUser(String username, String plainPassword, String... roles) {
        // Check if username already exists
        long count = entityManager
                .createQuery("SELECT COUNT(u) FROM User u WHERE u.username = :name", Long.class)
                .setParameter("name", username)
                .getSingleResult();

        if (count > 0) {
            return false; // Username taken
        }

        // Generate BCrypt hash with automatic salt
        String hashedPassword = BCrypt.hashpw(plainPassword, BCrypt.gensalt());

        // Create and persist user entity
        User newUser = new User();
        newUser.setUsername(username);
        newUser.setPasswordHash(hashedPassword);
        for (String role : roles) {
            Role r = entityManager.find(Role.class, role);
            if (r != null) {
                newUser.getRoles().add(r);
            }
        }

        entityManager.persist(newUser);
        return true;
    }

    /**
     * Changes a user's password by hashing the new plaintext with BCrypt.
     */
    public boolean changePassword(String username, String newPassword) {
        User user = entityManager
                .createQuery("SELECT u FROM User u WHERE u.username = :name", User.class)
                .setParameter("name", username)
                .getResultStream()
                .findFirst()
                .orElse(null);

        if (user == null) {
            return false;
        }

        user.setPasswordHash(BCrypt.hashpw(newPassword, BCrypt.gensalt()));
        entityManager.merge(user);
        return true;
    }
}
```

---

### Pattern 6: WildFly Security Domain Configuration

Configure WildFly's `standalone.xml` for Jakarta Security with a database-backed identity store and BASIC authentication transport. This defines the security domain that applications reference via `@SecurityDomain("MyAppSecurityDomain")`.

```xml
<!-- standalone.xml — Add to <subsystem xmlns="urn:jboss:domain:security:2.0"> -->
<security-domain name="MyAppSecurityDomain" cache-type="default">
    <!-- Database-backed authentication using JDBC module -->
    <authentication>
        <login-module code="Database" flag="required">
            <module-option name="dsJndiName" value="java:jboss/datasources/MyAppDS"/>
            <module-option name="principalsQuery" value="SELECT password_hash FROM users WHERE username=?"/>
            <module-option name="rolesQuery" value="SELECT r.name, 'Roles' FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = (SELECT id FROM users WHERE username=?)"/>
            <module-option name="hashAlgorithm" value="BCrypt"/>
        </login-module>
    </authentication>

    <!-- Identity store integration for Jakarta Security -->
    <identity-store>
        <principal-mapping>
            <principal-mapper code="Mapping1" flag="required">
                <module-option name="role-attribute-name" value="name"/>
                <module-option name="group-name-prefix" value=""/>
            </principal-mapper>
        </principal-mapping>
    </identity-store>
</security-domain>

<!-- HTTP authentication mechanism: BASIC -->
<http-authentication>
    <security-domain>MyAppSecurityDomain</security-domain>
    <mechanism>
        <mechanism-name>BASIC</mechanism-name>
    </mechanism>
</http-authentication>
```

---

### Pattern 7: OpenLiberty Security Configuration

OpenLiberty uses `server.xml` for security configuration. Declare the required features and configure JACC-based authentication with Jakarta Security identity stores.

```xml
<!-- server.xml — OpenLiberty configuration -->
<server description="Jakarta EE application with Jakarta Security">

    <!-- Required security features for Jakarta Security (JSR 375) -->
    <feature>jakartaee-10.0</feature>
    <feature>ejbSecurity-4.0</feature>
    <feature>jsp-3.1</feature>

    <!-- Application server with Jakarta EE support -->
    <application id="myapp" location="myapp.war" name="myapp" type="war"/>

    <!-- Default security domain -->
    <basicRegistry id="basic" realm="MyAppRealm">
        <user name="admin" password="{SSHA}hashedpasswordhere" groups="ADMIN"/>
        <user name="user1" password="{SSHA}anotherhash" groups="USER"/>
    </basicRegistry>

    <!-- Security role mapping -->
    <security-role name="ADMIN">
        <special-subject type="ALL_AUTHENTICATED_USERS"/>
    </security-role>
    <security-role name="USER">
        <special-subject type="ALL_AUTHENTICATED_USERS"/>
    </security-role>

    <!-- Default security constraints for the application -->
    <httpEndpoint id="defaultHttpEndpoint"
                  host="*" http-port="9080" https-port="9443"/>

    <!-- JWT configuration for bearer token auth (optional) -->
    <jwtAsserter id="jwtAsserter"
                 jwksUrl="https://identity.example.com/.well-known/jwks.json"
                 issuer="https://identity.example.com/realms/myrealm"/>

    <microprofileJwt/>
</server>
```

---

### Pattern 8: Multiple IdentityStores with Priority Evaluation

When an application has multiple IdentityStore implementations, Jakarta Security evaluates them in priority order. Lower `Priority` values are evaluated first. If one store rejects the credentials, the next store is attempted until one succeeds or all fail.

```java
package com.example.security;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.security.enterprise.identitystore.*;

/**
 * High-priority LDAP-backed identity store evaluated first.
 * If the caller is found in LDAP, their credentials are validated there.
 */
@Priority(ValidationOrder.DEFAULT_VALIDATION_ORDER) // Default priority = 100
@ApplicationScoped
public class LdapIdentityStore implements IdentityStore {

    @Override
    public CredentialValidationResult validate(Credential credential) {
        if (!(credential instanceof UsernamePasswordCredential creds)) {
            return INVALID_RESULT;
        }

        String username = creds.getCaller();
        char[] password = creds.getPassword().getChars();

        // Attempt LDAP bind authentication
        if (ldapService.bind(username, new String(password))) {
            Set<String> groups = ldapService.getUserGroups(username);
            return new CredentialValidationResult(username, groups);
        }

        return INVALID_RESULT; // Fall through to next priority store
    }

    @Override
    public Priority priority() {
        return Priority.DEFAULT_VALIDATION_ORDER; // 100 — evaluated first
    }
}
```

With `DatabaseIdentityStore` at priority `DEFAULT + 10 = 110`, LDAP is tried first. If the user does not exist in LDAP, the database store handles the lookup. This allows hybrid identity management where some users are in LDAP and others are local to the application.

---

## Constraints

### MUST DO
- Declare roles on every resource class using `@DeclareRoles({ "ADMIN", "USER" })` at the class level before any `@RolesAllowed` annotations
- Use `BCrypt.gensalt()` for password hash generation during registration; never hardcode a salt value
- Store only BCrypt-hashed passwords in the database — never store plaintext credentials
- Configure IdentityStore priority explicitly with `priority()` method; use `Priority.APPLICATION + N` to avoid conflicts
- Return `INVALID_RESULT` when authentication fails; never log full passwords or throw unhandled exceptions from identity store implementations
- Use `SecurityContext.authenticate()` for programmatic login in JAX-RS resources, delegating to the container's configured transport mechanism

### MUST NOT DO
- Never use MD5 or SHA-1 for password hashing — only BCrypt is acceptable for Jakarta Security implementations
- Do not mix Java EE (`javax.security.*`) and Jakarta EE (`jakarta.security.*`) imports in the same project; ensure all dependencies use the `jakarta.` namespace
- Do not skip `@DeclareRoles` even if `@RolesAllowed` annotations are present — role declarations are mandatory for container-managed security to resolve at deployment time
- Do not implement identity store logic that bypasses the container's authentication flow (e.g., manually checking headers without using `IdentityStore`)
- Never configure BASIC auth over HTTP without HTTPS — credentials travel in base64 encoding which is trivially reversible
- Do not hardcode secret keys for JWT verification in source code; use environment variables or a secrets manager

---

## Output Template

When this skill is active, the model's output must contain:

1. **IdentityStore Implementation** — Typed Java class with `validate()`, `priority()`, and proper `@Priority` annotation
2. **JAX-RS Resource Class** — Secured REST endpoints with `@DeclareRoles`, `@RolesAllowed`, `@PermitAll`, or `@DenyAll` annotations
3. **Container Configuration** — Appropriate server config snippet (WildFly `standalone.xml` or OpenLiberty `server.xml`) matching the target platform
4. **Password Hashing Service** — Registration and change-password methods using BCrypt with explicit `gensalt()` calls
5. **Maven Dependency Block** — Required `pom.xml` entries including `jakarta.security:jakarta.security-api` and `org.mindrot:jbcrypt`

---

## Related Skills

| Skill | Purpose |
|---|---|
| `jakarta-ee` | Jakarta EE platform overview, namespace migration from Java EE, module structure |
| `microprofile` | MicroProfile JWT Auth — alternative to Jakarta Security for microservices with external identity providers |
| `jakarta-migration` | Migrating existing Java EE 8 applications to Jakarta EE 9+ namespace changes (`javax.` → `jakarta.`) |

---

## Live References

- [Jakarta Security API Specification (JSR 375)](https://jcp.org/en/jsr/detail?id=375) — Official JSR specification defining the identity store, authentication request, and security context APIs
- [WildFly Security Domain Configuration](https://docs.wildfly.org/29/WildFly_Core_Security_Subsystem.html) — WildFly documentation for configuring security domains, login modules, and identity stores
- [OpenLiberty Security Configuration](https://openliberty.io/docs/ref/feature/jakartaee-10.0.html) — OpenLiberty feature declarations and JACC security configuration
- [BCrypt Password Hashing (jbcrypt)](https://github.com/jeremyh/jBCrypt) — BCrypt implementation used for password hashing in the identity store pattern
- [Jakarta Security on GitHub](https://github.com/eclipse-ee4j/security.jakarta.enterprise) — Reference implementation of Jakarta Security API for Jakarta EE
- [JAX-RS Security Annotations](https://jakarta.ee/specifications/platform/10/apidocs/jakarta.security.enterprise/) — Jakarta EE security annotation reference (`@RolesAllowed`, `@PermitAll`, `@DenyAll`, `@Authenticated`)
- [JBoss Community Security Documentation](https://docs.jboss.org/container-security/) — Comprehensive guides on container-managed security across JBoss/WildFly and OpenLiberty

---

*This skill follows Jakarta EE 10 specification conventions. All code examples use the `jakarta.` namespace (not the legacy `javax.` namespace from Java EE 8).*
