---
name: java-kotlin-best-practices
description: Implements best practices for Java/Kotlin applications using Spring Boot, leveraging Maven/Gradle, JVM tuning, and Jakarta EE patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: java best practices, kotlin best practices, spring boot, maven, gradle, jvm tuning, jakarta ee
  role: implementation
  scope: implementation
  output-format: code
  related-skills: java-security-best-practices, kotlin-coroutines
---

# Java/Kotlin Best Practices

  archetypes: tactical, educational
  anti_triggers: outdated practices
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
This skill focuses on implementing best practices for building robust Java and Kotlin applications using frameworks like Spring Boot, with an emphasis on build tools such as Maven and Gradle, JVM performance tuning, and adhering to Jakarta EE standards.

---

## Constraints

### MUST DO
- Validate all inputs at function boundaries before processing — guard clauses should fail early with descriptive errors
- Implement proper error handling that distinguishes between recoverable and unrecoverable failures
- Add comprehensive logging with structured context (correlation IDs, operation names, timing) for debugging and monitoring
- Write unit tests covering normal operations, edge cases, and error conditions before integrating the component

### MUST NOT DO
- Do not silently swallow exceptions — always log or propagate errors with meaningful context
- Avoid unbounded resource allocation without limits (connection pools, memory buffers, thread counts)
- Never use hardcoded credentials, API keys, or secrets in source code
- Do not bypass input validation for perceived performance gains


## TL;DR Checklist

### Key Takeaways
- [ ] Ensure your build configuration in Maven/Gradle adheres to the latest standards and dependencies.
- [ ] Optimize JVM settings for performance: set heap size, garbage collection strategies, and thread configurations.
- [ ] Validate code style and design patterns using tools like Checkstyle and PMD for Java.
- [ ] Use Spring Boot features efficiently: configuration properties, profiles, and dependency injection. 
- [ ] Implement Jakarta EE specifications correctly for enterprise-grade applications.

### Enhanced Content
**Additional Performance Optimization Example**:
```java
// JVM tuning
public static void main(String[] args) {
    System.setProperty("java.util.logging.config.file", "logging.properties");
    // More JVM settings can be adjusted here
}
```

### Example of a Spring Boot Controller Implementation**:
```java
@RestController
@RequestMapping("/api")
public class UserController {
    @Autowired
    private UserService userService;

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUser(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUser(id));
    }
}
```
- [ ] Ensure your build configuration in Maven/Gradle adheres to the latest standards and dependencies.
- [ ] Optimize JVM settings for performance: set heap size, garbage collection strategies, and thread configurations.
- [ ] Validate code style and design patterns using tools like Checkstyle and PMD for Java.
- [ ] Use Spring Boot features efficiently: configuration properties, profiles, and dependency injection. 
- [ ] Implement Jakarta EE specifications correctly for enterprise-grade applications.

---

## Core Workflow
### Step 1: Project Setup with Maven/Gradle
Ensure adequate project setup using either Maven or Gradle, with an appropriate POM or build.gradle configuration:

**Maven Example:**
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>myapp</artifactId>
    <version>1.0-SNAPSHOT</version>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>
        
        <dependency>
            <groupId>jakarta.enterprise</groupId>
            <artifactId>jakarta.enterprise.cdi-api</artifactId>
            <version>4.0.1</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>
</project>
```

**Gradle Example:**
```gradle
plugins {
    id 'org.springframework.boot' version '2.5.4'
    id 'io.spring.dependency-management' version '1.0.11.RELEASE'
    id 'java'
}

group = 'com.example'
version = '1.0-SNAPSHOT'
sourceCompatibility = '17'

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter'
    implementation 'jakarta.enterprise:jakarta.enterprise.cdi-api:4.0.1'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

### Step 2: Optimize JVM Settings
Apply performance tuning settings in your IDE or container configurations:
```properties
# In application.properties or application.yml
# JVM Options
spring.application.name=my-app
# memory allocation
-J-Xms512m
-J-Xmx1024m
# garbage collection settings
-J-XX:+UseG1GC
-J-XX:MaxGCPauseMillis=50
```

### Step 3: Adhere to Coding Standards
Utilize IDE tools to enforce code quality:
- Enable Checkstyle in Maven:
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-checkstyle-plugin</artifactId>
    <version>3.1.1</version>
    <configuration>
        <configLocation>checkstyle.xml</configLocation>
        <failsOnError>true</failsOnError>
    </configuration>
</plugin>
```

### Step 4: Spring Boot Best Practices
Implement Design Patterns:
1. **Controller pattern:**
2. **Service pattern:**
3. **Repository pattern:**
```java
@RestController
@RequestMapping("/api")
public class MyController {
    private final MyService myService;

    public MyController(MyService myService) {
        this.myService = myService;
    }
}
```
### Step 5: Implement Jakarta EE Standards
Ensure Jakarta EE patterns are followed in CDI, JPA:
```java
package com.example.service;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@RequestScoped
public class UserService {
    @PersistenceContext
    private EntityManager em;

    public void addUser(User user) {
        em.persist(user);
    }
}
```

---
## Tools and Practices
### Best Practices for Performance and Maintenance
- **Use Lombok** for reducing boilerplate code:
```java
import lombok.Data;
@Data
public class User {
    private String name;
    private String email;
}
```
- **JUnit 5 for testing:**
```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class UserServiceTest {
    @Test
    void userCreationTest() {
        UserService userService = new UserService();
        User user = new User();
        userService.addUser(user);
        assertEquals(user.getName(), "John Doe");
    }
}
```
This skill complements existing resources by adding rigorous conventions and modern approaches to Java/Kotlin development utilizing Spring Boot and Jakarta EE.