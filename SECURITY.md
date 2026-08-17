# Security Policy

## Supported Versions

We actively maintain the latest stable version of **jangojs** and provide security updates for supported releases.

| Version | Supported | Notes |
|---|---|---|
| 1.x.x | ✅ Yes | Active development and security updates |
| < 1.0 | ❌ No | Upgrade to a supported version is recommended |

Because jangojs is actively developed, users are strongly encouraged to use the latest stable release.

---

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in jangojs, please report it privately.

### Please Do Not

- Publicly disclose the vulnerability before it has been investigated and fixed.
- Create public GitHub issues containing security vulnerabilities.
- Access, modify, or delete data that does not belong to you.
- Perform denial-of-service or destructive testing.
- Test vulnerabilities against systems you do not own or have explicit permission to test.

### How to Report

Report security vulnerabilities through one of the following methods:

- **Security email:** `security@jangojs.dev`
- **GitHub Private Vulnerability Reporting:** Use the repository's **Security → Advisories → Report a vulnerability** feature.

If `security@jangojs.dev` is not available, use GitHub's private vulnerability reporting system.

### Include the Following Information

Please provide as much of the following information as possible:

- Vulnerability description
- Affected jangojs version
- Steps to reproduce
- Proof of concept, if available
- Expected behavior
- Actual behavior
- Security impact
- Environment information
- Potential mitigation or fix, if known

Avoid including passwords, API keys, personal information, or other sensitive data in your report.

---

## What to Expect

We aim to handle security reports according to the following targets:

| Severity | Target Fix Time |
|---|---|
| Critical | Within 7 days |
| High | Within 14 days |
| Medium | Next appropriate release cycle |
| Low | Next appropriate release cycle |

We aim to acknowledge security reports within **48 hours** and provide status updates during the investigation when appropriate.

These timelines are targets rather than guaranteed service-level agreements.

---

## Vulnerability Disclosure Process

Our normal disclosure process is:

1. **Report received** — We acknowledge the report.
2. **Initial assessment** — We reproduce and assess the vulnerability.
3. **Investigation** — We determine affected versions and security impact.
4. **Fix development** — A patch or mitigation is developed.
5. **Testing** — The fix is tested before release.
6. **Security release** — A patched version is published.
7. **Disclosure** — Security information may be published after users have had reasonable time to update.
8. **Reporter credit** — Researchers may be credited unless they request anonymity.

---

# Security Considerations

jangojs is primarily intended for **development, learning, and prototyping**. Additional security controls are required before deploying an application built with jangojs to a public or production environment.

## 1. Authentication and Authorization

jangojs does not provide a complete built-in authentication and authorization system.

Applications that require protected resources should implement appropriate authentication and authorization mechanisms.

### Important

**Do not expose administrative interfaces or sensitive application endpoints to the public internet without appropriate authentication and authorization.**

Depending on the application, authentication may be implemented through:

- Application-level authentication middleware
- Session-based authentication
- Token-based authentication
- OAuth/OpenID Connect
- A trusted reverse proxy or identity provider

Authentication alone is not sufficient; authorization checks should also be performed for protected resources.

---

## 2. Flat-File Storage

jangojs applications may use JSON files for data storage.

This approach is convenient for development but has limitations:

- Files must have appropriate operating-system permissions.
- Sensitive data should not be stored in publicly accessible directories.
- Concurrent writes must be handled safely.
- Large datasets may cause memory and performance problems.
- Backups should be protected.
- Applications requiring stronger durability, concurrency, or access control should use a production database.

For production systems, consider using an established database such as PostgreSQL, MySQL/MariaDB, or another database appropriate for the application.

---

## 3. Template Security

Templates may contain JavaScript-based rendering logic.

Auto-escaping should be enabled wherever supported.

Developers should be particularly careful when rendering user-controlled content.

Avoid using unsafe rendering mechanisms such as `|safe` with untrusted input unless the content has been properly sanitized.

Never assume that user input is safe simply because it originated from your application's form or API.

---

## 4. HTTP Security Headers

Applications should configure appropriate HTTP security headers.

Example middleware:

```js
function securityHeaders(request, next) {
  return Promise.resolve(next()).then((response) => {
    response.headers = response.headers || {};

    response.headers["X-Content-Type-Options"] = "nosniff";
    response.headers["X-Frame-Options"] = "DENY";
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    response.headers["Content-Security-Policy"] =
      "default-src 'self'; object-src 'none'; base-uri 'self'";

    return response;
  });
}

module.exports = {
  MIDDLEWARE: [securityHeaders],
};
```

### HTTPS

Production applications should use HTTPS.

When HTTPS is enabled, applications may also use:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Only enable HSTS when the domain is consistently served over HTTPS and the deployment is configured correctly.

### Note

`X-XSS-Protection` is intentionally not included because it is obsolete in modern browsers. A properly configured Content Security Policy and safe output handling are preferred.

---

## 5. Input Validation

All data received from users, APIs, forms, query parameters, headers, cookies, and uploaded files should be considered untrusted.

Applications should:

- Validate input types.
- Enforce reasonable length limits.
- Validate file types and sizes.
- Sanitize content when necessary.
- Reject unexpected input.
- Avoid directly constructing database queries or operating-system commands from user input.

---

## 6. Rate Limiting

Public-facing applications should implement rate limiting where appropriate.

Rate limiting can help reduce:

- Brute-force attacks
- Credential abuse
- API abuse
- Excessive resource consumption
- Automated requests

Rate limits should be appropriate for the application's expected traffic.

---

## 7. Secrets and Environment Variables

Never commit secrets to source control.

Examples of secrets that should not be committed include:

- Passwords
- API keys
- Database credentials
- Session secrets
- Private keys
- OAuth credentials
- Encryption keys

Use environment variables or an appropriate secret-management system.

Add environment files to `.gitignore` when appropriate:

```gitignore
.env
.env.*
!.env.example
```

An `.env.example` file may be committed when it contains only placeholder values.

---

## 8. Dependency and Supply-Chain Security

jangojs currently aims to keep its core dependency footprint small.

However, having few or zero runtime dependencies does **not** eliminate supply-chain risk.

Applications may still depend on:

- npm packages
- Build tools
- GitHub Actions
- Docker images
- Operating-system packages
- Development dependencies

Use trusted packages and review dependencies before adding them to a project.

Run:

```bash
npm audit
```

Regularly review dependency updates and security advisories.

---

# Production Deployment Checklist

Before deploying an application publicly:

- [ ] Use the latest supported jangojs release.
- [ ] Set the appropriate production environment configuration.
- [ ] Do not commit `.env` files or secrets.
- [ ] Use HTTPS.
- [ ] Configure authentication.
- [ ] Configure authorization.
- [ ] Protect administrative endpoints.
- [ ] Validate and sanitize user input.
- [ ] Configure security headers.
- [ ] Configure rate limiting.
- [ ] Protect JSON/database files with appropriate permissions.
- [ ] Keep sensitive files outside publicly served directories.
- [ ] Configure secure logging and monitoring.
- [ ] Keep dependencies updated.
- [ ] Run security scans regularly.
- [ ] Maintain secure backups.
- [ ] Review server and reverse-proxy configuration.

---

# Security Scanning

Projects may use automated security scanning through GitHub Actions.

Recommended checks include:

- `npm audit`
- GitHub Dependabot
- GitHub CodeQL
- Optional third-party security scanners such as Snyk

Third-party scanners should only be enabled when their required credentials and configuration are available.

---

# Example GitHub Actions Security Workflow

Save the following as:

```text
.github/workflows/security.yml
```

```yaml
name: Security Scan

on:
  push:
    branches:
      - main
      - master

  pull_request:
    branches:
      - main
      - master

  schedule:
    - cron: "0 0 * * 0"

  workflow_dispatch:

permissions:
  contents: read
  security-events: write

jobs:
  npm-audit:
    name: npm Audit
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "lts/*"
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=moderate

  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript

      - name: Analyze
        uses: github/codeql-action/analyze@v3
```

### Optional Snyk Scan

If the project uses Snyk, add it only after configuring the `SNYK_TOKEN` repository secret.

```yaml
  snyk:
    name: Snyk Security Scan
    runs-on: ubuntu-latest
    if: ${{ secrets.SNYK_TOKEN != '' }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "lts/*"
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

---

# Responsible Disclosure

We ask security researchers to:

- Act in good faith.
- Test only systems they own or have explicit permission to test.
- Avoid accessing other users' information.
- Avoid modifying or destroying data.
- Avoid denial-of-service attacks.
- Avoid social engineering attacks.
- Give maintainers reasonable time to investigate and resolve vulnerabilities.
- Keep vulnerability details private until coordinated disclosure is appropriate.

---

# Safe Harbor

We will not pursue legal action against security researchers who:

- Act in good faith.
- Follow this security policy.
- Test only systems they are authorized to test.
- Avoid intentionally harming users or systems.
- Report vulnerabilities privately.
- Allow reasonable time for remediation.

Testing that violates applicable laws, targets systems without authorization, or causes intentional harm is not covered by this safe-harbor statement.

---

# Security Advisories

Security fixes may be communicated through:

- GitHub Security Advisories
- GitHub release notes
- npm release information
- Project documentation

Users should update to the latest supported release when security fixes are announced.

---

# Acknowledgments

We appreciate security researchers and contributors who responsibly report vulnerabilities and help improve jangojs.

Researchers may be credited in security advisories or release notes unless they request anonymity.

---

# Contact

| Contact Method | Details |
|---|---|
| Security Email | `security@jangojs.dev` |
| GitHub Security Advisories | GitHub **Security → Advisories** |
| GitHub Issues | Non-security bugs only |
| Twitter/X | `@jangojs` for general project inquiries |

**Do not report security vulnerabilities through public GitHub Issues.**

---

## Policy Information

**Project:** jangojs  
**Policy Version:** 1.0.0  
**Last Updated:** August 2026

This policy may be updated as the project evolves. Always refer to the latest `SECURITY.md` in the official repository for the current policy.
