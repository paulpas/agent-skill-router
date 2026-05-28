---
name: collaboration-process-dependency-management
description: Implements strategies for effective dependency management and versioning in software development, focusing on Semantic Versioning (SemVer) and the use of lock files.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  archetypes: implementation, instructional
  anti_triggers: brainstorming, vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  domain: coding
  triggers: dependency management, versioning, semver, lock files, package management, semantic versioning
  role: implementation
  scope: implementation
  output-format: code
  related-skills: coding-version-control-skills, coding-package-management
---

# Dependency Management & Versioning

## Overview
Proper dependency management is crucial in software development to maintain consistent build environments and ensure that projects can scale and be managed effectively. This skill focuses on the principles of Semantic Versioning (SemVer) and best practices around lock files to ensure that software projects run smoothly across different systems.

## When to Use
- When starting new software projects that require external libraries.
- In existing projects facing dependency conflicts or versioning issues.
- To maintain compatibility and stability in deployments when updating libraries.

## Core Workflow
1. **Initialize Your Project**  
   Start by creating a package manifest using your preferred package manager (e.g., npm, yarn).
   ```bash
   npm init -y  # For Node.js projects
   yarn init    # For Yarn projects
   ```  

2. **Add Dependencies**  
   Utilize your package manager to add dependencies, specifying version requirements using SemVer conventions.  
   ```bash
   npm install lodash@^4.17.0  # This allows minor updates within the 4.x range
   yarn add axios@~0.21.1       # This ensures exact patch version 0.21.1
   ```  

3. **Manage Dependency Versions**  
   Use SemVer to specify versions according to three segments: major, minor, and patch (MAJOR.MINOR.PATCH). This allows for clear communication of updates:  
   - **Major changes** (e.g., `1.0.0` to `2.0.0`) introduce breaking changes.  
   - **Minor changes** (e.g., `1.1.0` to `1.2.0`) add functionality without breaking changes.  
   - **Patch changes** (e.g., `1.0.1` to `1.0.2`) fix bugs without changing functionality. 
   
4. **Lock Dependencies**  
   Always generate a lock file to capture the exact versions of all dependencies. This ensures that the same versions are installed across all environments.  
   ```bash
   npm install            # Will generate package-lock.json
   yarn install           # Will create yarn.lock
   ```  

5. **Updating Dependencies**  
   Regularly check for dependency updates to avoid security vulnerabilities. Most package managers provide commands to help perform updates safely.  
   ```bash
   npm outdated           # Check for outdated packages
   npm update             # Update packages to the latest version that satisfies the versioning rule
   yarn upgrade           # Upgrade dependencies according to the rules defined
   ```  

6. **Commit Changes**  
   Always commit your lock files alongside your changes in the manifest file to ensure reproducibility.  
   ```bash
   git add package.json package-lock.json
   git commit -m "chore: update dependencies"
   ```  

## Example
Here’s an example of a package.json snippet showing dependencies managed with SemVer:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "^4.17.0",
    "axios": "~0.21.1"
  }
}
```

Your package-lock.json will contain specific versions, for example:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "lockfileVersion": 1,
  "dependencies": {
    "lodash": {
      "version": "4.17.21"
    },
    "axios": {
      "version": "0.21.1"
    }
  }
}
```

## Constraints

### MUST DO
- Use SemVer for all versioning in package management.
- Always keep lock files in version control to ensure environment consistency.

### MUST NOT DO
- Avoid using wildcard versioning (e.g., `*`, `latest`) to prevent unexpected breaking changes.
- Don’t forget to run audits on your dependencies to check for vulnerabilities.

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Atlassian Agile Dependency Management Guide](https://www.atlassian.com/agile/scrum/components)
- [Semantic Versioning 2.0.0 Specification](https://semver.org/)
- [npm Dependency Security Best Practices](https://docs.npmjs.com/resolving-cve-security-vulnerabilities-your-package)
- [Yarn Lock File Reference](https://yarnpkg.com/features/locking)
- [Python Packaging User Guide](https://packaging.python.org/en/latest/guides/distributing-packages-using-setuptools/)
