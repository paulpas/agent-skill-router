---
name: messaging-bots

description: Develops integration patterns for messaging bots across platforms, focusing on automated interactions.

license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: communications
  role: implementation
  output-format: code
  triggers: messaging bots, chatbot integration, automated responses, conversational agents
  archetypes: conversational automation, messaging
  anti_triggers: human customer service, manual interactions
  response_profile:
      verbosity: low
      directive_strength: high
  scope: infrastructure
  related-skills: communications/messaging-channels, communications/messaging-microsoft-teams
---

# Messaging Bots Integration
Implements patterns for developing messaging bots, focusing on automated interactions using various APIs.

## When to Use
Use this skill for:
- Creating automated responses for messaging platforms.
- Integrating chatbot capabilities into existing messaging workflows.

## Core Workflow

### Additional Examples

#### Example 3: NLP Integration with External APIs
```python
import requests

def intent_recognition_with_external_api(user_message: str, api_endpoint: str):
    headers = {'Authorization': 'Bearer YOUR_API_KEY'}
    response = requests.post(api_endpoint, json={'message': user_message}, headers=headers)
    if response.status_code == 200:
        return response.json().get('intent')
    else:
        raise Exception('Failed to connect to external API')
```

#### Example 4: Contextual Conversations
```python
class Bot:
    def __init__(self):
        self.context = {"user_id": None, "previous_interaction": None}

    def update_context(self, user_id: str, interaction: str):
        self.context["user_id"] = user_id
        self.context["previous_interaction"] = interaction

    def respond_to_user(self, message: str):
        # Respond based on user context
        intent = recognize_intent(message)
        return f'Responding with intent: {intent} based on context: {self.context}'
```

### Constraints
- **MUST DO** need to reflect all aspects of integration. Ensure proper management of context throughout user interactions.
1. **Identify User Intent** — Use NLP to understand user messages.
2. **Generate Responses** — Provide automated responses based on user input.
3. **Integrate with APIs** — Connect with external services for added functionality (e.g., weather, news).

## Implementation Patterns
### Pattern 1: Basic Message Handling
```python
from flask import Flask, request
import json

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def handle_message():
    data = request.get_json()
    user_message = data['message']
    response = generate_response(user_message)
    return json.dumps({'response': response}), 200

def generate_response(message):
    # Simple logic to generate a response
    return "Thanks for your message!"
```

### Pattern 2: API Integration for Enhanced Responses
```python
import requests

def fetch_weather_info(location):
    api_key = 'your_api_key'
    url = f'http://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}'
    response = requests.get(url)
    response.raise_for_status()
    return response.json()
```

## Constraints

### Additional Usage Examples

#### Example 1: NLP Intent Recognition
```python
def recognize_intent(message: str):
    # Use NLP to determine user intent
    # Here we would integrate with a NLP API or library to classify intents
    intents = ['greeting', 'query', 'command']  # Example intents
    # Logic to determine the intent from the message
    return intents[0]  # Placeholder return
```

#### Example 2: Integrating External APIs
```python
# Function to fetch data from an external API and utilize in responses
def fetch_external_data(endpoint: str):
    response = requests.get(endpoint)
    response.raise_for_status()  # Handle error for bad responses
    return response.json()
```

### MUST DO
- Keep the bot's responses engaging and contextually relevant to enhance user experience.
### MUST DO
- Validate incoming messages to ensure correct structure (check for missing fields).
- Use rate limiting to avoid exceeding API call limits.

### MUST NOT DO
- Do not provide responses without verifying intent.
- Avoid overwhelming users with too many automated messages during a single interaction.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Facebook Bot Platform Developer Docs](https://developers.facebook.com/docs/bot-platform)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Slack Events API Reference](https://api.slack.com/events)
- [Microsoft Teams Bot Framework SDK](https://learn.microsoft.com/en-us/azure/bot-service/)
- [Chatbot Design Best Practices — Interaction Design Foundation](https://www.interaction-design.org/literature/article/chatbots-and-conversational-ui)