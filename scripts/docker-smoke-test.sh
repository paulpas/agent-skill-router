#!/bin/bash

echo "=== Building Docker container for skill-router ==="
docker build -t skill-router-smoke-test:latest agent-skill-routing-system/

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker build successful!"

echo ""
echo "=== Running container in background ==="
CONTAINER_ID=$(docker run -d --rm -p 3000:3000 --name skill-router-smoke-test skill-router-smoke-test:latest)
echo "Container started with ID: $CONTAINER_ID"

# Wait for container to be ready
echo "Waiting for container to be ready..."
sleep 5

echo ""
echo "=== Testing API endpoints ==="

# Test /health endpoint
echo ""
echo "--- Testing /health ---"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
echo "$HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo "✅ /health endpoint OK"
else
    echo "❌ /health endpoint failed"
    docker stop skill-router-smoke-test
    exit 1
fi

# Test /skills endpoint
echo ""
echo "--- Testing /skills ---"
SKILLS_RESPONSE=$(curl -s http://localhost:3000/skills)
echo "Skills count: $(echo "$SKILLS_RESPONSE" | grep -o '"name"' | wc -l)"

if [ $(echo "$SKILLS_RESPONSE" | grep -o '"name"' | wc -l) -gt 0 ]; then
    echo "✅ /skills endpoint OK"
else
    echo "❌ /skills endpoint failed"
    docker stop skill-router-smoke-test
    exit 1
fi

# Test /route endpoint
echo ""
echo "--- Testing /route with test task ---"
ROUTE_RESPONSE=$(curl -s -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{"task": "Implement stop-loss strategies", "context": {}, "constraints": {"maxSkills": 3}}')
echo "$ROUTE_RESPONSE"

if echo "$ROUTE_RESPONSE" | grep -q '"selectedSkills"' && echo "$ROUTE_RESPONSE" | grep -q '"name"'; then
    echo "✅ /route endpoint OK"
else
    echo "❌ /route endpoint failed"
    docker stop skill-router-smoke-test
    exit 1
fi

echo ""
echo "=== All API tests passed! ==="

# Cleanup
echo "Cleaning up container..."
docker stop skill-router-smoke-test
echo "✅ Cleanup complete!"

exit 0
