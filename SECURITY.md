# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in WhisperChat, please report it responsibly:

1. **DO NOT** create a public GitHub issue
2. Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) feature
3. Or email the maintainers directly

## Scope

Security issues we care about:
- Encryption implementation flaws
- Server-side data leakage (messages, keys, user identity)
- Authentication bypass (restricted room access)
- WebSocket protocol vulnerabilities
- XSS, injection, or other web security issues

## Security Design Principles

1. **Zero Knowledge**: The server never sees plaintext messages or room keys
2. **Key Separation**: Room keys travel via URL fragment (`#`), which browsers never send to servers
3. **Memory Only**: No database, no file writes, no persistent storage
4. **Verify, Then Forget**: User identity (open_id) is checked for room access, then immediately discarded
5. **Independent Burn Timers**: Each reader gets their own full countdown — no race conditions
