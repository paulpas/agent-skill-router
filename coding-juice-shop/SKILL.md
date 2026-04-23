---
name: coding-juice-shop
description: OWASP Juice Shop guide: Web application security testing with intentionally vulnerable Node.js/Express application for learning and practice
license: MIT
compatibility: opencode
how_to_guide: https://pwning.owasp-juice.shop/
id: juice-shop
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: juice shop, juice-shop, owasp, guide, application
---

# OWASP Juice Shop

The OWASP Juice Shop is an intentionally vulnerable Node.js/Express web application for learning and practicing web application security testing.

## When to Use

Use when:
- Teaching web application security concepts
- Practicing penetration testing techniques
- Demonstrating vulnerability exploitation
- Testing security tooling
- Training security teams

Do NOT use when:
- You need a production e-commerce solution
- You want to test security tooling against real production systems
- You need a secure application for business use

## Architecture

### Technology Stack

- **Runtime**: Node.js with Express framework
- **Database**: SQLite (file-based) or MongoDB (document-based)
- **Frontend**: Angular (web interface)
- **Backend**: Node.js/Express REST API

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Juice Shop Application                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │   Frontend   │────▶│   Backend    │────▶│   Database   │ │
│  │  (Angular)   │     │ (Express)    │     │ (SQLite/Mongo)││
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│                        │                                     │
│                        ▼                                     │
│                  ┌──────────────┐                            │
│                  │   Security   │                            │
│                  │   Features   │                            │
│                  │ (Vulnerabilities)                         │
│                  └──────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### Vulnerability Categories

1. **Injection** — SQL, NoSQL, OS, and template injection
2. **Broken Authentication** — Session management, password policies
3. **Sensitive Data Exposure** — Cryptographic failures, data at rest
4. **XXE (XML External Entities)** — XML parser configuration
5. **Broken Access Control** — Path traversal, privilege escalation
6. **Security Misconfiguration** — Headers, debug mode, defaults
7. **XSS (Cross-Site Scripting)** — Stored, reflected, DOM-based
8. **Insecure Deserialization** — Object deserialization attacks
9. **Using Components with Known Vulnerabilities** — Dependency vulnerabilities
10. **Insufficient Logging & Monitoring** — Audit trails, alerting

## Common Attack Vectors

### SQL Injection

The application contains SQL injection vulnerabilities in search functions.

```javascript
// Vulnerable pattern (DO NOT USE in production)
app.get('/search', (req, res) => {
    const query = req.query.q;
    db.execute(`SELECT * FROM products WHERE name LIKE '%${query}%'`);
});
```

### XSS (Cross-Site Scripting)

Reflected and stored XSS vulnerabilities in user-input fields.

### Path Traversal

File access endpoints without proper path validation.

```javascript
// Vulnerable pattern
app.get('/download', (req, res) => {
    const file = req.query.file;
    res.sendFile(path.join(__dirname, 'ftp', file));
});
```

### Broken Authentication

Weak session management and password policies.

## Testing Workflow

### 1. Setup

```bash
# Clone the repository
git clone https://github.com/juice-shop/juice-shop.git
cd juice-shop

# Install dependencies
npm install

# Start the application
npm start
# or
node app.js
```

### 2. Access the Application

- Web Interface: http://localhost:3000
- REST API: http://localhost:3000/api
- Admin Panel: http://localhost:3000/#/administration

### 3. Run Security Tests

1. **Manual Testing**: Use browser developer tools to:
   - Inject SQL payloads in search boxes
   - Test XSS in comment fields
   - Attempt path traversal in file download links
   - Modify JWT tokens

2. **Automated Scanning**: Use tools like:
   - OWASP ZAP
   - Burp Suite
   - SQLMap
   - Nikto

### 4. Solve Challenges

The application includes a challenge system to guide learners:

```bash
# View available challenges
curl -X GET http://localhost:3000/api/Challenges
```

## Key Features

### Intentional Vulnerabilities

- 20+ security vulnerabilities across OWASP Top 10
- Multiple difficulty levels for challenges
- Hints system for guided learning
- Score board for tracking progress

### Learning Resources

- Detailed solutions for each challenge
- Explanation of attack vectors
- Mitigation recommendations
- References to security best practices

## Configuration

### Environment Variables

```bash
# Database configuration
export DATABASE=sqlite
export DATABASE_PATH=./data/juiceshop.sqlite

# Port configuration
export PORT=3000

# Log level
export LOG_LEVEL=debug

# Security settings
export NO_SECURITY_HINTS=false
```

### Docker Deployment

```bash
docker run -p 3000:3000 owaspjuice-shop/juice-shop
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change `PORT` environment variable
   - Or kill existing process: `kill $(lsof -t -i:3000)`

2. **Database errors**
   - Check SQLite file permissions
   - Verify database path exists

3. **Modules not found**
   - Run `npm install` from project root
   - Check Node.js version (requires Node 14+)

## References

- **Official Site**: https://owasp.org/www-project-juice-shop/
- **GitHub**: https://github.com/juice-shop/juice-shop
- **PWNING Guide**: https://pwning.owasp-juice.shop/
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **CNCF Security**: https://github.com/cncf/tag-security

## Knowledge Reference

- OWASP Juice Shop: https://github.com/juice-shop/juice-shop
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Web Security Academy: https://portswigger.net/web-security
- Snyk Vulnerability Database: https://snyk.io/vuln/
