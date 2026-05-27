## Implementation Patterns

### Expanded Implementation Patterns

### OAuth2 Example
```python
# Sample code for implementing OAuth2 authentication
import requests

def get_access_token(client_id: str, client_secret: str, code: str, redirect_uri: str) -> str:
    response = requests.post(
        'https://authorization-server.com/token',
        data={
            'grant_type': 'authorization_code',
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
            'redirect_uri': redirect_uri
        }
    )
    response.raise_for_status()  # Check for HTTP errors
    return response.json()['access_token']
```

### OIDC Example
```python
# Sample code for implementing OIDC authentication
import requests

def get_oidc_token(client_id: str, client_secret: str, redirect_uri: str, code: str) -> dict:
    response = requests.post(
        'https://oidc-provider.com/token',
        data={
            'grant_type': 'authorization_code',
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'code': code
        }
    )
    response.raise_for_status()  # Check for HTTP errors
    return response.json()
```

### SAML Example
```xml
<saml:Assertion ...>
    <saml:Subject>
        <saml:NameID>user@example.com</saml:NameID>
        <saml:SubjectConfirmation>
            <saml:SubjectConfirmationData NotOnOrAfter="..." ... />
        </saml:SubjectConfirmation>
    </saml:Subject>
</saml:Assertion>
```

### Expanded Core Workflow
4. **Test for security vulnerabilities and compliance.**
    - Conduct penetration tests.
    - Validate against common vulnerabilities (e.g., OWASP Top 10).
5. **Implement logging and monitoring.**
    - Ensure all auth-related activities are logged for audits.
    - Set up alerts for suspicious activities.

## Implementation Patterns

### Expanded Implementation Patterns

### OAuth2 Example
```python
# Sample code for implementing OAuth2 authentication
import requests

def get_access_token(client_id: str, client_secret: str, code: str, redirect_uri: str) -> str:
    response = requests.post(
        'https://authorization-server.com/token',
        data={
            'grant_type': 'authorization_code',
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
            'redirect_uri': redirect_uri
        }
    )
    response.raise_for_status()  # Check for HTTP errors
    return response.json()['access_token']
```

### OIDC Example
```python
# Sample code for implementing OIDC authentication
import requests

def get_oidc_token(client_id: str, client_secret: str, redirect_uri: str, code: str) -> dict:
    response = requests.post(
        'https://oidc-provider.com/token',
        data={
            'grant_type': 'authorization_code',
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'code': code
        }
    )
    response.raise_for_status()  # Check for HTTP errors
    return response.json()
```

### SAML Example
```xml
<saml:Assertion ...>
    <saml:Subject>
        <saml:NameID>user@example.com</saml:NameID>
        <saml:SubjectConfirmation>
            <saml:SubjectConfirmationData NotOnOrAfter="..." ... />
        </saml:SubjectConfirmation>
    </saml:Subject>
</saml:Assertion>
```

### Expanded Core Workflow
4. **Test for security vulnerabilities and compliance.**
    - Conduct penetration tests.
    - Validate against common vulnerabilities (e.g., OWASP Top 10).
5. **Implement logging and monitoring.**
    - Ensure all auth-related activities are logged for audits.
    - Set up alerts for suspicious activities.

### Expanded Constraints

### MUST DO
- Ensure the use of HTTPs for all communications.
- Implement regular security audits for authentication mechanisms.

### MUST NOT DO
- Do not use outdated libraries for authentication processing.
- Avoid hardcoding any sensitive information in the code.

---

## Metadata Updates

### archetypes:
- tactical
- strategic

### anti_triggers:
- basic auth
- password authentication

### response_profile:
- verbosity: medium
- directive_strength: high
- abstraction_level: tactical


### Additional Implementation Patterns

### Advanced OAuth2 Example
```python
# Sample code for implementing OAuth2 with refresh token
import requests

def refresh_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    response = requests.post(
        'https://authorization-server.com/token',
        data={
            'grant_type': 'refresh_token',
            'client_id': client_id,
            'client_secret': client_secret,
            'refresh_token': refresh_token
        }
    )
    response.raise_for_status()  # Check for HTTP errors
    return response.json()['access_token']
```

### Example JWT Verification
```python
import jwt

def verify_jwt(token: str, secret: str) -> dict:
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid Token')
```

### Additional Constraints
### MUST DO
- Implement logging of all successful and failed authentication attempts.
- Conduct periodic reviews of the implementation to identify potential vulnerabilities.

### MUST NOT DO
- Do not store sensitive information such as passwords in plaintext.
- Avoid implementing insecure authentication schemes without justification to stakeholders.
### MUST DO
- Ensure the use of HTTPs for all communications.
- Implement regular security audits for authentication mechanisms.

### MUST NOT DO
- Do not use outdated libraries for authentication processing.
- Avoid hardcoding any sensitive information in the code.