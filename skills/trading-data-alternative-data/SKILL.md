---
name: trading-data-alternative-data
description: Alternative data ingestion pipelines for trading signals including news,
  social media, and on-chain data sources
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: data alternative data, data-alternative-data, ingestion, pipelines, trading
  related-skills: trading-ai-order-flow-analysis, trading-data-backfill-strategy, trading-data-candle-data, trading-data-validation
    trading-data-order-book
---

# Alternative Data Ingestion Pipeline: The 5 Laws of Data Normalization

**Role:** Data Engineer for Alternative Data — applies to news, social media, on-chain, and alternative data ingestion for trading signal generation.

**Philosophy:** Trust but Verify — alternative data is messy and noisy. Normalize at the boundary, validate relentlessly, and make illegal states unrepresentable in your trading logic.

## The 5 Laws

### 1. The Law of Data Atrocity
- **Concept:** Alternative data comes in every imaginable format, quality, and reliability.
- **Rule:** Accept all formats at the boundary, but parse them into standardized, typed structures immediately.
- **Practice:** Create a single `NormalizedData` type that every source must map to, regardless of input format.

### 2. The Law of the Early Exit (Guard Clauses)
- **Concept:** Malformed data is inevitable. You cannot fix it deep in your logic.
- **Rule:** Parse and validate at the boundary. Return early with clear error types if data cannot be normalized.
- **Practice:** `if (!isNormalized(data)) return { status: 'invalid', reason: 'missing_required_field' };`

### 3. The Law of Atomic Predictability
- **Concept:** Trading signals must be deterministic based on the data available.
- **Rule:** Data ingestion functions should be pure. Same input = same normalized output. No side effects.
- **Defense:** Cache parsed results, but do not mutate the input data or global state.

### 4. The Law of "Fail Fast, Fail Loud"
- **Concept:** Silent data failures cause silent trading losses.
- **Rule:** If a data source is unavailable or returns malformed data, halt signal generation and alert immediately.
- **Result:** Never proceed with stale or unparseable data. The system is safer than profitable.

### 5. The Law of Intentional Naming
- **Concept:** Data sources have confusing naming conventions (Twitter calls them "tweets", Reddit calls them "posts", etc.).
- **Rule:** Normalize all terminology into your system's canonical language.
- **Defense:** `social_media_post` instead of `tweet_or_reddit_post_or_telegram_message`.

---

## Implementation Guidelines

### Structure and Patterns to Follow

1. **Data Source Interface**: Define a common interface all data sources must implement
2. **Parser Layer**: Separate parsing from ingestion logic
3. **Validator Layer**: Validate parsed data against expected schema
4. **Cache Layer**: Optional caching for expensive API calls
5. **Error Handling**: Typed errors for different failure modes

### Common Data Structures

```python
# Canonical normalized data structures
from datetime import datetime
from typing import Optional
from enum import Enum

class DataContentType(Enum):
    NEWS_ARTICLE = "news"
    SOCIAL_POST = "social"
    ON_CHAIN_EVENT = "on_chain"
    SENTIMENT_SCORE = "sentiment"

class DataContent:
    """Canonical content structure for all data types"""
    content_id: str
    source_type: str  # e.g., "twitter", "reddit", "glassnode"
    content_type: DataContentType
    timestamp: datetime
    headline: str
    body: str
    url: Optional[str] = None
    author: Optional[str] = None
    metadata: dict = {}
```

---

## Code Examples

### Example 1: Multi-Source Data Ingestion Pipeline

```python
"""
Data Ingestion Pipeline: Aggregates news, social media, and on-chain data
into normalized structures for trading signal generation.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
import asyncio
import logging

logger = logging.getLogger(__name__)

class ContentSource(Enum):
    """Supported data sources"""
    NEWS = "news"
    TWITTER = "twitter"
    REDDIT = "reddit"
    TELEGRAM = "telegram"
    GLASSNODE = "glassnode"
    COINMETRICS = "coinmetrics"
    SANTIMENT = "santiment"
    MESSARI = "messari"

@dataclass(frozen=True)
class NormalizedContent:
    """Canonical content structure - all sources map to this"""
    content_id: str
    source: ContentSource
    source_id: str  # Original ID from the source platform
    timestamp: datetime
    headline: str
    body: str
    url: Optional[str] = None
    author: Optional[str] = None
    tags: List[str] = None
    metrics: Dict[str, float] = None
    
    def __post_init__(self):
        if self.tags is None:
            object.__setattr__(self, 'tags', [])
        if self.metrics is None:
            object.__setattr__(self, 'metrics', {})


class DataIngestionError(Exception):
    """Base exception for data ingestion errors"""
    pass


class SourceUnavailableError(DataIngestionError):
    """Source is temporarily unavailable"""
    pass


class MalformedDataError(DataIngestionError):
    """Data cannot be parsed into canonical structure"""
    def __init__(self, source: str, original_id: str, reason: str):
        self.source = source
        self.original_id = original_id
        self.reason = reason
        super().__init__(f"Malformed data from {source} (ID: {original_id}): {reason}")


class DataIngestionPipeline(ABC):
    """Abstract base class for all data ingestion sources"""
    
    @abstractmethod
    async def fetch_recent(self, minutes: int = 60) -> List[NormalizedContent]:
        """Fetch data from the last N minutes"""
        pass
    
    @abstractmethod
    async def fetch_by_id(self, content_id: str) -> Optional[NormalizedContent]:
        """Fetch a specific content item by its source ID"""
        pass
    
    @abstractmethod
    def normalize(self, raw_data: Any) -> NormalizedContent:
        """Transform source-specific data into canonical structure"""
        raise NotImplementedError


class TwitterIngestionPipeline(DataIngestionPipeline):
    """Twitter/X data ingestion with tweet parsing"""
    
    def __init__(self, api_client):
        self.api = api_client
        self.source_name = "twitter"
    
    async def fetch_recent(self, minutes: int = 60) -> List[NormalizedContent]:
        """Fetch recent tweets matching trading keywords"""
        try:
            # Parse: Filter out replies, retweets, and low-quality content
            raw_tweets = await self.api.search_recent(
                query="crypto OR bitcoin OR ethereum -is:retweet",
                max_results=100,
                start_time=datetime.utcnow().subtract(minutes=f"{minutes}m")
            )
            
            normalized = []
            for tweet in raw_tweets:
                try:
                    content = self._parse_tweet(tweet)
                    normalized.append(content)
                except MalformedDataError as e:
                    logger.warning(f"Skipping malformed tweet: {e.reason}")
            
            return normalized
            
        except Exception as e:
            raise SourceUnavailableError(f"Twitter API unavailable: {e}")
    
    async def fetch_by_id(self, content_id: str) -> Optional[NormalizedContent]:
        """Fetch a specific tweet by ID"""
        try:
            raw_tweet = await self.api.get_tweet(content_id)
            if raw_tweet is None:
                return None
            return self._parse_tweet(raw_tweet)
        except Exception as e:
            logger.error(f"Failed to fetch tweet {content_id}: {e}")
            return None
    
    def normalize(self, raw_data: Any) -> NormalizedContent:
        """Normalize raw tweet data to canonical structure"""
        return self._parse_tweet(raw_data)
    
    def _parse_tweet(self, tweet: dict) -> NormalizedContent:
        """Parse Twitter API response into canonical structure"""
        # Guard clauses for malformed data
        if not isinstance(tweet, dict):
            raise MalformedDataError(self.source_name, str(tweet), "Not a dictionary")
        
        if 'id' not in tweet:
            raise MalformedDataError(self.source_name, str(tweet), "Missing 'id' field")
        
        if 'text' not in tweet:
            raise MalformedDataError(self.source_name, tweet.get('id', 'unknown'), "Missing 'text' field")
        
        # Parse timestamp safely
        created_at = tweet.get('created_at')
        if isinstance(created_at, str):
            try:
                timestamp = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except ValueError:
                timestamp = datetime.utcnow()
        else:
            timestamp = datetime.utcnow()
        
        return NormalizedContent(
            content_id=f"twitter_{tweet['id']}",
            source=ContentSource.TWITTER,
            source_id=str(tweet['id']),
            timestamp=timestamp,
            headline=tweet.get('text', '')[:200],  # Truncate long text
            body=tweet.get('text', ''),
            url=f"https://twitter.com/user/status/{tweet['id']}",
            author=tweet.get('author', {}).get('username') if isinstance(tweet.get('author'), dict) else None,
            tags=self._extract_tags(tweet.get('text', '')),
            metrics={
                'retweet_count': tweet.get('public_metrics', {}).get('retweet_count', 0),
                'reply_count': tweet.get('public_metrics', {}).get('reply_count', 0),
                'like_count': tweet.get('public_metrics', {}).get('like_count', 0),
                'quote_count': tweet.get('public_metrics', {}).get('quote_count', 0),
            }
        )
    
    def _extract_tags(self, text: str) -> List[str]:
        """Extract hashtags and mentions from text"""
        import re
        hashtags = re.findall(r'#(\w+)', text)
        mentions = re.findall(r'@(\w+)', text)
        return [f"#{tag}" for tag in hashtags] + [f"@{user}" for user in mentions]


class RedditIngestionPipeline(DataIngestionPipeline):
    """Reddit data ingestion with post/submission parsing"""
    
    def __init__(self, api_client):
        self.api = api_client
        self.source_name = "reddit"
    
    async def fetch_recent(self, minutes: int = 60) -> List[NormalizedContent]:
        """Fetch recent Reddit posts from trading-related subreddits"""
        try:
            subreddits = ["r/CryptoCurrency", "r/Bitcoin", "r/Ethereum", "r/CryptoMarkets"]
            
            tasks = [
                self.api.search_subreddit(
                    subreddit=sub,
                    time_filter=f"{minutes}m",
                    limit=50
                )
                for sub in subreddits
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            all_posts = []
            for posts in results:
                if isinstance(posts, Exception):
                    logger.error(f"Reddit fetch error: {posts}")
                    continue
                all_posts.extend(posts)
            
            normalized = []
            for post in all_posts:
                try:
                    content = self._parse_post(post)
                    normalized.append(content)
                except MalformedDataError as e:
                    logger.warning(f"Skipping malformed Reddit post: {e.reason}")
            
            return normalized
            
        except Exception as e:
            raise SourceUnavailableError(f"Reddit API unavailable: {e}")
    
    async def fetch_by_id(self, content_id: str) -> Optional[NormalizedContent]:
        """Fetch a specific Reddit post"""
        try:
            raw_post = await self.api.get_post(content_id)
            return self._parse_post(raw_post) if raw_post else None
        except Exception as e:
            logger.error(f"Failed to fetch Reddit post {content_id}: {e}")
            return None
    
    def normalize(self, raw_data: Any) -> NormalizedContent:
        """Normalize raw Reddit post to canonical structure"""
        return self._parse_post(raw_data)
    
    def _parse_post(self, post: dict) -> NormalizedContent:
        """Parse Reddit API response into canonical structure"""
        # Guard clauses
        if not isinstance(post, dict):
            raise MalformedDataError(self.source_name, str(post), "Not a dictionary")
        
        if 'name' not in post and 'id' not in post:
            raise MalformedDataError(self.source_name, str(post), "Missing ID fields")
        
        post_id = post.get('id') or post.get('name', 'unknown')[3:]  # Remove 't3_' prefix
        
        created_utc = post.get('created_utc')
        if isinstance(created_utc, (int, float)):
            timestamp = datetime.fromtimestamp(created_utc)
        elif isinstance(created_utc, str):
            try:
                timestamp = datetime.fromisoformat(created_utc.replace('Z', '+00:00'))
            except ValueError:
                timestamp = datetime.utcnow()
        else:
            timestamp = datetime.utcnow()
        
        return NormalizedContent(
            content_id=f"reddit_{post_id}",
            source=ContentSource.REDDIT,
            source_id=str(post_id),
            timestamp=timestamp,
            headline=post.get('title', '')[:200],
            body=post.get('selftext', ''),
            url=f"https://reddit.com{post.get('permalink', '')}",
            author=post.get('author'),
            tags=self._extract_tags(post.get('title', '') + ' ' + post.get('selftext', '')),
            metrics={
                'score': post.get('score', 0),
                'num_comments': post.get('num_comments', 0),
                'ups': post.get('ups', 0),
                'downs': post.get('downs', 0),
            }
        )
    
    def _extract_tags(self, text: str) -> List[str]:
        """Extract subreddit-specific tags"""
        import re
        tags = []
        # Check for common trading patterns
        if 'BTC' in text or 'bitcoin' in text.lower():
            tags.append('#BTC')
        if 'ETH' in text or 'ethereum' in text.lower():
            tags.append('#ETH')
        if 'BULL' in text or 'bullish' in text.lower():
            tags.append('#BULLISH')
        if 'BEAR' in text or 'bearish' in text.lower():
            tags.append('#BEARISH')
        return tags


class GlassnodeIngestionPipeline(DataIngestionPipeline):
    """Glassnode on-chain data ingestion"""
    
    def __init__(self, api_client):
        self.api = api_client
        self.source_name = "glassnode"
    
    async def fetch_recent(self, minutes: int = 60) -> List[NormalizedContent]:
        """Fetch recent on-chain metrics from Glassnode"""
        try:
            # On-chain data is typically metrics, not news content
            # We'll normalize it into a "metric event" structure
            metrics = [
                'nvt',
                'mvrv',
                'puell',
                ' SOPR',
                'ghr',
                'mvrv_z_score'
            ]
            
            tasks = [
                self.api.get_metric(
                    metric=metric,
                    address='global',
                    start=datetime.utcnow().subtract(days=30)
                )
                for metric in metrics
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            normalized = []
            for metric_data in results:
                if isinstance(metric_data, Exception):
                    logger.error(f"Glassnode fetch error: {metric_data}")
                    continue
                
                try:
                    content = self._parse_metric_data(metric_data)
                    normalized.append(content)
                except MalformedDataError as e:
                    logger.warning(f"Skipping malformed Glassnode data: {e.reason}")
            
            return normalized
            
        except Exception as e:
            raise SourceUnavailableError(f"Glassnode API unavailable: {e}")
    
    async def fetch_by_id(self, content_id: str) -> Optional[NormalizedContent]:
        """Fetch specific metric by ID"""
        return None  # On-chain metrics don't have individual IDs
    
    def normalize(self, raw_data: Any) -> NormalizedContent:
        """Normalize on-chain metric data"""
        return self._parse_metric_data(raw_data)
    
    def _parse_metric_data(self, data: dict) -> NormalizedContent:
        """Parse Glassnode metric response"""
        if 'value' not in data:
            raise MalformedDataError(self.source_name, str(data), "Missing 'value' field")
        
        # Create synthetic content from metric data
        metric_name = data.get('name', 'unknown_metric')
        value = data['value']
        timestamp = datetime.fromtimestamp(data.get('t', data.get('timestamp', 0)))
        
        # Convert to human-readable headline
        if isinstance(value, (int, float)):
            headline = f"{metric_name.upper()}: {value:.4f}"
            body = f"The {metric_name} metric is currently at {value:.4f}."
        else:
            headline = f"{metric_name.upper()}: {value}"
            body = f"The {metric_name} metric is currently at {value}."
        
        return NormalizedContent(
            content_id=f"glassnode_{metric_name}_{int(timestamp.timestamp())}",
            source=ContentSource.GLASSNODE,
            source_id=metric_name,
            timestamp=timestamp,
            headline=headline,
            body=body,
            url=None,
            author=None,
            tags=[f"on_chain", f"glassnode_{metric_name}"],
            metrics={
                'metric_value': float(value) if isinstance(value, (int, float)) else 0,
                'metric_name': metric_name,
            }
        )


class AlternativeDataAggregator:
    """Orchestrates multiple data ingestion pipelines"""
    
    def __init__(self):
        self.pipelines: List[DataIngestionPipeline] = []
        self._cache: Dict[str, NormalizedContent] = {}
        self.cache_ttl_seconds = 60
    
    def register_pipeline(self, pipeline: DataIngestionPipeline):
        """Register a new data source pipeline"""
        self.pipelines.append(pipeline)
    
    async def fetch_all_recent(self, minutes: int = 60) -> List[NormalizedContent]:
        """Fetch from all registered sources"""
        tasks = [pipeline.fetch_recent(minutes) for pipeline in self.pipelines]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_content = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Pipeline fetch error: {result}")
                continue
            all_content.extend(result)
        
        return all_content
    
    async def fetch_by_source_id(self, source: ContentSource, source_id: str) -> Optional[NormalizedContent]:
        """Fetch content by source and ID"""
        cache_key = f"{source.value}_{source_id}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        for pipeline in self.pipelines:
            if pipeline.source_name == source.value:
                content = await pipeline.fetch_by_id(source_id)
                if content:
                    self._cache[cache_key] = content
                    return content
        
        return None

```

### Example 2: Data Normalization with Pydantic Validation

```python
"""
Data Normalization with Pydantic: Ensuring data integrity at the boundary
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator, root_validator, ValidationError
from enum import Enum


class ContentSource(str, Enum):
    """Canonical source types"""
    NEWS = "news"
    TWITTER = "twitter"
    REDDIT = "reddit"
    TELEGRAM = "telegram"
    GLASSNODE = "glassnode"
    COINMETRICS = "coinmetrics"
    SANTIMENT = "santiment"
    MESSARI = "messari"


class ContentCategory(str, Enum):
    """Content categorization for filtering"""
    MARKET_NEWS = "market_news"
    TECHNICAL_ANALYSIS = "technical"
    FUNDAMENTAL_ANALYSIS = "fundamental"
    ON_CHAIN_METRIC = "on_chain"
    SOCIAL_SENTIMENT = "social_sentiment"
    REGULATORY = "regulatory"
    UPDATES = "updates"


class RawTwitterTweet(BaseModel):
    """Raw Twitter API response model - represents the external source"""
    id: str
    text: str
    created_at: str
    author_id: Optional[str] = None
    public_metrics: Optional[Dict[str, int]] = None
    entities: Optional[Dict[str, Any]] = None
    
    class Config:
        allow_mutation = False  # Immutable for predictability


class RawRedditPost(BaseModel):
    """Raw Reddit API response model"""
    id: Optional[str] = None
    name: Optional[str] = None
    title: str
    selftext: str
    created_utc: float
    author: Optional[str] = None
    score: int = 0
    num_comments: int = 0
    ups: int = 0
    downs: int = 0
    permalink: Optional[str] = None
    
    class Config:
        allow_mutation = False


class NormalizedContent(BaseModel):
    """
    Canonical content structure - THE SOURCE OF TRUTH
    All sources must parse to this structure
    """
    content_id: str = Field(..., description="Unique identifier within our system")
    source: ContentSource = Field(..., description="Originating data source")
    source_id: str = Field(..., description="Original ID from the source platform")
    timestamp: datetime = Field(..., description="When the content was published")
    headline: str = Field(..., max_length=200, description="Short summary of content")
    body: str = Field(..., description="Full content text")
    url: Optional[str] = Field(None, description="Link to original content")
    author: Optional[str] = Field(None, description="Content author")
    tags: List[str] = Field(default_factory=list, description="Extracted tags/keywords")
    metrics: Dict[str, float] = Field(default_factory=dict, description="Source-specific metrics")
    category: Optional[ContentCategory] = Field(None, description="Content category")
    sentiment_score: Optional[float] = Field(None, description="-1.0 to 1.0 sentiment")
    
    class Config:
        allow_mutation = False  # Immutable = predictable
        validate_assignment = True
    
    @validator('content_id', pre=True, always=True)
    def ensure_content_id(cls, v, values):
        """Generate content_id from source if not provided"""
        if v:
            return v
        source = values.get('source')
        source_id = values.get('source_id')
        if source and source_id:
            return f"{source.value}_{source_id}"
        raise ValueError("Cannot generate content_id without source and source_id")
    
    @validator('timestamp', pre=True)
    def parse_timestamp(cls, v):
        """Parse various timestamp formats into datetime"""
        if isinstance(v, datetime):
            return v
        if isinstance(v, (int, float)):
            return datetime.fromtimestamp(v)
        if isinstance(v, str):
            # Handle ISO format
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                pass
            # Handle Unix timestamp as string
            try:
                return datetime.fromtimestamp(int(v))
            except (ValueError, OSError):
                pass
            # Default to now
            return datetime.utcnow()
        return datetime.utcnow()
    
    @validator('headline', pre=True)
    def truncate_headline(cls, v):
        """Ensure headline doesn't exceed 200 characters"""
        if not v:
            return ""
        return str(v)[:200]
    
    @validator('metrics', pre=True)
    def validate_metrics(cls, v):
        """Ensure metrics is always a dict with numeric values"""
        if v is None:
            return {}
        if isinstance(v, dict):
            # Convert any numeric strings to floats
            return {k: float(v_) if isinstance(v_, (int, float, str)) else 0.0 
                    for k, v_ in v.items()}
        return {}
    
    @validator('tags', pre=True)
    def normalize_tags(cls, v):
        """Ensure tags is always a list of strings"""
        if v is None:
            return []
        if isinstance(v, str):
            return [v]
        if isinstance(v, list):
            return [str(tag) for tag in v]
        return []
    
    @root_validator(skip_on_failure=True)
    def validate_content(cls, values):
        """Cross-field validation"""
        body = values.get('body', '')
        headline = values.get('headline', '')
        
        # Headline should be a summary of or similar to body
        if len(headline) > 0 and len(body) > 0:
            if headline not in body and body not in headline:
                # Warning but not error - different formats are valid
                pass
        
        return values


class NewsParser:
    """Parse news articles into canonical structure"""
    
    @staticmethod
    def parse_news_article(raw: dict) -> NormalizedContent:
        """
        Parse various news API formats into canonical structure
        Handles: NewsAPI, GDELT, custom news sources
        """
        # Guard clauses
        if not isinstance(raw, dict):
            raise TypeError("Raw news data must be a dictionary")
        
        if 'title' not in raw and 'headline' not in raw:
            raise ValueError("News article missing title/headline")
        
        # Extract fields with fallbacks
        title = raw.get('title') or raw.get('headline', '')
        body = raw.get('content') or raw.get('description') or raw.get('body', '')
        url = raw.get('url') or raw.get('link')
        published_at = raw.get('publishedAt') or raw.get('publish_date') or raw.get('pubDate')
        author = raw.get('author') or raw.get('authors')
        source_name = raw.get('source', {}).get('name') or raw.get('source_name', 'unknown')
        
        # Generate content_id from URL if available
        if url:
            import hashlib
            content_id = f"news_{hashlib.md5(url.encode()).hexdigest()[:12]}"
        else:
            import uuid
            content_id = f"news_{uuid.uuid4().hex[:12]}"
        
        return NormalizedContent(
            content_id=content_id,
            source=ContentSource.NEWS,
            source_id=raw.get('id', raw.get('article_id', '')),
            timestamp=NewsParser._parse_timestamp(published_at),
            headline=title,
            body=body,
            url=url,
            author=author,
            tags=NewsParser._extract_tags(body),
            metrics={
                'source': source_name,
                'source_priority': raw.get('priority', 0)
            }
        )
    
    @staticmethod
    def _parse_timestamp(ts: Any) -> datetime:
        """Parse various timestamp formats"""
        if isinstance(ts, datetime):
            return ts
        if isinstance(ts, (int, float)):
            return datetime.fromtimestamp(ts)
        if isinstance(ts, str):
            formats = [
                "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%dT%H:%M:%S+00:00",
                "%Y-%m-%d",
            ]
            for fmt in formats:
                try:
                    return datetime.strptime(ts, fmt)
                except ValueError:
                    continue
        return datetime.utcnow()
    
    @staticmethod
    def _extract_tags(text: str) -> List[str]:
        """Extract tags from news article content"""
        import re
        from typing import Set
        
        tags = set()
        
        # Common cryptocurrency tickers
        tickers = {
            'BTC', 'bitcoin', 'ETH', 'ethereum', 'SOL', 'solana', 
            'BNB', 'ADA', 'XRP', 'DOGE', 'DOT', 'MATIC'
        }
        
        # Extract tags
        for ticker in tickers:
            if ticker.upper() in text.upper():
                tags.add(f"#{ticker.upper()}")
        
        # Extract hashtags if present
        hashtags = re.findall(r'#(\w+)', text)
        for tag in hashtags:
            tags.add(f"#{tag}")
        
        return list(tags)


class SocialMediaParser:
    """Parse social media posts into canonical structure"""
    
    @staticmethod
    def parse_twitter_post(raw: dict) -> NormalizedContent:
        """Parse Twitter API response"""
        return NormalizedContent.parse_raw(raw)
    
    @staticmethod
    def parse_reddit_post(raw: dict) -> NormalizedContent:
        """Parse Reddit API response"""
        return NormalizedContent.parse_raw(raw)
    
    @staticmethod
    def parse_telegram_post(raw: dict) -> NormalizedContent:
        """Parse Telegram bot API response"""
        return NormalizedContent.parse_raw(raw)


class OnChainParser:
    """Parse on-chain metric data"""
    
    @staticmethod
    def parse_glassnode_metric(raw: dict) -> NormalizedContent:
        """Parse Glassnode metric response"""
        values = raw.get('value', [])
        
        if not isinstance(values, list):
            values = [values]
        
        # Create multiple content items for time series data
        contents = []
        for value_entry in values:
            if isinstance(value_entry, dict):
                timestamp = datetime.fromtimestamp(value_entry.get('t', 0))
                value = value_entry.get('v', value_entry.get('value', 0))
                
                contents.append(NormalizedContent(
                    content_id=f"glassnode_{raw.get('name', 'unknown')}_{int(timestamp.timestamp())}",
                    source=ContentSource.GLASSNODE,
                    source_id=raw.get('name', 'unknown'),
                    timestamp=timestamp,
                    headline=f"{raw.get('name', 'Metric').upper()}: {value:.4f}",
                    body=f"The {raw.get('name', 'metric')} is currently at {value:.4f}.",
                    metrics={
                        'metric_value': float(value),
                        'metric_name': raw.get('name'),
                    }
                ))
        
        return contents
```

### Example 3: Data Pipeline with Rate Limiting and Retry Logic

```python
"""
Data Pipeline with Rate Limiting: Ensures responsible API usage
"""

import asyncio
import time
import functools
from typing import Callable, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import logging
from collections import deque

logger = logging.getLogger(__name__)


class RateLimitStrategy(Enum):
    """Available rate limiting strategies"""
    TOKEN_BUCKET = "token_bucket"
    SLIDING_WINDOW = "sliding_window"
    FIXED_WINDOW = "fixed_window"


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting"""
    requests_per_second: float = 10.0
    burst_size: int = 50
    window_size_seconds: int = 60
    window_requests: int = 1000
    retry_max_attempts: int = 3
    retry_delay_seconds: float = 1.0


class TokenBucketRateLimiter:
    """Token bucket rate limiter implementation"""
    
    def __init__(self, rate: float, capacity: int):
        self.rate = rate  # tokens per second
        self.capacity = capacity  # max tokens
        self.tokens = capacity
        self.last_update = time.time()
        self.lock = asyncio.Lock()
    
    async def acquire(self) -> bool:
        """Acquire a token, returns True if successful"""
        async with self.lock:
            now = time.time()
            elapsed = now - self.last_update
            self.last_update = now
            
            # Replenish tokens
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            
            if self.tokens >= 1:
                self.tokens -= 1
                return True
            return False
    
    async def wait_for_token(self, timeout: float = 30.0) -> bool:
        """Wait for a token with timeout"""
        start_time = time.time()
        
        while True:
            if await self.acquire():
                return True
            
            if time.time() - start_time > timeout:
                return False
            
            # Exponential backoff
            delay = min(0.1, 2 ** (time.time() - start_time - start_time) * 0.01)
            await asyncio.sleep(delay)
    
    def get_available_tokens(self) -> float:
        """Get current token count (for monitoring)"""
        return self.tokens


class SlidingWindowRateLimiter:
    """Sliding window rate limiter implementation"""
    
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: deque = deque()
        self.lock = asyncio.Lock()
    
    async def acquire(self) -> bool:
        """Try to acquire a request slot"""
        async with self.lock:
            now = time.time()
            window_start = now - self.window_seconds
            
            # Remove expired requests
            while self.requests and self.requests[0] < window_start:
                self.requests.popleft()
            
            if len(self.requests) < self.max_requests:
                self.requests.append(now)
                return True
            return False
    
    async def wait_for_slot(self, timeout: float = 30.0) -> bool:
        """Wait for a request slot with timeout"""
        start_time = time.time()
        
        while True:
            if await self.acquire():
                return True
            
            if time.time() - start_time > timeout:
                return False
            
            # Wait until oldest request expires
            if self.requests:
                sleep_time = self.requests[0] + self.window_seconds - time.time()
                sleep_time = max(0.01, min(sleep_time, 1.0))
                await asyncio.sleep(sleep_time)
            else:
                await asyncio.sleep(0.1)
    
    def get_current_load(self) -> float:
        """Get current request load as percentage"""
        return len(self.requests) / self.max_requests * 100


class RateLimitedAPIClient:
    """API client with automatic rate limiting"""
    
    def __init__(
        self, 
        base_url: str,
        rate_config: RateLimitConfig,
        strategy: RateLimitStrategy = RateLimitStrategy.TOKEN_BUCKET
    ):
        self.base_url = base_url
        self.config = rate_config
        self.strategy = strategy
        
        if strategy == RateLimitStrategy.TOKEN_BUCKET:
            self.limiter = TokenBucketRateLimiter(
                rate=rate_config.requests_per_second,
                capacity=rate_config.burst_size
            )
        else:
            self.limiter = SlidingWindowRateLimiter(
                max_requests=rate_config.window_requests,
                window_seconds=rate_config.window_size_seconds
            )
        
        self._request_count = 0
        self._error_count = 0
    
    async def _execute_with_rate_limit(
        self, 
        func: Callable, 
        *args, 
        **kwargs
    ) -> Any:
        """Execute function with rate limiting and retry logic"""
        last_error = None
        
        for attempt in range(self.config.retry_max_attempts):
            # Wait for rate limit token
            if not await self.limiter.wait_for_token(timeout=30):
                raise RuntimeError("Rate limit timeout exceeded")
            
            try:
                result = await func(*args, **kwargs)
                self._request_count += 1
                
                # On success, reset error count
                self._error_count = 0
                
                return result
                
            except Exception as e:
                last_error = e
                self._error_count += 1
                
                # Exponential backoff
                if attempt < self.config.retry_max_attempts - 1:
                    delay = self.config.retry_delay_seconds * (2 ** attempt)
                    logger.warning(
                        f"Request failed (attempt {attempt + 1}/{self.config.retry_max_attempts}): {e}. "
                        f"Retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
        
        raise last_error
    
    async def get(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """Execute GET request with rate limiting"""
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/{endpoint}",
                params=params
            ) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 429:
                    # Rate limited, wait and retry
                    await asyncio.sleep(1)
                    return await self.get(endpoint, params)
                else:
                    raise RuntimeError(f"HTTP {response.status}: {await response.text()}")
    
    async def post(self, endpoint: str, data: dict) -> dict:
        """Execute POST request with rate limiting"""
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/{endpoint}",
                json=data
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise RuntimeError(f"HTTP {response.status}: {await response.text()}")
    
    def get_stats(self) -> dict:
        """Get rate limiter statistics"""
        if isinstance(self.limiter, TokenBucketRateLimiter):
            return {
                'type': 'token_bucket',
                'tokens_remaining': self.limiter.get_available_tokens(),
                'total_requests': self._request_count,
                'error_rate': self._error_count / max(1, self._request_count) * 100
            }
        else:
            return {
                'type': 'sliding_window',
                'current_load': self.limiter.get_current_load(),
                'total_requests': self._request_count,
                'error_rate': self._error_count / max(1, self._request_count) * 100
            }


def rate_limited(
    rate_config: RateLimitConfig,
    strategy: RateLimitStrategy = RateLimitStrategy.TOKEN_BUCKET
):
    """Decorator for rate limiting any async function"""
    def decorator(func: Callable):
        client = RateLimitedAPIClient(
            base_url="",
            rate_config=rate_config,
            strategy=strategy
        )
        
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await client._execute_with_rate_limit(func, *args, **kwargs)
        
        return wrapper
    return decorator


# Example usage
@rate_limited(
    rate_config=RateLimitConfig(
        requests_per_second=5,
        burst_size=10,
        window_requests=100,
        window_size_seconds=60,
        retry_max_attempts=3,
        retry_delay_seconds=1.0
    ),
    strategy=RateLimitStrategy.TOKEN_BUCKET
)
async def fetch_trading_data(api_key: str, symbol: str) -> dict:
    """Example function that's automatically rate limited"""
    import aiohttp
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"https://api.example.com/trading/{symbol}",
            headers={"Authorization": f"Bearer {api_key}"}
        ) as response:
            return await response.json()


# Usage example
async def main():
    # Create rate-limited client
    config = RateLimitConfig(
        requests_per_second=10,
        burst_size=50,
        window_requests=1000,
        window_size_seconds=60,
        retry_max_attempts=3,
        retry_delay_seconds=1.0
    )
    
    client = RateLimitedAPIClient(
        base_url="https://api.example.com",
        rate_config=config
    )
    
    # Fetch data - automatically rate limited
    try:
        data = await client.get("tweets", {"query": "crypto"})
        print(f"Fetched {len(data.get('data', []))} tweets")
        
        stats = client.get_stats()
        print(f"Rate limiter stats: {stats}")
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())

```

---

## Adherence Checklist

Before completing your data ingestion implementation, verify:
- [ ] **Guard Clauses**: Are all edge cases handled at the top of parsing functions?
- [ ] **Parsed State**: Is all external data parsed into canonical `NormalizedContent` at the boundary?
- [ ] **Purity**: Do parsing functions return new structures without mutating inputs?
- [ ] **Fail Loud**: Do invalid data states throw clear `MalformedDataError` exceptions immediately?
- [ ] **Readability**: Is `source` and `source_id` clearly distinguished from canonical fields?

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Missing Guard Clauses in Parsing
```python
# BAD: Deep nesting hides bugs
def parse_tweet(tweet):
    if tweet:
        if 'id' in tweet:
            if 'text' in tweet:
                return NormalizedContent(...)
# GOOD: Early exits at top
def parse_tweet(tweet):
    if not tweet or not isinstance(tweet, dict):
        raise MalformedDataError("twitter", str(tweet), "Invalid format")
    if 'id' not in tweet:
        raise MalformedDataError("twitter", str(tweet), "Missing ID")
    if 'text' not in tweet:
        raise MalformedDataError("twitter", tweet['id'], "Missing text")
    return NormalizedContent(...)
```

### ❌ Mistake 2: Mutating Input Data
```python
# BAD: Mutating input is unpredictable
def normalize_tweet(tweet):
    tweet['content_id'] = f"twitter_{tweet['id']}"
    return tweet

# GOOD: Return new structure
def normalize_tweet(tweet):
    return NormalizedContent(
        content_id=f"twitter_{tweet['id']}",
        source=ContentSource.TWITTER,
        source_id=tweet['id'],
        ...
    )
```

### ❌ Mistake 3: Silent Data Failures
```python
# BAD: Silent failure causes silent trading losses
async def fetch_tweets(query):
    try:
        return await api.search(query)
    except Exception:
        return []  # Empty result looks like "no data" not "API error"

# GOOD: Fail loud and alert
async def fetch_tweets(query):
    try:
        return await api.search(query)
    except APIUnavailableError as e:
        logger.error(f"Twitter API unavailable: {e}")
        raise SignalGenerationHalted("Cannot generate signals without Twitter data")
```

### ❌ Mistake 4: Multiple Data Formats for Same Thing
```python
# BAD: Different sources return different structures
class TwitterContent:
    def __init__(self, tweet_id, text, created_at, ...):
        pass

class RedditContent:
    def __init__(self, post_id, title, created_utc, ...):
        pass

# GOOD: Single canonical structure
class NormalizedContent(BaseModel):
    content_id: str
    source: ContentSource
    source_id: str
    timestamp: datetime
    headline: str
    body: str
    ...
```

### ❌ Mistake 5: No Timestamp Parsing
```python
# BAD: Assumes all timestamps are ISO format
def parse_timestamp(ts):
    return datetime.fromisoformat(ts)  # Fails for Unix timestamps

# GOOD: Handles all formats
def parse_timestamp(ts):
    if isinstance(ts, datetime):
        return ts
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts)
    if isinstance(ts, str):
        # Handle various string formats
        for fmt in formats:
            try:
                return datetime.strptime(ts, fmt)
            except ValueError:
                continue
    return datetime.utcnow()
```

---

## References

1. **Pydantic Documentation** - https://docs.pydantic.dev/latest/ - Data validation using Python type annotations
2. **Token Bucket Algorithm** - https://en.wikipedia.org/wiki/Token_bucket - Rate limiting implementation
3. **Sliding Window Rate Limiting** - https://medium.com/@amirm.ln/rate-limiting-algorithms-sliding-window-counter-8b3a0e7e0e0a - Alternative rate limiting approach
4. **Glassnode API Documentation** - https://docs.glassnode.com/ - On-chain metric data source
5. **Twitter API v2** - https://developer.twitter.com/en/docs/twitter-api - Social media data source
6. **Reddit API Documentation** - https://github.com/reddit-archive/reddit/wiki/API - Community data source
7. **Data Integrity Patterns** - https://martinfowler.com/bliki/DataValidation.html - Parse, don't validate approach