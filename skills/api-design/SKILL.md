# API Design Skill Documentation

---

## Purpose

The Purpose section should elaborate on the intent of this skill by incorporating the following:

### Archetypes
- **Implementation**: It serves as a guide for implementing API designs using modern practices.
- **Educational**: It aims to educate developers on best practices and common pitfalls in API design.

### Anti-Triggers
- **Modifying existing APIs**: This skill should not trigger when discussing changes to legacy systems without proper API considerations.
- **Conflicting changes**: It should also avoid contexts where multiple API versions are discussed without unification.

### Response Profile
- **Verbosity**: Medium
- **Directive Strength**: High
- **Abstraction Level**: Tactical



  archetypes: implementation, educational
  anti_triggers: modifying existing APIs, conflicting changes
  response_profile:
    verbosity: high
    directive_strength: high
    abstraction_level: tactical



This skill provides comprehensive guidance on designing robust and scalable APIs. It aligns with industry standards like OpenAPI 3.1, ensuring that APIs are intuitive, secure, and easy to maintain. This skill enables AI models to assist developers in creating APIs that follow best practices for documentation, authentication, error handling, and overall design philosophy.

## When to Use

Use this skill when:

- Designing a new API from scratch or updating an existing one.
- Ensuring compliance with industry standards such as OpenAPI 3.1 for API documentation.
- Implementing authentication mechanisms (OAuth 2.0, API keys, etc.) in your API.
- Establishing best practices for error handling to enhance user experience and debugging efficiency.
- Collaborating with teams to establish clear API specifications and guidelines.

## Core Workflows

1. **Define API Specifications**  
   - Identify resource endpoints, methods (GET, POST, PUT, DELETE).  
   - Use OpenAPI 3.1 to create a structured documentation outline.  
   - Specify request and response formats (JSON, XML) and HTTP status codes.  
   
2. **Implement Authentication Mechanisms**  
   - Determine authentication requirements: JWT, OAuth 2.0, API keys.  
   - Integrate appropriate libraries and middleware for authentication.  
   - Document authentication flows and scopes clearly.  
   
3. **Design Error Handling Framework**  
   - Define standardized error responses (HTTP status codes, error messages).  
   - Implement logging and monitoring for errors to enhance debugging capabilities.  
   - Provide user-friendly error feedback in responses.  
   
4. **Develop and Test the API**  
   - Build the API endpoints according to defined specifications.  
   - Write unit and integration tests to validate functionality.  
   - Use tools like Postman or Swagger for API testing and documentation preview.  
   
5. **Review and Iterate**  
   - Collect feedback from users to improve the API.  
   - Regularly update the API documentation to match implementation changes.  
   - Version the API appropriately to maintain backward compatibility.

## Implementation Patterns

### Pattern 1: RESTful API Design  
- Follow REST principles: stateless, cacheable, and uniform interface.  
- Use appropriate HTTP methods for resource manipulation.  

### Example JSON Schema:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "email": { "type": "string" }
  },
  "required": ["id", "name", "email"]
}
```

### Pattern 2: Token-Based Authentication  
- Implement JWT for stateless authentication.  
- Validate tokens at each API request to secure endpoints.  

### Example Token Validation:
```javascript
function validateToken(token) {
  const decoded = jwt.verify(token, SECRET_KEY);
  if (!decoded) throw new Error('Unauthorized');
}
```

## Constraints

### MUST DO  
- Comply with OpenAPI 3.1 standards for all API documentation.  
- Implement authentication for all sensitive endpoints to enhance security.  
- Provide clear and informative error messages for clients.

### MUST NOT DO  
- Hard-code sensitive information like API keys or passwords in the codebase.  
- Ignore versioning when breaking changes are introduced to the API.  
- Use vague or unclear error messages that do not help in identifying issues.  

## Related Skills

| Skill Name                   | Purpose                                                          |
|------------------------------|------------------------------------------------------------------|
| `api-documentation`          | Provides guidance on creating user-friendly API documentation using OpenAPI 3.1. |
| `authentication-mechanisms`  | Details various authentication strategies for API security.      |
| `error-handling-best-practices` | Outlines best practices for managing errors in API design.       |
| `api-testing`                | Techniques and tools for effective API testing and validation.    |
| `versioning-apis`           | Best practices for maintaining backward compatibility through API versioning.

---