---




name: auth-patterns
description: Implements authentication patterns using OAuth2, OIDC, JWT, and SAML protocols for secure user management, including token handling, verification, and refresh flows.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: security
  triggers: OAuth2, OIDC, JWT, SAML, authentication, token verification, access tokens, passwordless auth
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont]
  archetypes: [tactical, generation]
  anti_triggers: [basic auth, password authentication, hardcoded credentials]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational




---





# Authentication Patterns

Implements secure authentication strategies using OAuth2, OIDC, JWT, and SAML protocols. Handles token issuance, verification, refresh flows, and access control for modern applications.

## TL;DR Checklist

- [ ] Use HTTPS for all authentication communications
- [ ] Validate tokens with proper algorithms and key rotation
- [ ] Implement refresh token rotation for OAuth2/OIDC flows
- [ ] Verify JWT signatures using the correct algorithm (RS256/ES256 over HS256)
- [ ] Store secrets in Vault or environment variables — never in code

---

## When to Use

Use this skill when:

- Implementing OAuth2 authorization code flow for third-party app integrations
- Setting up OpenID Connect (OIDC) for user identity verification and SSO
- Validating JWT tokens for stateless API authentication
- Integrating SAML-based enterprise single sign-on (SSO) with IdP providers
- Implementing token refresh flows to maintain authenticated sessions without re-login

---

## When NOT to Use

- For simple application-level session management (use standard session cookies instead)
- When integrating with legacy systems that only support basic auth (add a translation layer)
- For internal microservice-to-microservice communication (use mTLS or short-lived service tokens)

---

## Core Workflow

1. **Select Authentication Protocol** — Choose OAuth2/OIDC for third-party identity, SAML for enterprise SSO, or JWT for stateless API auth.
   **Checkpoint:** Match protocol to the identity provider and use case requirements.

2. **Configure Client Credentials** — Set up client ID, client secret (or public key for OIDC), redirect URIs, and scope permissions.
   **Checkpoint:** Store credentials in a secrets manager — never commit to version control.

3. **Implement Token Flow** — Code the authorization flow: redirect → callback → token exchange → user session.
   **Checkpoint:** Verify state parameter prevents CSRF attacks during OAuth2/OIDC flows.

4. **Validate and Decode Tokens** — Implement JWT verification with proper algorithm validation, expiry checks, and audience/issuer validation.
   **Checkpoint:** Never trust the `alg` header from the token — explicitly specify expected algorithms.

5. **Implement Refresh Token Rotation** — On each refresh, issue a new refresh token and invalidate the old one to prevent replay attacks.
   **Checkpoint:** Handle refresh token theft by revoking the entire token family when suspicious activity is detected.

6. **Test for Security Vulnerabilities** — Conduct penetration tests against token handling, validate against OWASP authentication guidelines.
   **Checkpoint:** Verify that expired, malformed, and tampered tokens are all rejected consistently.

---

## Implementation Patterns

### Pattern 1: OAuth2 Authorization Code Flow

```python
import requests
from urllib.parse import urlencode

def get_access_token(
    client_id: str,
    client_secret: str,
    code: str,
    redirect_uri: str,
    token_endpoint: str = "https://authorization-server.com/token"
) -> dict:
    """Exchange an authorization code for an access token using OAuth2.

    Args:
        client_id: Application's registered client ID
        client_secret: Application's registered client secret
        code: Authorization code from the callback
        redirect_uri: Must match the one used in the authorize request

    Returns:
        Token response dict containing access_token, refresh_token, expires_in, token_type

    Raises:
        requests.HTTPError: If the token exchange fails
    """
    params = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
    }

    response = requests.post(token_endpoint, data=params)
    response.raise_for_status()
    return response.json()


def get_user_info(
    access_token: str,
    userinfo_endpoint: str = "https://authorization-server.com/userinfo"
) -> dict:
    """Fetch user profile information using the access token.

    Args:
        access_token: Valid OAuth2 access token
        userinfo_endpoint: OIDC userinfo endpoint URL

    Returns:
        User profile data (sub, email, name, etc.)
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(userinfo_endpoint, headers=headers)
    response.raise_for_status()
    return response.json()
```

### Pattern 2: JWT Token Verification

```python
import jwt
from datetime import datetime, timezone


def verify_jwt(
    token: str,
    public_key: str | bytes,
    algorithms: list[str] = ["RS256"],
    audience: str | None = None,
    issuer: str | None = None,
) -> dict:
    """Verify and decode a JWT token with strict algorithm validation.

    Uses RS256 by default — never trust the 'alg' header from the token itself.

    Args:
        token: The JWT string to verify
        public_key: RSA public key for signature verification
        algorithms: List of acceptable signing algorithms (whitelist)
        audience: Expected 'aud' claim value (optional)
        issuer: Expected 'iss' claim value (optional)

    Returns:
        Decoded payload as a dict

    Raises:
        jwt.InvalidTokenError: If the token is invalid, expired, or has mismatched claims
    """
    payload = jwt.decode(
        token,
        public_key,
        algorithms=algorithms,       # Explicit — don't accept any algorithm
        audience=audience,           # Verify audience claim
        issuer=issuer,               # Verify issuer claim
        options={
            "require": ["exp", "iss", "aud"],  # Require these claims
            "verify_exp": True,                   # Reject expired tokens
        },
    )
    return payload


def decode_unverified(token: str) -> dict:
    """Decode JWT header and payload without verification (for inspection only).

    NEVER use this to authorize access. Only for debugging or extracting algorithm info.
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise jwt.DecodeError("Malformed JWT: expected 3 parts")

    import base64, json

    header = json.loads(base64.urlsafe_b64decode(parts[0] + "=="))
    payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=="))
    return {"header": header, "payload": payload}
```

### Pattern 3: Refresh Token Rotation (OAuth2)

```python
def refresh_access_token(
    client_id: str,
    client_secret: str,
    refresh_token: str,
    token_endpoint: str = "https://authorization-server.com/token",
    previous_refresh_token: str | None = None,
) -> dict:
    """Exchange a refresh token for a new access token with rotation.

    Implements refresh token rotation: issues a new refresh token and invalidates
    the old one to prevent replay attacks from stolen tokens.

    Args:
        client_id: Application's registered client ID
        client_secret: Application's registered client secret
        refresh_token: Current valid refresh token
        token_endpoint: OAuth2 token endpoint URL
        previous_refresh_token: If set, includes the prior refresh token in the
            'old_refresh_token' field for rotation enforcement

    Returns:
        New access_token, refresh_token pair with expiration info.
        If rotation is enforced, the old refresh token will be invalidated.

    Raises:
        requests.HTTPError: If the token refresh fails (e.g., revoked token)
    """
    params = {
        "grant_type": "refresh_token",
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
    }

    # Include previous refresh token for rotation enforcement
    if previous_refresh_token:
        params["old_refresh_token"] = previous_refresh_token

    response = requests.post(token_endpoint, data=params)
    response.raise_for_status()
    return response.json()
```

### Pattern 4: SAML Assertion (IdP Response Structure)

```xml
<!-- Example SAML Assertion from an Identity Provider -->
<!-- Use this as reference for parsing IdP responses in your SAML integration -->

<saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    Version="2.0"
    IssueInstant="2025-06-15T10:30:00Z">

    <saml2:Issuer>https://idp.example.com</saml2:Issuer>

    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <!-- Signature ensures assertion integrity -->
        <!-- Always verify the IdP's X.509 certificate signature -->
        <ds:SignedInfo>...</ds:SignedInfo>
        <ds:SignatureValue>...</ds:SignatureValue>
    </ds:Signature>

    <saml2:Subject>
        <saml2:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
            SPNameQualifier="https://sp.example.com">
            user@example.com
        </saml2:NameID>
        <saml2:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
            <saml2:SubjectConfirmationData
                NotOnOrAfter="2025-06-15T10:35:00Z"
                Recipient="https://sp.example.com/sso/acs"/>
        </saml2:SubjectConfirmation>
    </saml2:Subject>

    <saml2:Conditions NotBefore="2025-06-15T10:29:00Z"
        NotOnOrAfter="2025-06-15T11:30:00Z">
        <saml2:AudienceRestriction>
            <saml2:Audience>https://sp.example.com</saml2:Audience>
        </saml2:AudienceRestriction>
    </saml2:Conditions>

    <saml2:AttributeStatement>
        <saml2:Attribute Name="email">
            <saml2:AttributeValue xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:type="xs:string">user@example.com</saml2:AttributeValue>
        </saml2:Attribute>
        <saml2:Attribute Name="role">
            <saml2:AttributeValue xsi:type="xs:string">admin</saml2:AttributeValue>
        </saml2:Attribute>
    </saml2:AttributeStatement>
</saml2:Assertion>
```

---

## Constraints

### MUST DO
- Use HTTPS for all authentication communications — never send tokens over HTTP
- Validate JWT signatures explicitly with a whitelist of algorithms (RS256, ES256)
- Implement refresh token rotation to prevent replay attacks on stolen tokens
- Store client secrets and API keys in a secrets manager (Vault, AWS Secrets Manager)
- Conduct periodic security audits of authentication mechanisms and dependency versions
- Log all successful and failed authentication attempts for audit trails
- Verify audience (`aud`) and issuer (`iss`) claims on every JWT verification

### MUST NOT DO
- Use `HS256` for JWT signing in multi-tenant or distributed systems — use asymmetric algorithms (RS256, ES256)
- Hardcode secrets, API keys, or private keys directly in source code
- Accept tokens with `alg: none` — this is a known JWT vulnerability
- Skip expiration checks on JWT tokens — always verify the `exp` claim
- Reuse refresh tokens without rotation — each use should invalidate the prior token
- Trust SAML assertions without verifying the IdP's X.509 certificate signature

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT Specification (RFC 7519)](https://datatracker.ietf.org/doc/html/rfc7519)
- [SAML 2.0 Specification](https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
