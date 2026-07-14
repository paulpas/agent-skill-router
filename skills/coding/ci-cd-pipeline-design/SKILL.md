---




name: ci-cd-pipeline-design

description: Implements strategies for automation in building, testing, and deploying software through continuous integration and delivery principles.
license: MIT
compatibility: opencode
metadata:
  version: "1.1.1"
  domain: coding
  triggers: ci cd, automation strategies, pipeline design, build automation, deployment strategies
  archetypes: [implementation, orchestration]
  anti_triggers: [manual deployment processes, non-automated testing]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational

  role: implementation
  scope: implementation
  output-format: code



---

# CI/CD Pipeline Design

Designs and implements CI/CD pipelines using GitHub Actions, GitLab CI, and Jenkins with automated build, test, security scan, and deployment stages, enforcing quality gates and reliable release workflows across environments.

## TL;DR for Code Generation

- Design pipelines with clear stage isolation — each stage (lint, test, build, deploy) runs independently with explicit artifact passing between stages
- Use matrix builds for cross-version testing (e.g., Node 18/20, Python 3.10/3.11) but keep the matrix focused to avoid combinatorial explosion
- Pin CI runner versions (e.g., `ubuntu-22.04`, `actions/checkout@v4`) to prevent unexpected breakage from runner updates
- Secrets must come from the CI platform's secret store (GitHub Secrets, GitLab CI/CD Variables), never from repository files or hardcoded values
- Make pipelines fail fast: fail on the first error within a stage and surface failures clearly in PR status checks


## Importance of CI/CD in Modern Development Practices
Continuous Integration and Continuous Delivery (CI/CD) are essential methodologies that enable teams to deliver high-quality software efficiently. Here are the primary benefits:
- **Faster Time to Market**: Rapidly deploy features to end-users, enhancing competitiveness.
- **Reduced Risk**: Smaller, incremental updates lessen the probability of significant system failures.
- **Enhanced Collaboration**: Regular integration fosters communication and collective ownership of code amongst team members.

### Essential Tools for CI/CD Pipelines:
- **Source Control Management (SCM)**: Tools like Git or GitHub streamline collaborative development.
- **Continuous Integration Servers**: Jenkins, CircleCI, GitLab, and GitHub Actions automate build processes to catch defects early.
- **Artifact Repositories**: Manage dependencies and artifacts efficiently with Nexus or Artifactory.
- **Containerization**: Docker and Kubernetes provide a consistent environment from development to production, improving reliability and scalability.

### Best Practices for CI/CD Pipelines:
1. **Incorporate Automated Testing**: Implement a comprehensive suite of tests (unit, integration, and end-to-end) to maintain code quality.
2. **Monitor Pipeline Performance**: Track build times, success rates, and deployment frequencies to optimize the CI/CD process.
3. **Use Infrastructure as Code (IaC)**: Define infrastructure through code to ensure consistent environments and facilitate easy scaling.
4. **Maintain Documentation**: Document your CI/CD pipeline, emphasizing processes to ensure that team members can easily onboard new tools.

### Measuring CI/CD Success:
Establish KPIs like build success rates, deployment frequency, lead time for changes, mean time to recover, and change failure rates to allow for consistent evaluation of your CI/CD effectiveness.

### FAQs About CI/CD Best Practices:
- **What role do automated tests play?**  
Automated tests ensure code quality at every pipeline stage, identifying defects and vulnerabilities swiftly.
- **How should teams implement CI/CD?**  
Start with automating the build process, and gradually progress to full deployment automation with a focus on the testing phase.
- **Can CI/CD principles apply to non-cloud environments?**  
Absolutely! CI/CD can enhance workflows in both cloud and on-premises setups, yielding quality improvements.

By adopting effective CI/CD strategies, teams can foster an environment of continuous improvement while delivering high-quality software rapidly and efficiently.

---

## Implementation Patterns

### Pattern 1: GitHub Actions CI Workflow

A complete `.github/workflows/ci.yml` with lint, test (matrix), build, and deploy stages:

```yaml
name: CI Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"

jobs:
  lint:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm audit --audit-level=high

  test:
    runs-on: ubuntu-22.04
    needs: lint
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"
      - run: npm ci
      - run: npm test
        env:
          CI: "true"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-${{ matrix.node-version }}
          path: junit.xml

  build:
    runs-on: ubuntu-22.04
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  deploy:
    runs-on: ubuntu-22.04
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: echo "Deploying to production..."
```

### Pattern 2: GitLab CI Pipeline

A complete `.gitlab-ci.yml` with parallel test matrix, caching, and environment-scoped deploy:

```yaml
stages:
  - lint
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

lint:
  stage: lint
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run lint
    - npm audit --audit-level=high

test:
  stage: test
  image: node:${CI_NODE_VERSION}
  parallel:
    matrix:
      - CI_NODE_VERSION: ["18", "20"]
  script:
    - npm ci
    - npm run test:ci
  artifacts:
    when: always
    reports:
      junit: junit.xml

build:
  stage: build
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache curl
    - curl -X POST "$DEPLOY_WEBHOOK"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: always
    - when: never
  environment:
    name: production
    url: https://app.example.com
```

## Constraints

### MUST DO
- Define clear input/output contracts for every step in the orchestration flow with explicit validation
- Implement structured logging at each stage capturing context, inputs, outputs, timing, and errors
- Build in fallback paths: if the primary strategy fails, degrade gracefully to a simpler approach
- Validate all preconditions before starting — do not proceed if required resources or permissions are missing

### MUST NOT DO
- Do not create deep nesting of orchestration steps (>5 levels) — flatten workflows where possible
- Avoid silent failure modes: every step must either succeed, fail explicitly, or escalate to a higher handler
- Never use shared mutable state between parallel workflow branches — communicate via immutable messages only
- Do not hardcode execution order when the dependency graph naturally determines it; derive order from explicit dependencies


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jenkins User Handbook](https://www.jenkins.io/doc/book/)
- [GitLab CI/CD Configuration Reference](https://docs.gitlab.com/ee/ci/yaml/)
- [CircleCI Configuration Best Practices](https://circleci.com/docs/configuration-tips-and-tricks/)
- [Spinnaker Deployment Pipelines Guide](https://spinnaker.io/guides/user/pipelines/)