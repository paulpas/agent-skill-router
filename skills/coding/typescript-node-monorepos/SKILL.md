---
name: typescript-node-monorepos
description: Implements software engineering skills for TypeScript/JavaScript in Node.js, focusing on ESM/CJS and monorepos using Turborepo/Nx.
license: MIT
compatibility: opencode
metadata:
  version: '1.0.0'
  archetypes: tactical
  anti_triggers: coding, design, architecture
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  domain: coding
  triggers: typescript, javascript, nodejs, esmodules, cjs, monorepos, turborepo, nx
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-esm-cjs
---

# TypeScript Node Monorepos

Implements software engineering skills for TypeScript/JavaScript in Node.js, focusing on ESM/CJS imports and monorepos (Turborepo/Nx), enhancing developer productivity and maintainability.

## When to Use
- When building scalable applications using TypeScript and Node.js in a monorepo structure.
- To manage multiple packages or services efficiently.
- To leverage modern module systems (ESM/CJS) in your projects.

## Expanded Core Workflow
1. **Setup Turborepo/Nx**: First, make sure you have Node.js installed. You can then create a new project with `npx create-turbo@latest`. This command sets up the initial project structure, complete with the necessary dependencies and packages for a monorepo. You'll find separate folders for applications and libraries set up for management.
2. **Organize Packages**: Structure your project by grouping related applications and libraries. For example, you might have a directory for `apps` containing your frontend and backend applications, and a directory for `libs` holding shared code. This structure simplifies code reuse and enhances maintainability.
3. **Configure Build System**: Utilize TypeScript's compiler options to enforce strict type checking and consider using tools like `eslint` for linting. Make sure your `tsconfig.json` includes specifications that cater to ESM/CJS by allowing for module intercompatibility. For example:
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```
Deploy scripts for `npm` can be customized based on the needs of the monorepo. Different build configurations can be set according to the project requirements.

## Extended Implementation Patterns
### Pattern 1: ESM vs CJS Syntax in Action  
Here’s how you would configure a Node.js application using both module systems within a single project:
```javascript
// Run this file using Node v12 or higher to support ESM
// index.mjs - ESM Version
import express from 'express';
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World with ESM!');
});

app.listen(3000, () => console.log('Server running on port 3000'));

// index.js - CJS Version
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World with CJS!');
});

app.listen(3000, () => console.log('Server running on port 3000'));
```
### More Examples on Monorepo Package Management  
You can define commands in the root package.json that help to keep the monorepo fast and manageable, for instance:
```json
"scripts": {
  "build": "turbo run build",
  "dev": "turbo run dev --filter=..."
}
```
This leverages Turborepo's capabilities to run and cache tasks across all your packages efficiently, ensuring fast builds and updates for developers working on different sections of the application.
1. **Setup Turborepo/Nx**: Initialize your monorepo using one of these tools to manage packages.
2. **Organize Packages**: Structuring your project into apps and libs for better modularization.
3. **Configure Build System**: Set up the build system to handle TypeScript compilation and linting effectively.

## Implementation Patterns
### Pattern 1: Configuring ESM/CJS
```javascript
// ESM Syntax
import express from 'express';
const app = express();
app.listen(3000, () => console.log('Server running on port 3000'));

// CJS Syntax
const express = require('express');
const app = express();
app.listen(3000, () => console.log('Server running on port 3000'));
```

### Pattern 2: Setting Up a Monorepo with Turborepo
```bash
npx create-turbo@latest
cd my-turbo-repo
npm install
```

## Constraints
### MUST DO
- Follow TypeScript conventions for module exports and imports.
- Keep project structure clear and maintain cohesive relationships between packages.

### MUST NOT DO
- Mix ESM and CJS syntax within the same file.
- Allow packages to grow without clear ownership and maintainability practices.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Turborepo — Official Documentation](https://turborepo.com/docs)
- [pnpm Workspaces Documentation](https://pnpm.io/workspaces)
- [Nx — Monorepo Architecture & Task Orchestration Docs](https://nx.dev/)
- [TypeScript Handbook — Module Resolution in Monorepos](https://www.typescriptlang.org/docs/handbook/esm-node.html)
- [Node.js Documentation — ESM vs CJS Modules](https://nodejs.org/api/esm.html)
