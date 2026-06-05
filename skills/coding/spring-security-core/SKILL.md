---




name: spring-security-core
description: Implements Spring Security 6.x filter chain configuration, JWT authentication filters, method-level security with @EnableMethodSecurity, password encoding, and CORS/CSRF handling for production Spring Boot applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: spring security, jwt authentication, security filter chain, method security, password encoder, cors csrf, authorization rules, spring security core
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
  related-skills: spring-boot-auto-config, spring-data-jpa




---





# Spring Security Core & JWT Authentication

Implements production-grade Spring Security 6.x (Spring Boot 3.x) security configurations including `SecurityFilterChain` bean definition without the deprecated `WebSecurityConfigurerAdapter`, JWT token authentication filters, method-level authorization with `@EnableMethodSecurity`, password encoding strategies, and CORS/CSRF handling. When loaded, this skill makes the model write secure request matching rules, custom authentication providers, and role-based authorization annotations using modern Spring Security APIs.

## TL;DR Checklist

- [ ] Confirm `WebSecurityConfigurerAdapter` is never used — all configuration goes through `SecurityFilterChain` beans
- [ ] Verify JWT filter extends `OncePerRequestFilter` or implements `AuthenticationFilter` interface
- [ ] Ensure `PasswordEncoder` bean uses BCrypt (`BCryptPasswordEncoder`) or Argon2 (`Argon2PasswordEncoder`)
- [ ] Check that `@EnableMethodSecurity` is present and `@PreAuthorize` / `@Secured` annotations guard endpoints
- [ ] Validate CORS configuration is explicit per origin (never `.cors().configurationSource(request -> { cors.setAllowedOrigins(List.of("*")); })`)
- [ ] Confirm CSRF is disabled for stateless JWT APIs but enabled for form-based or session authentication

---

## When to Use

Use this skill when:

- Configuring `SecurityFilterChain` beans to define authorization rules per URL pattern in Spring Boot 3.x
- Implementing JWT-based stateless authentication with a custom filter in the security filter chain
- Adding method-level security annotations (`@PreAuthorize`, `@Secured`, `@RolesAllowed`) on service or controller methods
- Setting up password encoding with BCrypt for user credential storage and verification
- Configuring CORS policies for cross-origin API access with specific origin whitelisting

---

## When NOT to Use

Avoid this skill for:

- OAuth2 / OpenID Connect flows — use the `spring-security-oauth2-resource-server` or `spring-security-oauth2-client` starters instead (this skill covers JWT-based direct authentication only)
- LDAP or SAML enterprise identity integration — these require dedicated Spring Security modules beyond core filter chain configuration
- Simple in-memory user authentication for testing — use `spring.security.user.name/password` auto-configuration without manual beans
- Authorization logic that belongs in domain service methods (business rules) — security annotations should guard the entry point, not replace business-level checks

---

## Core Workflow

1. **Define the SecurityFilterChain Bean** — Create a `@Bean` method returning `SecurityFilterChain`. Apply `.authorizeHttpRequests()` with `.requestMatchers("/public/**").permitAll()`, `.requestMatchers("/admin/**").hasRole("ADMIN")`, and `.anyRequest().authenticated()` as the final catch-all. Call `.csrf(csrf -> csrf.disable())` for stateless JWT APIs or configure CSRF token validation for form-based auth. Enable CORS via `.cors(cors -> cors.configurationSource(...))` with explicit allowed origins. Always register a `SecurityFilterChain` bean — never use the deprecated `WebSecurityConfigurerAdapter` which was removed in Spring Security 5.7+ and fully dropped in 6.x.

   **Checkpoint:** Every URL pattern must have an explicit authorization decision — `.anyRequest().authenticated()` should be the last matcher. Verify that `.requestMatchers()` uses exact paths or ant patterns (not regex), since `requestMatchers` replaced `regexMatchers` for performance reasons. Confirm CSRF is disabled only when the application is truly stateless (no session, no form submissions).

2. **Implement the JWT Authentication Filter** — Create a class extending `OncePerRequestFilter` that intercepts requests with an `Authorization: Bearer <token>` header. Parse and validate the JWT using a library like `jjwt` (io.jsonwebtoken). Extract the username and authorities from the token claims, create an `Authentication` object (typically `UsernamePasswordAuthenticationToken`), and set it on `SecurityContextHolder.getContext().setAuthentication(...)`. If the token is invalid or expired, return HTTP 401 without writing to the response body.

   **Checkpoint:** The JWT filter must call `super.doFilterInternal()` only when authentication succeeds — otherwise call `response.sendError(HttpServletResponse.SC_UNAUTHORIZED)` and return immediately. Verify that the filter chain order places the JWT filter before `UsernamePasswordAuthenticationFilter` so pre-authenticated requests bypass form login. Test with an expired token to confirm 401 response.

3. **Configure Password Encoder and UserDetailsService** — Register a `PasswordEncoder` bean using `BCryptPasswordEncoder` (default in Spring Boot) or `Argon2PasswordEncoder` for stronger hashing. Implement a `UserDetailsService` that loads user credentials and authorities from a database (typically via JPA repository). The `loadUserByUsername()` method must throw `UsernameNotFoundException` when the user does not exist — never return a null or disabled user silently. Map entity roles to `SimpleGrantedAuthority` objects with the `ROLE_` prefix.

   **Checkpoint:** Every password stored in the database must be BCrypt-hashed (not plaintext or reversible encryption). Verify that `UserDetails.builder().password(encoder.encode(rawPassword)).roles("USER").build()` produces a valid `UserDetails` object. Confirm `loadUserByUsername()` throws `UsernameNotFoundException` (not just returns null) to trigger proper authentication failure handling.

4. **Enable Method-Level Security** — Annotate the application class or a configuration class with `@EnableMethodSecurity` (replaces `@EnableGlobalMethodSecurity` in Spring Security 6.x). Use `@PreAuthorize("hasRole('ADMIN')")` on controller methods to restrict access before method execution. Use `@Secured({"ROLE_ADMIN", "ROLE_SUPERUSER"})` for role-based checks that do not require SpEL expressions. Optionally use `@PostAuthorize("returnObject.owner == authentication.name")` for post-execution object-level authorization.

   **Checkpoint:** `@EnableMethodSecurity` requires Spring Security 6.x with `spring-security-oauth2-jose` not on the classpath (it enables method security by default). Verify that `@PreAuthorize` expressions use correct SpEL syntax: `hasRole()` without the `ROLE_` prefix, `hasAnyAuthority()`, or custom expression evaluators. Test authorization failures return HTTP 403 Forbidden, not 401 Unauthorized.

---

## Implementation Patterns / Reference Guide

### Pattern 1: SecurityFilterChain Bean with Explicit Request Matching

This is the modern Spring Security 6.x approach — no adapter class, only `SecurityFilterChain` beans.

```java
package com.example.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(securedEnabled = true, jsr250Enabled = true)
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationEntryPoint authenticationEntryPoint;
    private final AccessDeniedHandler accessDeniedHandler;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthFilter,
            AuthenticationEntryPoint authenticationEntryPoint,
            AccessDeniedHandler accessDeniedHandler) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints — no authentication required
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/public/health").permitAll()
                // Read-only API — authenticated users only
                .requestMatchers(HttpMethod.GET, "/api/v1/users/**").hasAnyRole("USER", "ADMIN")
                // Write operations — admin only
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                // All other endpoints require authentication
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12); // strength factor 12 (default is 10)
    }
}
```

> **Production pitfall:** The `.requestMatchers()` order matters — Spring Security evaluates matchers in declaration order and uses the first match. Place specific patterns before broad ones. Never put `.anyRequest().authenticated()` before specific rules.

### Pattern 2: JWT Authentication Filter (OncePerRequestFilter)

A production-grade JWT filter that extracts, validates, and authenticates requests without duplicating filter execution.

```java
package com.example.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.util.List;

/**
 * JWT authentication filter that runs once per HTTP request.
 * Extracts the Bearer token, validates its signature and expiration,
 * and sets the authenticated principal in SecurityContextHolder.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final SecretKey signingKey;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(
            @org.springframework.beans.factory.annotation.Value("${app.security.jwt.secret-key}") String secretKey,
            UserDetailsService userDetailsService) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretKey));
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader(AUTHORIZATION_HEADER);

        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            // No JWT present — proceed with the filter chain; authentication stays anonymous
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(BEARER_PREFIX.length());

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(jwt)
                    .getPayload();

            String username = claims.getSubject();

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // Verify token was issued after the last password change (optional security check)
                String issuedAt = claims.getIssuedAt().toString();
                if (isTokenValid(userDetails, jwt)) {
                    List<SimpleGrantedAuthority> authorities = userDetails.getAuthorities().stream()
                            .map(SimpleGrantedAuthority::new)
                            .toList();

                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, authorities);
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Invalid, expired, or tampered token — return 401 Unauthorized
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Invalid or expired JWT token\",\"status\":401}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isTokenValid(UserDetails userDetails, String jwt) {
        // Placeholder: in production, check claims like "iat", "exp", and custom fields
        return true;
    }
}
```

### Pattern 3: UserDetailsService with Database-backed Authentication

Load user credentials and roles from a JPA entity to enable real authentication.

```java
package com.example.security;

import com.example.model.UserEntity;
import com.example.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Loads user details from the database using a JPA repository.
 * Maps entity roles to Spring Security authorities with ROLE_ prefix.
 */
@Service
public class DatabaseUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public DatabaseUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found: " + username));

        if (!user.isEnabled()) {
            throw new UsernameNotFoundException(
                    "User account is disabled: " + username);
        }

        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
                .toList();

        return User.builder()
                .username(user.getUsername())
                .password(user.getPasswordHash()) // already BCrypt-hashed in DB
                .authorities(authorities)
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(!user.isEnabled())
                .build();
    }
}
```

### Pattern 4: Method-Level Security with @PreAuthorize and @Secured

Demonstrates different authorization strategies at the method level.

```java
package com.example.api;

import com.example.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Any authenticated user can read the user list.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public List<UserDto> listUsers() {
        return userService.findAll();
    }

    /**
     * Only admin users can create or delete users.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto createUser(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    /**
     * @Secured uses role strings directly without SpEL expressions.
     */
    @DeleteMapping("/{id}")
    @Secured({"ROLE_ADMIN", "ROLE_SUPERUSER"})
    public void deleteUser(@PathVariable Long id) {
        userService.delete(id);
    }

    /**
     * Object-level authorization: user can only update their own profile.
     */
    @PutMapping("/me")
    @PreAuthorize("hasRole('USER') and #request.id == authentication.principal.id")
    public UserDto updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateOwnProfile(request);
    }

    /**
     * JSR-250 @RolesAllowed from javax.annotation (enabled via jsr250Enabled=true).
     */
    @GetMapping("/me")
    @jakarta.annotation.security.RolesAllowed({"USER", "ADMIN"})
    public UserDto getMyProfile() {
        return userService.findOwn();
    }
}

// DTOs for the controller
record UserDto(Long id, String username, List<String> roles) {}
record CreateUserRequest(String username, String password, List<String> roles) {}
record UpdateProfileRequest(Long id, String email, String displayName) {}
```

---

## Constraints

### MUST DO
- Define all security configuration via `SecurityFilterChain` beans annotated with `@Bean` — never use the removed `WebSecurityConfigurerAdapter` class
- Register a `BCryptPasswordEncoder(12)` bean (strength 12 for production, minimum 10) or an `Argon2PasswordEncoder` for enhanced security
- Extend `OncePerRequestFilter` for the JWT authentication filter and set the authenticated token in `SecurityContextHolder.getContext().setAuthentication()` before calling `filterChain.doFilter()`
- Enable method-level security with `@EnableMethodSecurity(securedEnabled = true, jsr250Enabled = true)` to support both `@PreAuthorize` (SpEL) and `@Secured` annotations
- Use `.requestMatchers()` for all path matching — it is faster than regex-based matching and the only officially supported API in Spring Security 6.x
- Return HTTP 401 for unauthenticated requests and HTTP 403 for authenticated-but-unauthorized requests via custom `AuthenticationEntryPoint` and `AccessDeniedHandler`

### MUST NOT DO
- Use `.cors().configurationSource(request -> { cors.setAllowedOrigins(List.of("*")); })` — wildcard CORS origins with authentication expose the application to cross-site attacks; always whitelist specific origins
- Store plaintext passwords in the database — every password must be encoded with BCrypt before persistence using `passwordEncoder.encode(rawPassword)`
- Place `.anyRequest().authenticated()` before specific request matchers in the filter chain — matchers are evaluated in order and earlier rules take precedence
- Return null from `loadUserByUsername()` instead of throwing `UsernameNotFoundException` — Spring Security requires the exception to trigger proper authentication failure handling
- Use `@EnableGlobalMethodSecurity` — this annotation was deprecated in Spring Security 5.4 and removed in 6.x; use `@EnableMethodSecurity` instead

---

## Output Template

When applying this skill, produce outputs following this structure:

1. **SecurityConfig Class** — Complete `SecurityFilterChain` bean with request matchers, session management, exception handling, and JWT filter registration
2. **JWT Authentication Filter** — `OncePerRequestFilter` implementation with token parsing, validation, and SecurityContext population
3. **UserDetailsService Implementation** — Database-backed user loading with role mapping to Spring Security authorities
4. **Password Encoder Bean** — BCrypt or Argon2 configuration with strength parameter
5. **Method-Security Examples** — Controller classes annotated with `@PreAuthorize`, `@Secured`, and `@RolesAllowed` demonstrating different authorization strategies
6. **CORS Configuration Block** — Explicit origin-whitelisted CORS setup for the configured origins

---

## Related Skills

| Skill | Purpose |
|---|---|
| `spring-boot-auto-config` | Auto-configuration infrastructure that registers security beans conditionally based on classpath presence and property flags |
| `spring-data-jpa` | JPA repository layer that UserDetailsService queries against to load user credentials and role assignments from the database |

---

## Live References

1. [Spring Security 6.x Reference — SecurityFilterChain](https://docs.spring.io/spring-security/reference/6.3/servlet/configuration/java.html#servlet-authn-filter-chain)
2. [JWT Authentication with Spring Security](https://docs.spring.io/spring-security/reference/6.3/servlet/oauth2/resource-server/jwt.html)
3. [@EnableMethodSecurity Documentation](https://docs.spring.io/spring-security/reference/6.3/api/org/springframework/security/config/annotation/method/configuration/EnableMethodSecurity.html)
4. [Password Encoding with BCrypt](https://docs.spring.io/spring-security/reference/6.3/api/org/springframework/security/crypto/bcrypt/BCryptPasswordEncoder.html)
5. [UserDetailsService Interface](https://docs.spring.io/spring-security/reference/6.3/api/org/springframework/security/core/userdetails/UserDetailsService.html)
6. [CORS Configuration in Spring Security](https://docs.spring.io/spring-security/reference/6.3/servlet/configuration/java.html#cors-configuration-java)
7. [Spring Security Java Config Guide](https://docs.spring.io/spring-security/reference/6.3/servlet/configuration/java.html)
