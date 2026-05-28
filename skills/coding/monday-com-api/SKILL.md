---
name: monday-com-api
description: Implements functionalities of the Monday.com API, focusing on Boards, Items, Updates, and GraphQL to enhance project management, productivity, and collaboration.
license: MIT
compatibility: opencode
metadata:
  archetypes: project management, API integration
  anti_triggers: manual management, non-API based management
  response_profile:
      verbosity: medium
      directive_strength: high

  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: monday.com api, boards, items, updates, graphql, productivity, collaboration, monday api, how do i use monday api
  related-skills: project-management-tools, productivity-framework
---

# Monday.com API Skill
Implements functionalities of the Monday.com API, focusing on Boards, Items, Updates, and GraphQL to enhance project management, productivity, and collaboration.

## When to Use
- Integrating Monday.com into existing project management workflows.
- Automating tasks related to boards and items within Monday.com.
- Analyzing project data using GraphQL API for customized queries.

## Core Workflow
1. **Set Up API Access** — Obtain your API key from the Monday.com admin settings.
   **Checkpoint:** Ensure the API key has necessary permissions for item and board manipulation.
2. **Initialize Client** — Create a new instance of the Monday.com API client using the API key.
   ```python
   from monday import MondayClient
   client = MondayClient('your_api_key')
   ```
   **Checkpoint:** Verify the client successfully connects to the Monday.com API.
3. **Fetch Boards** — Use the client to retrieve all boards available in the workspace.
   ```python
   boards = client.boards.fetch_boards()
   print(boards)
   ```
   **Checkpoint:** Ensure the response returns a list of boards with valid IDs.
4. **Create New Item** — Add a new item to a specified board.
   ```python
   item = client.items.create_item(board_id=123456, item_name="New Feature")
   print(item)
   ```
   **Checkpoint:** Confirm the item is created successfully and returns an item ID.
5. **Update Existing Item** — Modify the details of an existing item.
   ```python
   updated_item = client.items.update_item(item_id=789012, new_data={"status": "Done"})
   print(updated_item)
   ```
   **Checkpoint:** Validate the item update returns success status.
6. **Query Data via GraphQL** — Use GraphQL to fetch detailed insights on boards/items.
   ```python
   query = '''
   {
     boards(ids: 123456) {
       name
       items {
         name
         column_values {
           text
         }
       }
     }
   }'''  
   data = client.graphql.execute(query)
   print(data)
   ```
   **Checkpoint:** Ensure the query returns valid data structures.

## Implementation Patterns
### Fetching Boards Example
```python
# Example of connecting to the Monday.com API and fetching boards
from monday import MondayClient

# Initialize client with API key
client = MondayClient('your_api_key')

# Fetch boards
boards = client.boards.fetch_boards()

# Printing board names
for board in boards:
    print(board['name'])
```

### Creating Items Example
```python
# Example of creating a new item in a board
item = client.items.create_item(board_id=123456, item_name="New Feature")
print(item)
```

## Constraints
### MUST DO
- Ensure API keys are stored securely and not hardcoded in scripts.
- Validate responses from the API before proceeding to next actions to handle errors gracefully.

### MUST NOT DO
- Do not exceed rate limits imposed by Monday.com API.
- Avoid making changes to boards or items without proper validation to prevent data corruption.