---
name: graphql-api-design
description: Implements best practices for designing GraphQL APIs, focusing on schema
  design, query optimization, and resolver implementation.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: graphql, api design, schema definition, resolver implementation, query
    optimization, documentation
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
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

