# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

To report a security vulnerability, please email the maintainers directly or use GitHub's private vulnerability reporting feature:

1. Go to the **Security** tab of this repository
2. Click **Report a vulnerability**
3. Fill in the details of the vulnerability

You should receive a response within **48 hours**. If the vulnerability is confirmed, we will:

- Acknowledge the report and work on a fix
- Release a patch as soon as possible depending on severity
- Credit the reporter in the release notes (if desired)

## Security Expectations

This repository is part of **Claw Protect** — an AI-agent security platform. Security is a first-class concern:

- All pull requests must pass the mandatory security gates (CodeQL SAST, secret scanning, dependency scanning)
- Security-sensitive modules in `src/lib/security/` undergo automated testing
- The AI-BOM (AI Bill of Materials) registry tracks all LLM pipeline components per NIST AI RMF guidance
- Prompt injection heuristics guard all ingest pathways

## Scope

The following are in scope for security reports:

- Remote code execution or privilege escalation
- Authentication/authorization bypasses
- Injection vulnerabilities (prompt injection, SQL injection, XSS)
- Secrets or credentials exposed in source code or build artefacts
- Supply-chain attacks on AI model pipelines or dependencies

## Out of Scope

- Denial-of-service attacks on a single-user local dashboard
- Social engineering of maintainers
- Vulnerabilities in downstream third-party dependencies that are already publicly disclosed and pending upstream fixes

## Security Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed description of the security posture, data flows, and governance model.
