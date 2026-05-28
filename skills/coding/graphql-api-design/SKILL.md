---
name: graphql-api-design
description: Implements best practices for designing GraphQL APIs, focusing on schema design, query optimization, and resolver implementation.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: graphql, api design, schema definition, resolver implementation, query optimization, documentation
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-api-best-practices, coding-error-handling
---

# GraphQL API Design Skill

  archetypes: tactical, educational
  anti_triggers: basic REST practices
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical

Implements best practices for designing GraphQL APIs, focusing on schema design, query optimization, and resolver implementation.

## TL;DR Checklist

### Key Takeaways
- [ ] Define a clear and concise schema that adheres to GraphQL specifications.
- [ ] Implement efficient resolvers for handling queries.
- [ ] Optimize queries and manage response sizes effectively.

### Additional Implementation Examples
**Example of a Basic GraphQL Schema**:
```graphql
type Query {
    user(id: ID!): User
    posts: [Post]
}

type User {
    id: ID!
    name: String!
    email: String
}

type Post {
    id: ID!
    title: String!
    content: String
}
```

**Example of a Resolver Implementation**:
```javascript
const resolvers = {
    Query: {
        user: (_, { id }) => {
            return getUserById(id);
        },
        posts: () => {
            return getAllPosts();
        }
    }
};
```

**Error Handling When Processing Resolvers**:
```javascript
const resolvers = {
    Query: {
        user: async (_, { id }) => {
            try {
                return await getUserById(id);
            } catch (error) {
                throw new Error('User not found');
            }
        }
    }
};
```
- [ ] Define a clear and concise schema.
- [ ] Implement efficient resolvers.
- [ ] Use arguments and variables effectively.
- [ ] Handle errors and edge cases gracefully.
- [ ] Document the API with tools like GraphiQL.

---

## When to Use
Use this skill when:
- Designing or implementing a new GraphQL API.
- Optimizing queries for performance.
- Educating team members on GraphQL best practices.

---

## When NOT to Use
Avoid this skill for:
- RESTful API designs without necessary adaptations.
- Non-GraphQL related architecture tasks.

---

## Core Workflow
1. **Define Schema** — Model the data types and structure of the API.
2. **Implement Resolvers** — Write resolvers that interact with your data sources.
3. **Optimize Queries** — Analyze and improve the efficiency of GraphQL queries and mutations.
4. **Testing & Validation** — Ensure the API is tested against expected outputs.
5. **Documentation** — Generate documentation automatically using GraphQL tools.

---

## Implementation Patterns
### Pattern 1: Schema Definition
```graphql
type Resource {
    id: ID!
    name: String!
}
```

### Pattern 2: Resolver Function
```python
def resolve_resources(parent, args, context):
    return get_all_resources()
```

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [GraphQL Official — How GraphQL Works](https://graphql.org/learn/)
- [Hasura — Learn GraphQL](https://hasura.io/learn/graphql/)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)
- [GraphQL Yoga — Server Implementation Guide](https://the-guild.dev/graphql/yoga-server)
- [GraphiQL IDE Usage and Schema Browsing](https://github.com/graphql/graphiql)
