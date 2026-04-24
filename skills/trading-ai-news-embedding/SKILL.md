---
name: trading-ai-news-embedding
description: Process news text using NLP embeddings for trading signals
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai news embedding, ai-news-embedding, embeddings, process, trading
  related-skills: trading-ai-anomaly-detection, trading-ai-explainable-ai, trading-technical-cycle-analysis
    trading-technical-false-signal-filtering
---

**Role:** Extract meaningful representations from news text to create predictive trading features

**Philosophy:** News embeddings capture semantic meaning and temporal trends. Prioritize real-time processing, domain-specific fine-tuning, and integration with market state.

## Key Principles

1. **Domain-Specific Embeddings**: Use financial domain adaptation for better relevance
2. **Temporal Dynamics**: Track embedding drift and news velocity
3. **Entity Extraction**: Extract key entities (companies, assets, people)
4. **Event Classification**: Classify news types (earnings, M&A, regulatory)
5. **Latency Optimization**: Prioritize speed for real-time trading applications

## Implementation Guidelines

### Structure
- Core logic: `news/embeddings.py` - Embedding extraction
- Classifier: `news/classifier.py` - News type classification
- Stream processor: `news/stream.py` - Real-time processing
- Config: `config/news_config.yaml` - NLP parameters

### Patterns to Follow
- Use pre-trained financial embeddings (FinBERT, FinRoBERTa)
- Implement incremental updates for streaming data
- Cache embeddings for common phrases
- Normalize by news volume and sentiment

## Adherence Checklist
Before completing your task, verify:
- [ ] Domain-specific embeddings used or fine-tuned
- [ ] Entity extraction for asset mapping
- [ ] News event classification implemented
- [ ] Real-time processing latency acceptable
- [ ] Embeddings temporally aligned with trading decisions



## Code Examples

### Financial News Embedding Extractor

```python
import numpy as np
from transformers import AutoTokenizer, AutoModel
import torch
from typing import List, Dict, Tuple
import time

class FinancialNewsEmbedder:
    """Extract embeddings from financial news using domain-specific models."""
    
    def __init__(self, model_name: str = 'yiyanghkust/finbert-tone',
                max_length: int = 512, device: str = None):
        self.max_length = max_length
        
        # Use GPU if available
        if device is None:
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        else:
            self.device = device
        
        # Load pre-trained financial BERT
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name).to(self.device)
        self.model.eval()
    
    def extract_embeddings(self, texts: List[str]) -> np.ndarray:
        """Extract embeddings for a batch of texts."""
        if not texts:
            return np.array([])
        
        # Tokenize
        encoded = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=self.max_length,
            return_tensors='pt'
        ).to(self.device)
        
        # Extract embeddings
        with torch.no_grad():
            outputs = self.model(**encoded)
            embeddings = outputs.last_hidden_state[:, 0, :]  # [CLS] token
        
        return embeddings.cpu().numpy()
    
    def extract_with_metadata(self, texts: List[str],
                             timestamps: List[int] = None) -> List[Dict]:
        """Extract embeddings with metadata."""
        embeddings = self.extract_embeddings(texts)
        
        results = []
        for i, (embedding, text) in enumerate(zip(embeddings, texts)):
            results.append({
                'embedding': embedding,
                'text': text,
                'timestamp': timestamps[i] if timestamps else None,
                'embedding_time': time.time()
            })
        
        return results
```

### News Event Classifier

```python
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from typing import List, Dict

class NewsEventClassifier:
    """Classify news events into trading-relevant categories."""
    
    def __init__(self):
        self.categories = {
            'earnings': ['earnings', 'profit', 'revenue', 'guidance', ' EPS', 'net income'],
            'mergers_acquisitions': ['acquire', 'merger', 'acquisition', 'buy', 'sell'],
            'regulatory': ['regulatory', 'fda', 'sec', 'compliance', 'investigation'],
            'product_launch': ['launch', 'release', 'unveil', 'new product', ' debut'],
            'partnership': ['partnership', 'collaboration', 'agreement', 'deal'],
            'management': ['ceo', 'executive', 'hire', 'resign', 'appointment'],
            'market_mover': ['surge', 'plunge', 'dive', 'soar', 'rally'],
            'negative': ['loss', 'decline', 'fall', 'downgrade', 'warning'],
            'positive': ['upgrade', 'strong', 'gain', 'outperform', 'positive']
        }
        
        self.classifier = None
        self.is_trained = False
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keyword matches from text."""
        text_lower = text.lower()
        found_keywords = []
        
        for category, keywords in self.categories.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    found_keywords.append(category)
                    break
        
        return found_keywords
    
    def classify(self, texts: List[str]) -> List[Dict]:
        """Classify news into categories."""
        if not self.is_trained:
            # Use keyword-based classification if not trained
            return self._keyword_classify(texts)
        
        predictions = self.classifier.predict(texts)
        probabilities = self.classifier.predict_proba(texts)
        
        results = []
        for text, pred, probs in zip(texts, predictions, probabilities):
            results.append({
                'text': text,
                'category': pred,
                'confidence': float(np.max(probs)),
                'all_categories': dict(zip(self.classifier.classes_, probs))
            })
        
        return results
    
    def _keyword_classify(self, texts: List[str]) -> List[Dict]:
        """Keyword-based classification fallback."""
        results = []
        
        for text in texts:
            found = self._extract_keywords(text)
            
            if not found:
                category = 'general'
                confidence = 0.3
            elif len(found) == 1:
                category = found[0]
                confidence = 0.8
            else:
                category = found[0]
                confidence = 0.6
            
            results.append({
                'text': text,
                'category': category,
                'confidence': confidence,
                'matched_keywords': found
            })
        
        return results
    
    def fit(self, texts: List[str], labels: List[str]):
        """Train classifier on labeled data."""
        self.classifier = Pipeline([
            ('tfidf', TfidfVectorizer(max_features=1000, ngram_range=(1, 2))),
            ('clf', MultinomialNB())
        ])
        
        self.classifier.fit(texts, labels)
        self.is_trained = True
```

### Entity Extraction for Assets

```python
import re
import numpy as np
from typing import List, Dict, Set

class AssetEntityExtractor:
    """Extract asset mentions from news text."""
    
    def __init__(self, asset_list: Set[str] = None):
        # Common ticker patterns
        self.ticker_pattern = re.compile(r'\b([A-Z]{1,5})(?=\s|,|\.|\s\(|$)\b')
        self.price_pattern = re.compile(r'\$[0-9]+(?:\.[0-9]+)?')
        
        # Asset name to ticker mapping
        self.asset_names = {
            'apple': 'AAPL',
            'microsoft': 'MSFT',
            'amazon': 'AMZN',
            'google': 'GOOGL',
            'nvidia': 'NVDA',
            'tesla': 'TSLA',
            'meta': 'META',
            'facebook': 'META',
            'amazon': 'AMZN',
            'jpmorgan': 'JPM',
            'bank': 'BAC',
            'gold': 'GLD',
            'silver': 'SLV',
            'oil': 'USO',
            'btc': 'BTC-USD',
            'bitcoin': 'BTC-USD',
            'ether': 'ETH-USD',
            'ethereum': 'ETH-USD',
        }
        
        if asset_list:
            self.asset_names.update({name.upper(): ticker for name, ticker in asset_list})
    
    def extract_tickers(self, text: str, context_prices: Dict[str, float] = None) -> List[Dict]:
        """Extract stock tickers from text."""
        tickers = []
        words = text.split()
        
        for i, word in enumerate(words):
            # Check for ticker pattern
            match = self.ticker_pattern.search(word)
            if match:
                ticker = match.group(1)
                
                # Check if it's likely a ticker (not common word)
                if self._is_ticker_like(ticker):
                    tickers.append({
                        'ticker': ticker,
                        'position': i,
                        'context': ' '.join(words[max(0, i-3):i+4])
                    })
        
        # Add price context if available
        if context_prices:
            for ticker_info in tickers:
                ticker = ticker_info['ticker']
                if ticker in context_prices:
                    ticker_info['price'] = context_prices[ticker]
        
        return tickers
    
    def _is_ticker_like(self, word: str) -> bool:
        """Check if word looks like a stock ticker."""
        # Should be mostly uppercase
        if word.isupper():
            return True
        
        # Should be short (1-5 chars)
        if 1 <= len(word) <= 5 and word.isalpha():
            return True
        
        return False
    
    def extract_assets(self, text: str, context_prices: Dict[str, float] = None) -> List[Dict]:
        """Extract all asset mentions (tickers and names)."""
        assets = []
        
        # Extract tickers
        tickers = self.extract_tickers(text, context_prices)
        assets.extend(tickers)
        
        # Extract named assets
        text_lower = text.lower()
        for name, ticker in self.asset_names.items():
            if name in text_lower:
                assets.append({
                    'ticker': ticker,
                    'name': name,
                    'confidence': 0.9
                })
        
        # Remove duplicates
        seen = set()
        unique_assets = []
        for asset in assets:
            key = asset['ticker']
            if key not in seen:
                seen.add(key)
                unique_assets.append(asset)
        
        return unique_assets
```

### Streaming News Processor

```python
import time
import queue
import threading
from typing import List, Dict

class StreamingNewsProcessor:
    """Process news in real-time for trading applications."""
    
    def __init__(self, embedder, classifier, entity_extractor,
                batch_size: int = 10, max_latency_ms: int = 100):
        self.embedder = embedder
        self.classifier = classifier
        self.entity_extractor = entity_extractor
        
        self.batch_size = batch_size
        self.max_latency_ms = max_latency_ms
        
        self.news_queue = queue.Queue()
        self.results_queue = queue.Queue()
        
        self.running = False
        self.thread = None
    
    def start(self):
        """Start streaming processor."""
        self.running = True
        self.thread = threading.Thread(target=self._process_loop, daemon=True)
        self.thread.start()
    
    def stop(self):
        """Stop streaming processor."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
    
    def publish_news(self, text: str, timestamp: int = None):
        """Publish news to processing queue."""
        if timestamp is None:
            timestamp = int(time.time() * 1000)
        
        self.news_queue.put({
            'text': text,
            'timestamp': timestamp,
            'publish_time': time.time()
        })
    
    def _process_loop(self):
        """Main processing loop."""
        batch = []
        batch_start = time.time()
        
        while self.running:
            try:
                item = self.news_queue.get(timeout=0.1)
                batch.append(item)
                
                # Check batch size or timeout
                if len(batch) >= self.batch_size:
                    self._process_batch(batch)
                    batch = []
                    batch_start = time.time()
                elif time.time() - batch_start > self.max_latency_ms / 1000:
                    self._process_batch(batch)
                    batch = []
                    batch_start = time.time()
                    
            except queue.Empty:
                if batch:
                    self._process_batch(batch)
                    batch = []
                continue
    
    def _process_batch(self, batch: List[Dict]):
        """Process a batch of news items."""
        texts = [item['text'] for item in batch]
        
        start_time = time.time()
        
        # Extract embeddings
        embeddings = self.embedder.extract_embeddings(texts)
        
        # Classify news
        classifications = self.classifier.classify(texts)
        
        # Extract entities
        entities = [self.entity_extractor.extract_assets(text) for text in texts]
        
        processing_time = (time.time() - start_time) * 1000
        
        # Combine results
        for i, item in enumerate(batch):
            result = {
                **item,
                'embedding': embeddings[i],
                'classification': classifications[i],
                'entities': entities[i],
                'processing_time_ms': processing_time
            }
            
            # Check latency
            if processing_time > self.max_latency_ms:
                result['latency_warning'] = True
            
            self.results_queue.put(result)
```

### Embedding-Based Sentiment Scoring

```python
import numpy as np
from sklearn.cluster import KMeans
from typing import List, Dict

class EmbeddingSentimentScorer:
    """Score sentiment using embedding similarity to sentiment anchors."""
    
    def __init__(self, anchor_sentiment: Dict[str, float] = None):
        # Financial sentiment anchors
        self.anchors = anchor_sentiment or {
            'bullish': 0.8,
            'optimistic': 0.6,
            'positive': 0.4,
            'moderate': 0.0,
            'negative': -0.4,
            'pessimistic': -0.6,
            'bearish': -0.8
        }
    
    def score_with_anchors(self, embeddings: np.ndarray,
                          anchor_embeddings: np.ndarray) -> np.ndarray:
        """Score sentiment based on embedding similarity."""
        # Normalize embeddings
        emb_norm = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        anchor_norm = anchor_embeddings / np.linalg.norm(anchor_embeddings, axis=1, keepdims=True)
        
        # Cosine similarity
        similarities = emb_norm @ anchor_norm.T
        
        # Weighted average of anchor sentiments
        weights = similarities / (np.sum(similarities, axis=1, keepdims=True) + 1e-8)
        scores = weights @ np.array(list(self.anchors.values()))
        
        return scores
    
    def cluster_based_sentiment(self, embeddings: np.ndarray,
                               n_clusters: int = 5) -> np.ndarray:
        """Cluster embeddings and assign sentiment based on cluster characteristics."""
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        clusters = kmeans.fit_predict(embeddings)
        
        # Calculate cluster centroids
        centroids = kmeans.cluster_centers_
        
        # Each cluster gets a sentiment based on its characteristics
        # (in practice, this would be calibrated on labeled data)
        cluster_sentiments = np.linspace(-1, 1, n_clusters)
        
        return cluster_sentiments[clusters]
```