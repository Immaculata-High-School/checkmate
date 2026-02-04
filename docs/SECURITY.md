# CheckMate Security Overview

This document outlines the security measures and best practices implemented in the CheckMate application to protect user data, maintain system integrity, and ensure safe integration with external systems like PowerSchool.

---

## Table of Contents

1. [Authentication & Session Management](#authentication--session-management)
2. [Password Security](#password-security)
3. [Authorization & Access Control](#authorization--access-control)
4. [Data Protection](#data-protection)
5. [API Security](#api-security)
6. [Rate Limiting & DDoS Protection](#rate-limiting--ddos-protection)
7. [Audit Logging](#audit-logging)
8. [PowerSchool Integration Security](#powerschool-integration-security)
9. [Infrastructure Security](#infrastructure-security)
10. [Security Best Practices](#security-best-practices)

---

## Authentication & Session Management

### Session-Based Authentication with Lucia

CheckMate uses [Lucia](https://lucia-auth.com/), a modern, secure authentication library that provides:

- **Secure Session Tokens**: Cryptographically random session IDs that are virtually impossible to guess or brute force
- **HTTP-Only Cookies**: Session cookies are marked as HTTP-only, preventing JavaScript access and mitigating XSS attacks
- **Secure Cookie Attributes**: In production, cookies are set with the `Secure` flag, ensuring they are only transmitted over HTTPS
- **Session Expiration**: Sessions automatically expire, requiring re-authentication
- **Session Invalidation**: Sessions are properly invalidated on logout

### Session Storage

- Sessions are stored in a PostgreSQL database using Prisma ORM
- Session data is never exposed to the client
- Session validation occurs on every request via server hooks

```typescript
// Secure cookie configuration
sessionCookie: {
  attributes: {
    secure: !dev  // HTTPS required in production
  }
}
```

---

## Password Security

### Bcrypt Hashing

All user passwords are hashed using **bcrypt** with a cost factor of 10:

- **One-Way Hashing**: Passwords cannot be reversed or decrypted
- **Salted Hashes**: Each password has a unique salt, preventing rainbow table attacks
- **Adaptive Cost**: Bcrypt's work factor can be increased as hardware improves
- **Timing Attack Resistant**: bcrypt.compare uses constant-time comparison

```typescript
// Password hashing on registration/reset
const hashedPassword = await bcrypt.hash(password, 10);

// Password verification on login
const validPassword = await bcrypt.compare(password, user.password);
```

### Password Requirements

- Passwords are required for all user accounts
- Password reset functionality uses secure, time-limited tokens


---

## Authorization & Access Control

### Role-Based Access Control (RBAC)

CheckMate implements a comprehensive multi-level role system:

#### Platform Roles
| Role | Description |
|------|-------------|
| `PLATFORM_ADMIN` | Full system access, can invite new orginizations and delte exisiting ones, cannot view any private orginization data or log into accounts |
| `USER` | Standard user, permissions determined by org membership |

#### Organization Roles
| Role | Description |
|------|-------------|
| `ORG_OWNER` | Full control over organization, set this to a school admin |
| `ORG_ADMIN` | Administrative access within organization |
| `DEPARTMENT_HEAD` | Manages specific departments |
| `TEACHER` | Creates and manages classes, tests, grades |
| `TEACHING_ASSISTANT` | Assists teachers with limited permissions |
| `STUDENT` | Access to assigned classes and tests |
| `PARENT` | View-only access to student information |

### Route Protection

Every route validates user permissions server-side:

```typescript
// Example authorization check
if (!user || theClass.teacherId !== user.id) {
  throw error(403, 'Not authorized');
}
```

### Data Isolation

- Teachers can only access their own classes, tests, and submissions
- Students can only view their own submissions and assigned content
- Organization data is strictly isolated between organizations and CANNOT be accessed by platform admins making it so you are the one in control.

---

## Data Protection

### Database Security

- **PostgreSQL**: Enterprise-grade database with built-in security features
- **Prisma ORM**: Parameterized queries prevent SQL injection attacks
- **Encrypted Connections**: Database connections use SSL/TLS in production
- **Environment Variables**: Database credentials stored securely, never in code

### Data at Rest

- Sensitive data is stored in a secure PostgreSQL database
- PowerSchool OAuth tokens are encrypted before storage
- User passwords are hashed (never stored in plaintext)

### Data in Transit

- All production traffic is encrypted via HTTPS/TLS
- API communications use secure protocols
- Cookie data is transmitted only over secure connections in production

---

## API Security

### Server-Side Validation

All API endpoints perform comprehensive server-side validation:

- Input sanitization and type checking
- Required field validation
- Business logic validation
- Error messages don't leak sensitive information

### Form Actions Security

SvelteKit form actions provide built-in protections:

- Same-origin enforcement
- Automatic CSRF protection via SvelteKit's form handling
- Server-side processing prevents client-side manipulation

---

## Rate Limiting & DDoS Protection

### AI Request Rate Limiting

CheckMate implements strict rate limiting for AI-powered features:

```typescript
// System-wide AI rate limits
const RATE_LIMIT_WINDOW_MS = 60 * 1000;  // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 15;       // 15 requests per minute
```

### Rate Limiting Features

- **Sliding Window**: Tracks requests within a rolling time window
- **Queue System**: Excess requests are queued rather than rejected
- **Status Reporting**: Users see their rate limit status in real-time
- **Graceful Degradation**: System remains responsive under load

### Protection Against Abuse

- Prevents API abuse and excessive resource consumption
- Protects against automated attacks
- Ensures fair resource allocation across users

---

## Audit Logging

### Comprehensive Activity Tracking

CheckMate maintains detailed audit logs for security and compliance:

```typescript
model AuditLog {
  id             String   @id
  userId         String?
  organizationId String?
  action         String
  entityType     String?
  entityId       String?
  details        Json?
  ipAddress      String?
  userAgent      String?
  createdAt      DateTime
}
```

### Logged Events Include

- User authentication events (login, logout)
- Administrative actions
- Data modifications
- Permission changes
- Security-relevant activities

### Audit Log Access

- Only platform administrators can access audit logs
- Logs are searchable and filterable
- Retention policies ensure compliance with data regulations

---

## PowerSchool Integration Security

### OAuth 2.0 Authentication

The PowerSchool integration uses industry-standard OAuth 2.0 with traffic encrypted both ways:

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│    CheckMate    │────▶│  PowerSchool API     │────▶│   PowerSchool   │
│   (SvelteKit)   │◀────│  Gateway (Flask)     │◀────│    Server       │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
```

### OAuth Security Features

1. **State Parameter**: Prevents CSRF attacks in OAuth flow
2. **Secure Token Storage**: Access/refresh tokens are encrypted
3. **Token Refresh**: Automatic token refresh without re-authentication
4. **Scope Limitations**: Only requested scopes are granted
5. **Redirect URI Validation**: Strict validation of callback URLs



### No Direct PowerSchool Access

- CheckMate **never** has access to PowerSchool admin or teacher credentials
- Teachers authenticate
- Integration uses a secure API gateway layer
- No PowerSchool plugins or admin configuration required

### Token Security

- Tokens are stored HASHED in the database meaning they cannot be decrypted without a set key the teacher sets
- Tokens can be revoked at any time
- Automatic token expiration and refresh
- Teachers can disconnect integration at will

---

## Infrastructure Security

### Container Security (Docker)

- Application runs in isolated Docker containers
- Minimal base images reduce attack surface
- Non-root user execution where possible

### Environment Variables

Sensitive configuration is managed via environment variables:

```
DATABASE_URL          # Database connection string
POWERSCHOOL_API_URL   # API gateway URL
POWERSCHOOL_CLIENT_ID # OAuth client ID
POWERSCHOOL_CLIENT_SECRET # OAuth client secret (encrypted)
```

### Production Deployment

- HTTPS enforced for all traffic
- Secure headers configured
- Regular security updates applied

---

## Security Best Practices

### Code Security

- **No Hardcoded Secrets**: All secrets in environment variables
- **Input Validation**: All user input is validated server-side
- **Output Encoding**: Data is properly encoded to prevent XSS
- **Error Handling**: Errors don't expose sensitive information
- **Dependency Management**: Regular updates to patch vulnerabilities

### Authentication Practices

- **No Password Storage in Plaintext**: Always bcrypt hashed
- **Session Security**: HTTP-only, secure cookies
- **Account Lockout**: Suspended users cannot log in
- **Last Login Tracking**: Helps users identify unauthorized access

### Development Practices

- Code review for security-sensitive changes
- TypeScript for type safety and reduced runtime errors
- Server-side rendering reduces client-side attack surface

---

## Incident Response

In the event of a security incident:

1. **Immediate**: Affected sessions can be invalidated
2. **Investigation**: Audit logs provide detailed activity history
3. **Notification**: Users can be notified of potential breaches
4. **Recovery**: Password resets can be forced if needed

---

## Compliance Considerations

CheckMate is designed with educational data privacy in mind:

- **Data Minimization**: Only necessary data is collected
- **Access Controls**: Strict role-based permissions
- **Audit Trail**: Complete activity logging
- **Data Isolation**: Multi-tenant architecture keeps data separate

---

## Summary

CheckMate implements multiple layers of security:

| Layer | Protection |
|-------|------------|
| **Authentication** | Lucia sessions, bcrypt passwords, secure cookies |
| **Authorization** | Role-based access control, data isolation |
| **Data** | Encrypted transit, secure storage, no plaintext secrets |
| **API** | Rate limiting, input validation, server-side processing |
| **Audit** | Comprehensive logging, admin oversight |
| **Integration** | OAuth 2.0, token encryption, scope limitations |

These measures work together to protect student data, teacher information, and school system integrations while maintaining a smooth user experience.

---

*Last Updated: January 2026*
