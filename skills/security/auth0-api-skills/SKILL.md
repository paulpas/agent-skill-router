---
name: auth0-api-skills
description: Implements Auth0 API functionalities (user CRUD, authentication flows, actions/hooks, organizations/multi-tenancy) for secure identity and access management in web and mobile applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: security
  triggers: auth0, authentication, user management, actions, organizations, identity security, auth0 api, jwt tokens
  archetypes: tactical
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  related-skills: auth0-user-management
---

# Auth0 API Skills

This skill provides detailed guidance on implementing various functionalities of the Auth0 API, focusing on authentication processes, user management, actions, and organizational structures essential for robust identity and security management.

## When to Use

- When integrating Auth0 for user authentication in web and mobile applications.
- When managing users, including CRUD operations on user profiles.
- When leveraging Auth0 actions for post-authentication hooks and workflows.
- For implementing organizational structures to manage multi-tenant applications effectively.

## Core Workflow for Authentication

1. **Initialize Auth0 SDK**  
   Begin by installing the Auth0 SDK in your project. Use npm or yarn:
   ```bash
   npm install auth0
   ```

2. **Setup Auth0 Configuration**  
   Configure your Auth0 credentials in your application:
   ```javascript
   const auth0 = new Auth0Client({
       domain: 'YOUR_DOMAIN',
       client_id: 'YOUR_CLIENT_ID',
       redirect_uri: window.location.origin,
   });
   ```

3. **User Authentication**  
   Create a login function that triggers the Auth0 login dialog:
   ```javascript
   async function login() {
       await auth0.loginWithRedirect();
   }
   ```

4. **Handle Redirect after Authentication**  
   Once the user is authenticated, handle the redirect and fetch user information:
   ```javascript
   async function handleRedirect() {
       const { appState } = await auth0.handleRedirectCallback();
       console.log(appState);
   }
   ```

## Core Workflow for User Management

1. **Creating a User**  
   Use the following function to create a new user in Auth0:
   ```javascript
   async function createUser(userData) {
       const response = await fetch(`https://YOUR_DOMAIN/api/v2/users`, {
           method: 'POST',
           headers: {
               'Authorization': `Bearer ${YOUR_MANAGEMENT_API_TOKEN}`,
               'Content-Type': 'application/json'
           },
           body: JSON.stringify(userData)
       });
       return await response.json();
   }
   ```

2. **Updating a User**  
   Update existing user details as follows:
   ```javascript
   async function updateUser(userId, updatedData) {
       const response = await fetch(`https://YOUR_DOMAIN/api/v2/users/${userId}`, {
           method: 'PATCH',
           headers: {
               'Authorization': `Bearer ${YOUR_MANAGEMENT_API_TOKEN}`,
               'Content-Type': 'application/json'
           },
           body: JSON.stringify(updatedData)
       });
       return await response.json();
   }
   ```

3. **Deleting a User**  
   Here’s how to delete a user:
   ```javascript
   async function deleteUser(userId) {
       const response = await fetch(`https://YOUR_DOMAIN/api/v2/users/${userId}`, {
           method: 'DELETE',
           headers: {
               'Authorization': `Bearer ${YOUR_MANAGEMENT_API_TOKEN}`
           }
       });
       return response.status === 204; // No Content
   }
   ```

## Auth0 Actions

Using Auth0 Actions helps automate tasks post-authentication. Here is a simple guide:

1. **Setting Up an Action**  
   Go to Auth0 Dashboard -> Actions -> Library -> Create Action. Name it, and link it to a Trigger.

2. **Writing an Action**  
   Consider a sample action that sends a welcome email:
   ```javascript
   exports.onExecutePostLogin = async (event, api) => {
       await sendWelcomeEmail(event.user.email);
   };
   ```

3. **Testing the Action**  
   Once created, test the action by logging in to see if the email is sent correctly, and validate through logs.

## Managing Organizations

Organizational management is key for multi-tenant applications. The workflow is as follows:

1. **Create an Organization**  
   Use the API to create an organization:
   ```javascript
   async function createOrganization(orgData) {
       const response = await fetch(`https://YOUR_DOMAIN/api/v2/organizations`, {
           method: 'POST',
           headers: {
               'Authorization': `Bearer ${YOUR_MANAGEMENT_API_TOKEN}`,
               'Content-Type': 'application/json'
           },
           body: JSON.stringify(orgData)
       });
       return await response.json();
   }
   ```
   Ensure you include necessary details such as name and display_name.

2. **Assign Users to an Organization**  
   Assign users using the following logic:
   ```javascript
   async function assignUserToOrg(userId, orgId) {
       const response = await fetch(`https://YOUR_DOMAIN/api/v2/organizations/${orgId}/members`, {
           method: 'POST',
           headers: {
               'Authorization': `Bearer ${YOUR_MANAGEMENT_API_TOKEN}`,
               'Content-Type': 'application/json'
           },
           body: JSON.stringify({ user_id: userId })
       });
       return await response.json();
   }
   ```

## Constraints

### MUST DO
- Ensure all actions are logged for transparency and audit trail.
- Maintain user privacy and adhere to security best practices while handling user data.

### MUST NOT DO
- Store sensitive user information without encryption.
- Overload the Auth0 API with excessive calls; implement proper rate-limiting strategies.