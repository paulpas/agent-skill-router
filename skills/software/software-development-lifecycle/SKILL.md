---
name: software-development-lifecycle
description: Covers the complete software development lifecycle (SDLC) including analysis, design, development, testing, deployment, and maintenance.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: software
  triggers: software development lifecycle, SDLC, Agile, DevOps, Waterfall, project management
  role: implementation
  scope: implementation
  output-format: code
  related-skills: software-architecture-overview, software-testing-best-practices
  archetypes: tactical
  anti_triggers: legacy, manual
  response_profile: { verbosity: high, directive_strength: high, abstraction_level: tactical }
---

# Software Development Lifecycle

This skill provides a detailed overview of the Software Development Lifecycle (SDLC), detailing the various phases and methodologies involved in software development.

## When to Use
- When initiating a new software project.
- For continuous integration and continuous deployment (CI/CD) implementations.
- In scenarios requiring project management and coordination of teams.

## Core Workflow

1. **Requirement Analysis**  
   Gather and analyze requirements using stakeholder interviews, surveys, and documentation.

2. **Planning**  
   Develop a project plan including timelines, resource allocation, and risk assessment. Make use of tools like Gantt charts or Kanban boards to visualize tasks.

3. **Design**  
   Create detailed architectural and design documents outlining how the software meets specifications. Consider using UML diagrams or flowcharts for clarity.

4. **Development**  
   Begin coding based on design specifications. Adopt coding standards and best practices, and integrate version control to manage changes effectively.

5. **Testing**  
   Implement multiple levels of testing such as unit, integration, system, and acceptance testing. Use CI/CD tools like Jenkins to automate testing processes.
   Example command for running tests in a Node.js application:
   ```bash
   npm test
   ```

6. **Deployment**  
   Prepare the application for deployment to the production environment. Ensure rollback strategies and health checks are in place. Example command for deploying to AWS using the AWS CLI:
   ```bash
   aws s3 cp myapp s3://mybucket/myapp --recursive
   ```

7. **Maintenance**  
   Continuously monitor the application for issues and gather user feedback for improvements. Schedule regular updates and enhancements to keep the software relevant.

## Implementation Patterns

### Example of CI/CD Pipeline Structure
```yaml
# Sample pipeline configuration
name: CI/CD Pipeline
on:
  push:
    branches:
      - main
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - run: npm install
      - run: npm test
```  

## Constraints

### MUST DO
- Ensure thorough documentation is maintained throughout all phases of the SDLC.
- Implement continuous feedback loops at each phase to allow for quick corrections and adaptations.

### MUST NOT DO
- Skip important documentation as it is crucial for future reference and onboarding new team members.
- Rush through any stage of the lifecycle; each phase must be given its appropriate attention to ensure quality and success of the project.
