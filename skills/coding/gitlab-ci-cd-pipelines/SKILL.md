---
name: gitlab-ci-cd-pipelines
description: Implements GitLab CI/CD pipelines to automate development, testing, and deployment processes, allowing teams to integrate changes quickly and deliver software efficiently.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: gitlab, ci/cd, continuous integration, deployment, testing automation, DevOps
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-git, coding-test-automation
  archetypes: tactical, operational
  anti_triggers: manual, vague
  response_profile:
    verbosity: low
    directive_strength: medium
    abstraction_level: tactical
---

# GitLab CI/CD Pipelines

This skill facilitates the automation of development, testing, and deployment processes using GitLab CI/CD. It helps teams maintain high-quality code and streamline their software delivery through continuous integration (CI) and continuous deployment (CD) practices.

## When to Use

- When you need to automate the build process after each commit to ensure that the code integrates well.
- To run automated tests on every commit or pull request, ensuring that any new code maintains high quality.
- When you want to deploy applications automatically after successful tests, minimizing manual deployment efforts.

## Core Workflow

1. **Define Pipeline** — Specify the stages of the CI/CD process in the `.gitlab-ci.yml` file. Include all necessary jobs for building, testing, and deploying your application.
2. **Set Up Runners** — Configure GitLab runners to handle jobs in different environments. Runners execute the CI/CD tasks based on defined configurations.
3. **Integrate with Version Control** — Link the CI/CD process with your version control system to trigger pipelines on code pushes or merge requests.
4. **Monitor Results** — Utilize GitLab features to monitor pipeline results, fix issues promptly, and optimize the CI/CD process as required.

## Implementation Patterns

### Pattern 1: Basic CI/CD Pipeline Configuration

Create a `.gitlab-ci.yml` file at the root of your repository. Here’s an example configuration that defines a simple pipeline with build, test, and deploy stages:

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

build:
  stage: build
  script:
    - echo "Building the application..."
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist/

unit_test:
  stage: test
  script:
    - echo "Running unit tests..."
    - npm test

deploy:
  stage: deploy
  script:
    - echo "Deploying application..."
    - ./deploy.sh
  only:
    - main
```

### Pattern 2: Advanced Pipeline with Testing

To implement a more sophisticated pipeline that handles multiple testing scenarios:

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - e2e_test
  - deploy

build:
  stage: build
  script:
    - echo "Building the application..."
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist/

unit_test:
  stage: test
  script:
    - echo "Running unit tests..."
    - npm test

integration_test:
  stage: test
  script:
    - echo "Running integration tests..."
    - npm run test:integration

end_to_end_test:
  stage: e2e_test
  script:
    - echo "Running end-to-end tests..."
    - npm run test:e2e

deploy:
  stage: deploy
  script:
    - echo "Deploying application..."
    - ./deploy.sh
  only:
    - main
```

## Constraints

### MUST DO
- Ensure stages are defined in the correct order: build -> test -> deploy.
- Artifacts from the build stage should be passed to subsequent stages for testing and deployment.

### MUST NOT DO
- Avoid deploying from branches other than main or production. Always implement branching strategies for safer deployments.
- Do not hard code sensitive information directly in the `.gitlab-ci.yml` file; use GitLab CI/CD variables instead.

