---
name: salesforce-api-bulk
description: Handles bulk API operations using Salesforce API, including large data transfers efficiently while ensuring robust compliance and error handling throughout data transfers.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: salesforce api, bulk api, data migration, large data, salesforce bulk operations, how do I transfer data with salesforce
  role: implementation
  scope: implementation
  output-format: code
  related-skills: salesforce-api-rest, salesforce-api-soap
  archetypes:
  - tactical
  - operational
  anti_triggers:
  - generic skill dominance
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: tactical
---

# Salesforce API - Bulk Integration

### Pattern 1: Creating Bulk API Job
```python
import requests

def create_bulk_job(instance_url, access_token, job_type, object_type):
    url = f"{instance_url}/services/async/vXX.0/job/{object_type}/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    data = {
        "operation": job_type,
        "object": object_type,
        "contentType": "CSV"
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()  # Raise error for bad requests
    return response.json()  # Return job creation response
```

### Pattern 2: Validating Job Results
```python
import requests

def validate_job_results(instance_url, access_token, job_id):
    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()  # Raise error for bad requests
    return response.json()  # Return job status data
```

### Pattern 3: Closing a Bulk Job
```python
import requests

def close_bulk_job(instance_url, access_token, job_id):
    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    data = {"state": "Closed"}
    response = requests.patch(url, headers=headers, json=data)
    response.raise_for_status()  # Raise error for bad requests
    return response.json()  # Return job closure response
```

### Pattern 4: Retrieving Batch Results
```python
import requests

def retrieve_batch_results(instance_url, access_token, job_id, batch_id):
    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/batch/{batch_id}/result"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()  # Raise error for bad requests
    return response.json()  # Return batch results data
```

### Pattern 3: Closing a Bulk Job\n```python\nimport requests\n\ndef close_bulk_job(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}\n    data = {"state": "Closed"}\n    response = requests.patch(url, headers=headers, json=data)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job closure response\n```\n\n### Pattern 4: Retrieving Batch Results\n```python\nimport requests\n\ndef retrieve_batch_results(instance_url, access_token, job_id, batch_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/batch/{batch_id}/result"\n    headers = {"Authorization": f"Bearer {access_token}"}\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return batch results data\n```

Implements the Bulk API for efficient data operations with large datasets in Salesforce, ensuring robust compliance and error handling throughout data transfers, optimizing system performance and integration. 

## When to Use
- When performing data loads that exceed 10,000 records.  
- During scheduled off-peak hours to avoid hitting Salesforce limits, ensuring reliability in operation.  
- For migrating large legacy data into Salesforce while ensuring compliance with data integrity standards.  
- When needing to quickly process numerous records with minimal API calls for optimal throughput and performance.  

## Core Workflow
1. **Bulk API Configuration** — Set up API credentials and endpoint for interacting with the Bulk API. Ensure all parameters are correctly defined.  
   **Checkpoint:** Ensure your user profile has Bulk API permissions.  
2. **Create a Job** — Define the job with specific operations (insert, update, delete) and fetch the job status.  
   **Checkpoint:** Verify job ID and status after creation to ensure it is active.  
3. **Upload Data** — Use properly formatted CSV files to upload data in batches to Salesforce. Validate the format prior to sending.  
   **Checkpoint:** Check responses for errors in data uploads and handle any issues properly.  

## Implementation Patterns\n### Pattern 1: Creating Bulk API Job\n```python\nimport requests\n\ndef create_bulk_job(instance_url, access_token, job_type, object_type):\n    url = f"{instance_url}/services/async/vXX.0/job/{object_type}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}",\n        "Content-Type": "application/json"\n    }\n    data = {\n        "operation": job_type,\n        "object": object_type,\n        "contentType": "CSV"\n    }\n    response = requests.post(url, headers=headers, json=data)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job creation response\n```\n\n### Pattern 2: Validating Job Results\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"\n    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n\n### Pattern 2: Job Results Validation\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"\n    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n\n### Pattern 2: Checking Job Status\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"
    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n\n### Pattern 2: Job Results Validation\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"
    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n\n### Pattern 2: Checking Job Status\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"
    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n\n### Pattern 2: Completing Job Status Validation\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"
    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n\n### Pattern 2: Job Results Validation\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"
    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n\n### Pattern 2: Job Results Validation\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"\n    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n### Pattern 2: Job Results Validation\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"\n    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n\n### Pattern 2: Completing Job Status Checks\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"
    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n\n### Pattern 2: Completing Job Status Checks\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"
    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n\n### Pattern 2: Job Results Validation\n```python\ndef check_bulk_job_status(instance_url, access_token, job_id):\n    url = f"{instance_url}/services/async/vXX.0/job/{job_id}/"\n    headers = {\n        "Authorization": f"Bearer {access_token}"
    }\n    response = requests.get(url, headers=headers)\n    response.raise_for_status()  # Raise error for bad requests\n    return response.json()  # Return job status data\n```\n\n
## Constraints
### MUST DO
- Use asynchronous processing for bulk operations to avoid timeouts, ensuring reliability during high-load operations.
- Validate CSV payloads before sending to avoid rejects and handle errors gracefully, ensuring data integrity.

### MUST NOT DO
- Submit too many concurrent jobs which can overwhelm the Salesforce limits and degrade performance.
- Exceed the maximum CSV size limit of 10MB for each payload without splitting data appropriately to maintain the efficiency of operations.  
