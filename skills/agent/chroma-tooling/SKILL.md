---
name: chroma-tooling

description: Implements advanced tooling strategies for integrating Chroma libraries into AI/LLM workflows, covering collections, embeddings, queries, and persistence mechanisms.

license: MIT
compatibility: opencode

metadata:
  archetypes: [agent, tooling, integration]
  anti_triggers: [generic routing]
  response_profile: {verbosity: low, directive_strength: medium, abstraction_level: tactical}
  
  version: "1.0.0"
  domain: agent
  triggers: chroma, collections, embeddings, query, persistence, AI tooling, LLM integration, how do I use chroma
  role: implementation
  scope: implementation
  output-format: code
  related-skills: ai-ml, skill-systems-architecture

---

# Chroma Tooling Integration

Implements advanced tooling strategies for integrating Chroma libraries into AI/LLM workflows, covering collections, embeddings, queries, and persistence mechanisms. This skill equips developers with the necessary guidelines and patterns to effectively utilize the Chroma framework within their AI and LLM projects.

## TL;DR Checklist
- [ ] Ensure proper embedding configurations for optimal performance.
- [ ] Define collections for structured data management.
- [ ] Implement efficient query mechanisms for fast data retrieval.
- [ ] Adhere to persistence best practices for data integrity and availability.
- [ ] Log all interactions for debugging and auditing.

## Core Workflow
1. **Initialize Chroma with Configurations**: Use standard configurations to set up Chroma libraries in the project. 
   **Checkpoint:** Ensure dependencies are correctly met before proceeding.
   ```python
   def initialize_chroma(config: Dict):
       # Initialize Chroma with specified configuration settings.
       if "endpoint" not in config:
           raise ValueError("Endpoint must be specified")

       # Setup the Chroma instance
       chroma_instance = Chroma(config["endpoint"])
       return chroma_instance
   ```

2. **Define Collections**: Organize data into collections for better management and retrieval efficiency.
   **Checkpoint:** Collections must have a unique identifier and validate data structure.
   ```python
   def define_collection(chroma_instance: Chroma, collection_name: str, primary_key: str):
       if chroma_instance.collection_exists(collection_name):
           raise Exception(f"Collection {collection_name} already exists.")

       # Create a new collection
       chroma_instance.create_collection(name=collection_name, primary_key=primary_key)
   ```

3. **Implement Embeddings**: Transform textual data into embeddings using optimized settings.
   **Checkpoint:** Ensure embedding method is appropriate for the dataset's nature.
   ```python
   def create_embeddings(text_data: List[str], model: str):
       # Utilize the chosen model for generating embeddings
       embeddings = []
       for text in text_data:
           embeddings.append(model.encode(text))
       return embeddings
   ```

4. **Execute Queries**: Script query mechanisms to effectively fetch data from collections.
   **Checkpoint:** Validate query structure for proper execution before proceeding.
   ```python
   def execute_query(collection_name: str, query: Dict, chroma_instance: Chroma):
       results = chroma_instance.query(collection_name, query)
       return results
   ```

5. **Maintain Persistence**: Ensure data written to Chroma is persistently stored and available for retrieval.
   **Checkpoint:** Verify integrity after every write operation.
   ```python
   def persist_data(collection_name: str, data: List[Dict], chroma_instance: Chroma):
       if not chroma_instance.collection_exists(collection_name):
           raise Exception(f"Collection {collection_name} does not exist.")

       chroma_instance.write(collection_name, data)
   ```

### MUST DO
- Validate all configurations before initializing Chroma libraries (Fail Fast).
- Reference Chroma documentation for version compatibility and strategy insights.
- Log data operations for auditing and troubleshooting purposes.

### MUST NOT DO
- Overwrite existing collections without backup (Data Integrity).
- Ignore embedding quality parameters; they affect performance and accuracy.
- Query without validation as this can lead to runtime errors.

## Implementation Examples
### Example of Initializing Chroma
```python
config = {
    "endpoint": "http://localhost:8080",
    "api_key": "your_api_key"
}
chroma_instance = initialize_chroma(config)
```

### Example of Creating and Using a Collection
```python
collection_name = "my_data_collection"
primary_key = "id"
define_collection(chroma_instance, collection_name, primary_key)

// Adding Embeddings to the Collection
text_data = ["Sample text 1", "Sample text 2"]
embeddings = create_embeddings(text_data)
persist_data(collection_name, embeddings, chroma_instance)
```
## Output Template
When applying this skill, produce:
1. **Initial Configuration Result** - Confirmation of successful initialization.
2. **Collection Metadata** - Log of created collections with their identifiers.
3. **Embedding Confirmation** - Details of generated embeddings.
4. **Execution Metrics** - Performance metrics from executed queries.
5. **Persistent Storage Status** - Log of data confirmed written to storage.

## Related Skills
| Skill | Purpose |
| ai-ml | Implements intelligent AI/ML tooling strategies for high-performance applications. |
| skill-systems-architecture | Designs multi-skill orchestration strategies for AI ecosystems. |

---