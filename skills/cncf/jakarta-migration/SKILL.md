---
name: jakarta-migration
description: Migrates Java EE 8 applications to Jakarta EE 9+ by handling namespace rewrites, dependency updates, build configuration changes, and reference implementation transitions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: java ee migration, javax to jakarta, java ee to jakarta ee, namespace change, jakartaee-api, javax.servlet, javax.persistence, migration tool, eclipse migration, batch rename, java ee 8 upgrade
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: jakarta-ee, microprofile
---

# Java EE to Jakarta EE Migration

Guides the systematic migration of Java EE 8 (Java SE 8 / javax.*) applications to Jakarta EE 9+ by handling namespace rewrites, dependency updates, build configuration changes, container-specific adjustments, and validation of migrated code against a Jakarta EE reference implementation.

## TL;DR Checklist

- [ ] Inventory all `javax.*` imports and dependencies using grep/find across the entire project
- [ ] Replace javax.* Maven artifacts with jakarta.* equivalents in pom.xml or build.gradle
- [ ] Run namespace rewrite (javax→jakarta) across all Java source, XML config, and properties files
- [ ] Update deployment descriptors (web.xml, persistence.xml, faces-config.xml) to new namespaces
- [ ] Build against Jakarta EE 10/11 API and deploy to a reference server for smoke testing

---

## When to Use

Use this skill when:

- Migrating a Java EE 8 application to Jakarta EE 9+ (namespace change from `javax.*` to `jakarta.*`)
- Upgrading from Java EE 7 (JSR 342) or earlier to any Jakarta EE version
- Adopting Jakarta EE 10 or 11 and needing a structured migration path
- Resolving namespace conflicts between legacy `javax.*` libraries and modern `jakarta.*` dependencies

## When NOT to Use

- Starting a brand-new project — use `jakarta.*` from day one, no migration needed
- The application is already on Jakarta EE 9+ — skip directly to feature updates
- Migrating Spring Boot applications — this is a Java EE namespace change task, not Spring-related

---

## Core Workflow

### Step 1: Inventory javax.* Usage

Before making any changes, catalog the full scope of migration. This prevents missing imports or hidden dependencies.

```bash
# Find all Java files importing javax.* packages
find . -name "*.java" -exec grep -l "import javax\." {} \; | sort > /tmp/javax-imports.txt

# Count unique javax.* package prefixes
grep -h "import javax\." **/*.java 2>/dev/null | sed 's/.*import \(\(javax\.[a-z]*\)\).*/\1/' | sort -u > /tmp/javax-packages.txt

# Show the counts per package for prioritization
cat /tmp/javax-packages.txt | while read pkg; do
    count=$(grep -r "import $pkg" --include="*.java" . | wc -l)
    echo "$count\t$pkg"
done | sort -rn > /tmp/javax-usage-report.txt

# Inventory javax.* dependencies in pom.xml files
grep -rh "<groupId>javax\." --include="pom.xml" . | sort -u > /tmp/javax-deps.txt

# Generate a summary report
echo "=== Migration Scope Report ==="
echo "Java files with javax.* imports: $(cat /tmp/javax-imports.txt | wc -l)"
echo "Unique javax packages used: $(wc -l < /tmp/javax-packages.txt)"
echo "javax dependencies in Maven: $(wc -l < /tmp/javax-deps.txt)"
cat /tmp/javax-usage-report.txt | head -20
```

### Step 2: Update Build Dependencies

Replace all `javax.*` Maven/Gradle artifacts with their Jakarta EE equivalents. This is the most critical build-level change.

**Before (Java EE 8 pom.xml):**
```xml
<!-- Java EE 8 full API — javax namespace -->
<dependency>
    <groupId>javax</groupId>
    <artifactId>javaee-api</artifactId>
    <version>8.0.1</version>
    <scope>provided</scope>
</dependency>

<!-- Individual javax dependencies -->
<dependency>
    <groupId>javax.servlet</groupId>
    <artifactId>javax.servlet-api</artifactId>
    <version>4.0.1</version>
    <scope>provided</scope>
</dependency>
<dependency>
    <groupId>javax.persistence</groupId>
    <artifactId>javax.persistence-api</artifactId>
    <version>2.2</version>
</dependency>
<dependency>
    <groupId>javax.inject</groupId>
    <artifactId>javax.inject</artifactId>
    <version>1</version>
</dependency>
```

**After (Jakarta EE 9+ pom.xml):**
```xml
<!-- Jakarta EE 9 Web Profile — jakarta namespace -->
<dependency>
    <groupId>jakarta.platform</groupId>
    <artifactId>jakarta.jakartaee-api</artifactId>
    <version>9.1.0</version>
    <scope>provided</scope>
</dependency>

<!-- Or Jakarta EE 10/11 for latest specs -->
<dependency>
    <groupId>jakarta.platform</groupId>
    <artifactId>jakarta.jakartaee-api</artifactId>
    <version>10.0.0</version>
    <scope>provided</scope>
</dependency>

<!-- Individual jakarta dependencies (if you prefer fine-grained control) -->
<dependency>
    <groupId>jakarta.servlet</groupId>
    <artifactId>jakarta.servlet-api</artifactId>
    <version>6.0.0</version>
    <scope>provided</scope>
</dependency>
<dependency>
    <groupId>jakarta.persistence</groupId>
    <artifactId>jakarta.persistence-api</artifactId>
    <version>3.1.0</version>
</dependency>
```

**Gradle equivalent (build.gradle):**
```groovy
// Before — Java EE 8
implementation 'javax:javaee-api:8.0.1'

// After — Jakarta EE 9+
implementation 'jakarta.platform:jakarta.jakartaee-api:10.0.0' {
    // Use provided scope for application servers that ship their own implementation
    exclude group: 'com.sun.mail', module: 'jakarta.mail'
}
```

### Step 3: Namespace Rewriting

Perform a recursive namespace rewrite across all source files. The core transformation is `javax.` → `jakarta.` in the first package component only (e.g., `javax.servlet` becomes `jakarta.servlet`, but `javax.transaction.UserTransaction` becomes `jakarta.transaction.UserTransaction`).

**Safe bash one-liner for Java sources:**
```bash
# Recursive namespace rewrite for Java source files
# Handles: javax.servlet, javax.persistence, javax.enterprise, javax.ws.rs, javax.faces, 
#          javax.annotation, javax.validation, javax.inject, javax.json, javax.ejb, javax.mail
find . -name "*.java" -exec sed -i \
    -e 's/import javax\.persistence/import jakarta.persistence/g' \
    -e 's/import javax\.enterprise.import jakarta.enterprise/g' \
    -e 's/import javax\.ws\.rs/import jakarta.ws.rs/g' \
    -e 's/import javax\.servlet/import jakarta.servlet/g' \
    -e 's/import javax\.faces/import jakarta.faces/g' \
    -e 's/import javax\.validation/import jakarta.validation/g' \
    -e 's/import javax\.annotation/import jakarta.annotation/g' \
    -e 's/import javax\.inject/import jakarta.inject/g' \
    -e 's/import javax\.json/import jakarta.json/g' \
    -e 's/import javax\.ejb/import jakarta.ejb/g' \
    -e 's/import javax\.mail/import jakarta.mail/g' \
    -e 's/import javax\.transaction/import jakarta.transaction/g' \
    {} +

# Also handle package declarations (not just imports)
find . -name "*.java" -exec sed -i \
    -e 's/^package javax\.persistence/package jakarta.persistence/g' \
    -e 's/^package javax\.enterprise/package jakarta.enterprise/g' \
    -e 's/^package javax\.ws\.rs/package jakarta.ws.rs/g' \
    -e 's/^package javax\.servlet/package jakarta.servlet/g' \
    -e 's/^package javax\.faces/package jakarta.faces/g' \
    {} +
```

**For XML deployment descriptors (web.xml, faces-config.xml, etc.):**
```bash
# Update namespace URIs in XML files
find . -name "web.xml" -o -name "faces-config.xml" -o -name "*.xhtml" | xargs -I {} sed -i \
    -e 's/http:\/\/java\.sun\.com\/xml\/ns\/javaee/http:\/\/jakarta\.ee\/xml\/ns\/jakartaee/g' \
    -e 's/"http:\/\/java\.sun\.com\/xmlns\/jboss\/ws_2_0"|"urn:jboss:domain:webservices:2.0"/"http:\/\/jakarta\.ee\/xml\/ns\/jakartaee\/webservices_2_0.xsd"/g' \
    -e 's/xsi:schemaLocation=".*java.sun.com.*xmlns:jakartaee.*"/xsi:schemaLocation="http:\/\/jakarta\.ee\/xml\/ns\/jakartaee http:\/\/jakarta\.ee\/xml\/ns\/jakartaee\/jakartaee_10.xsd"/g' \
    {} +

# Update JAX-WS namespace declarations in web.xml
find . -name "web.xml" -exec sed -i \
    -e 's|<xmlns:ws.*java\.sun\.com|<xmlns:ws http://jakarta.ee/xml/ns/jakartaee|g' \
    {} +
```

### Step 4: Update Deployment Descriptor Namespace Declarations

**web.xml before:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="http://java.sun.com/xml/ns/javaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://java.sun.com/xml/ns/javaee 
                             http://java.sun.com/xml/ns/javaee/web-app_4_0.xsd"
         version="4.0">
    <display-name>My Java EE App</display-name>
    
    <!-- Servlet declarations -->
    <servlet>
        <servlet-name>MyServlet</servlet-name>
        <servlet-class>com.example.MyServlet</servlet-class>
    </servlet>
    
    <!-- Security constraints -->
    <security-constraint>
        <web-resource-collection>
            <web-resource-name>Protected Area</web-resource-name>
            <url-pattern>/secure/*</url-pattern>
        </web-resource-collection>
        <auth-constraint>
            <role-name>admin</role-name>
        </auth-constraint>
    </security-constraint>
    
    <login-config>
        <auth-method>FORM</auth-method>
        <form-login-page>/login.xhtml</form-login-page>
        <form-error-page>/error.xhtml</form-error-page>
    </login-config>
</web-app>
```

**web.xml after (Jakarta EE 10):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="https://jakarta.ee/xml/ns/jakartaee 
                             https://jakarta.ee/xml/ns/jakartaee/web-app_6_0.xsd"
         version="6.0">
    <display-name>My Jakarta EE App</display-name>

    <servlet>
        <servlet-name>MyServlet</servlet-name>
        <servlet-class>com.example.MyServlet</servlet-class>
    </servlet>

    <security-constraint>
        <web-resource-collection>
            <web-resource-name>Protected Area</web-resource-name>
            <url-pattern>/secure/*</url-pattern>
        </web-resource-collection>
        <auth-constraint>
            <role-name>admin</role-name>
        </auth-constraint>
    </security-constraint>

    <login-config>
        <auth-method>FORM</auth-method>
        <form-login-page>/login.xhtml</form-login-page>
        <form-error-page>/error.xhtml</form-error-page>
    </login-config>
</web-app>
```

### Step 5: Update persistence.xml and faces-config.xml

**persistence.xml namespace update:**
```xml
<!-- Before (Java EE 8) -->
<persistence xmlns="http://java.sun.com/xml/ns/persistence"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xsi:schemaLocation="http://java.sun.com/xml/ns/persistence 
                                 http://java.sun.com/xml/ns/persistence/persistence_2_2.xsd"
             version="2.2">

<!-- After (Jakarta EE 9+) -->
<persistence xmlns="https://jakarta.ee/xml/ns/jakartaee/persistence"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xsi:schemaLocation="https://jakarta.ee/xml/ns/jakartaee/persistence 
                                 https://jakarta.ee/xml/ns/jakartaee/persistence_3_1.xsd"
             version="3.1">
```

**faces-config.xml namespace update:**
```xml
<!-- Before -->
<faces-config xmlns="http://java.sun.com/xml/ns/javaee"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:schemaLocation="http://java.sun.com/xml/ns/javaee 
                                  http://java.sun.com/xml/ns/javaee/web-facesconfig_2_3.xsd"
              version="2.3">

<!-- After -->
<faces-config xmlns="https://jakarta.ee/xml/ns/jakartaee"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:schemaLocation="https://jakarta.ee/xml/ns/jakartaee 
                                  https://jakarta.ee/xml/ns/jakartaee/web-facesconfig_4_0.xsd"
              version="4.0">
```

### Step 6: Build Verification and Smoke Test

```bash
# Clean build cache to avoid stale javax.class artifacts
mvn clean compile -DskipTests

# Verify no javax.* imports remain in compiled classes
javap -cp target/classes -c com.example.MyServlet 2>/dev/null | grep "javax\." && \
    echo "WARNING: javax references found in compiled bytecode!" || \
    echo "OK: No javax references in compiled bytecode"

# Run unit tests
mvn test -Dtest=*Test

# Deploy to a Jakarta EE reference server for smoke testing (example: OpenLiberty)
# docker run -d --name ee-test-server -p 9080:9080 \
#     -v $(pwd)/target/myapp.war:/config/apps/myapp.war \
#     openliberty/open-liberty:kernel-java17-openj9-ubi

# Smoke test the deployed application
curl -s http://localhost:9080/myapp/api/health | python3 -m json.tool || echo "Deployment check failed"
```

---

## Migration Patterns

### Java Source Code: Before and After

**Before (Java EE 8 — javax namespace):**
```java
package com.example.resource;

import javax.enterprise.context.RequestScoped;
import javax.inject.Inject;
import javax.inject.Named;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.validation.Valid;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.List;

@RequestScoped
@Path("orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OrderResource {

    @Inject
    private OrderService orderService;

    @PersistenceContext(unitName = "orderPU")
    private EntityManager entityManager;

    @GET
    public Response getOrders() {
        List<OrderDTO> orders = orderService.findAll();
        return Response.ok(orders).build();
    }

    @POST
    public Response createOrder(@Valid OrderRequest request) {
        Order created = orderService.create(request);
        return Response.status(Response.Status.CREATED)
                .entity(created).build();
    }
}
```

**After (Jakarta EE 10 — jakarta namespace):**
```java
package com.example.resource;

import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@RequestScoped
@Path("orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OrderResource {

    @Inject
    private OrderService orderService;

    @PersistenceContext(unitName = "orderPU")
    private EntityManager entityManager;

    @GET
    public Response getOrders() {
        List<OrderDTO> orders = orderService.findAll();
        return Response.ok(orders).build();
    }

    @POST
    public Response createOrder(@Valid OrderRequest request) {
        Order created = orderService.create(request);
        return Response.status(Response.Status.CREATED)
                .entity(created).build();
    }
}
```

The code structure is identical — only the import package prefixes change. The Jakarta EE 9+ specification API surface matches Java EE 8 for most commonly used features.

### Maven Plugin Approach for Automated Migration

The Eclipse Foundation provides a dedicated migration tool that handles namespace rewriting automatically:

```xml
<!-- jakartaee-migration-maven-plugin in pom.xml -->
<plugin>
    <groupId>org.eclipse.ee4j</groupId>
    <artifactId>project-api-migration</artifactId>
    <version>1.0.8</version>
    <configuration>
        <namespaces>
            <namespace>
                <from>javax\.persistence</from>
                <to>jakarta.persistence</to>
            </namespace>
            <namespace>
                <from>javax\.servlet</from>
                <to>jakarta.servlet</to>
            </namespace>
            <namespace>
                <from>javax\.enterprise</from>
                <to>jakarta.enterprise</to>
            </namespace>
            <namespace>
                <from>javax\.ws\.rs</from>
                <to>jakarta.ws.rs</to>
            </namespace>
            <namespace>
                <from>javax\.faces</from>
                <to>jakarta.faces</to>
            </namespace>
        </namespaces>
    </configuration>
</plugin>
```

---

## Migration Tooling

### Eclipse EE4J Jakarta EE Migration Tool

The official migration tool from the Eclipse Foundation provides batch namespace rewriting across entire projects:

```bash
# Download the CLI migration tool (jakartaee-migration)
curl -LO https://repo1.maven.org/maven2/org/eclipse/ee4j/project-api-migration/1.0.8/project-api-migration-1.0.8.jar

# Run migration on a source directory
java -jar project-api-migration-1.0.8.jar \
    -s ./src/main/java \
    -d ./target/migrated-src \
    --namespace javax.servlet=jakarta.servlet \
    --namespace javax.persistence=jakarta.persistence \
    --namespace javax.enterprise=jakarta.enterprise \
    --namespace javax.ws.rs=jakarta.ws.rs \
    --namespace javax.faces=jakarta.faces \
    --namespace javax.annotation=jakarta.annotation \
    --namespace javax.validation=jakarta.validation \
    --namespace javax.inject=jakarta.inject

# Process XML descriptors
java -jar project-api-migration-1.0.8.jar \
    -s ./src/main/resources/META-INF \
    -d ./target/migrated-resources \
    --xml-namespace http://java.sun.com/xml/ns/javaee=https://jakarta.ee/xml/ns/jakartaee
```

### IDE Migration Support

| IDE | Tool | Usage |
|-----|------|-------|
| **Eclipse IDE** | EE4J Migration Plugin (install from Eclipse Marketplace) | Right-click project → Migration → Select javax→jakarta mapping. Handles imports, package declarations, and XML namespaces in one operation. |
| **IntelliJ IDEA** | Manual batch replace + JakartaEE plugin | Use `Find in Files` with regex `javax\.(servlet|persistence|enterprise|ws\.rs|faces)` → Replace all. Install the "Jakarta EE Support" plugin for validation. |
| **VS Code** | Extension: "Jakarta EE Language Support" + Regex replace | Search and replace using VS Code's built-in multi-file regex with `^.*import javax\.` pattern scope limited to `.java` files. |

### Gradle Migration Plugin

For Gradle-based projects, the JakartaEE migration is typically done manually since there is no official Gradle plugin:

```groovy
// build.gradle — update dependencies
dependencies {
    // Replace ALL javax.* artifacts with jakarta.* equivalents
    compileOnly 'jakarta.platform:jakarta.jakartaee-api:10.0.0'
    
    // Individual Jakarta dependencies (if you don't use the full API umbrella)
    compileOnly 'jakarta.servlet:jakarta.servlet-api:6.0.0'
    compileOnly 'jakarta.persistence:jakarta.persistence-api:3.1.0'
    compileOnly 'jakarta.enterprise:jakarta.enterprise.cdi-api:4.0.1'
    compileOnly 'jakarta.ws.rs:jakarta.ws.rs-api:3.1.0'
    compileOnly 'jakarta.faces:jakarta.faces-api:4.0.1'
}
```

---

## Common Pitfalls During Migration

| Pitfall | Cause | Resolution |
|---------|-------|------------|
| **Transitive dependencies still using javax\*** | A third-party library depends on `javax.servlet` or `javax.persistence` directly (not through the Jakarta umbrella) | Exclude the old dependency and use its Jakarta-compatible replacement. Check with `mvn dependency:tree | grep javax`. Contact the library vendor for a Jakarta-compatible version. |
| **Build cache retaining stale javax classes** | `~/.m2/repository` or `build/` directories contain compiled classes from before the migration | Run `mvn clean install -U` (forces update snapshots) and delete all `target/` and `build/` directories across all modules |
| **Annotation processor mismatches** | Lombok, MapStruct, or other annotation processors generate code that references javax types | Update annotation processor versions to those compatible with Jakarta EE 9+. For example, Lombok ≥ 1.18.30 supports jakarta namespaces. |
| **Container-specific API changes** | Some containers add vendor-specific annotations (e.g., `@org.jboss.weld.annotation.Transient`) that are not part of Jakarta EE | Replace container-specific annotations with standard Jakarta EE equivalents or remove them if no longer needed in the new container |
| **EL expressions with javax references** | JSF Facelets pages may contain `#{javax.faces.context}` references in custom EL resolvers | Search all `.xhtml` files for `javax.` and update to `jakarta.` namespaces. Check backing beans that use javax imports. |
| **Jakarta EE 9 vs 10 module path changes** | Jakarta EE 9+ splits APIs into multiple JARs on the module path; class loader behavior differs from single-jar Java EE 8 | Test thoroughly with the target container — some applications rely on implicit class loading that no longer works in modular deployments |

---

## Constraints

### MUST DO
- Run a full inventory of `javax.*` usage before starting any migration (imports, dependencies, annotations, XML namespaces)
- Verify every transitive dependency uses Jakarta EE 9+ compatible artifacts after the build update
- Test the migrated application on the target container — different servers may have varying compliance levels
- Update all XML deployment descriptors (`web.xml`, `persistence.xml`, `faces-config.xml`) to match the new namespace URIs
- Run unit and integration tests after migration to verify behavioral equivalence

### MUST NOT DO
- Perform a blind find-and-replace of all `javax` strings without verifying namespace boundaries — some javax references are intentional (e.g., class names, comments) or belong to unrelated libraries
- Mix `javax.*` and `jakarta.*` in the same classpath — this will cause `ClassNotFoundException` at runtime due to Java module path conflicts
- Skip the build cache cleanup (`mvn clean`) before testing post-migration — stale compiled classes with javax imports will cause subtle failures
- Deploy to production without smoke testing on a Jakarta EE reference implementation — namespace changes alone do not guarantee behavioral equivalence

---

## Output Template

When executing or reviewing a Jakarta EE migration, produce:

1. **Migration Scope Report** — Count of files/imports affected per javax.* package
2. **Dependency Changes** — Before/after pom.xml (or build.gradle) showing all artifact replacements
3. **Namespace Rewrite Verification** — Command output confirming zero remaining `javax.` references in Java source and XML descriptors
4. **Build Results** — Compilation output with any errors related to namespace mismatches or missing Jakarta dependencies
5. **Deployment Validation** — Smoke test results from the target Jakarta EE server

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `jakarta-ee` | Reference for Jakarta EE platform specifications, container selection, and architecture patterns used after migration |
| `microprofile` | Cloud-native MicroProfile specs to add after migration if the application targets Kubernetes or service mesh deployments |

---

## Live References

> Authoritative documentation for migrating from Java EE to Jakarta EE.

- [Jakarta EE Migration Guide (Eclipse Foundation)](https://github.com/eclipse-ee4j/migration-tools)
- [Jakarta EE Namespace Change Documentation](https://jakarta.ee/specifications/overview/)
- [EE4J Migration Tools (GitHub)](https://github.com/eclipse-ee4j/migration-tools)
- [Eclipse EE4J Project Overview](https://projects.eclipse.org/projects/ee4j)
- [WildFly Jakarta EE 10 Release Notes](https://docs.wildfly.org/29/)
- [OpenLiberty Jakarta EE 10 Support](https://openliberty.io/blog/?search=jakarta%20ee)
- [Maven Central — jakarta.jakartaee-api](https://central.sonatype.com/artifact/jakarta.platform/jakarta.jakartaee-api)
