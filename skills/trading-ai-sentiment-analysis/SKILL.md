---
name: trading-ai-sentiment-analysis
description: AI-powered sentiment analysis for news, social media, and political figures in trading
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai sentiment analysis, ai-sentiment-analysis, ai-powered, social, media
---

# Sentiment Analysis for Trading: The 5 Laws of Market Emotion

**Role:** AI Sentiment Engineer — applies to news sentiment, social media analysis, political monitoring, and sentiment-based trading signals.

**Philosophy:** Emotion is Data — market sentiment is a quantifiable force. Measure it precisely, track it consistently, and convert emotional signals into actionable trading inputs.

## The 5 Laws

### 1. The Law of the Early Exit (Guard Clauses)
- **Concept:** Sentiment analysis is probabilistic. Invalid or empty text requires immediate handling.
- **Rule:** Validate input text at the boundary. Return early with clear error types if analysis cannot proceed.
- **Practice:** `if not text.strip(): return SentimentScore(score=0, confidence=0, reason="empty_text")`

### 2. Make Illegal States Unrepresentable (Parse, Don't Validate)
- **Concept:** A sentiment score outside [-1, 1] is mathematically impossible.
- **Rule:** Parse sentiment outputs into typed structures that enforce valid ranges. Use Pydantic validation.
- **Why:** Prevents entire classes of bugs where invalid sentiment scores propagate through trading decisions.

### 3. The Law of Atomic Predictability
- **Concept:** Sentiment analysis must be deterministic. Same text = same score, always.
- **Rule:** Use fixed random seeds for model inference. Cache results for identical inputs.
- **Defense:** Log the model version and parameters. Same input → same output, always.

### 4. The Law of "Fail Fast, Fail Loud"
- **Content:** A sentiment score for critical market-moving text that cannot be computed is worse than no score.
- **Rule:** If sentiment analysis fails, halt and alert immediately. Do not attempt to guess the sentiment.
- **Result:** Trading systems only use validated sentiment scores, or no score at all.

### 5. The Law of Intentional Naming
- **Concept:** "Positive" and "Negative" are ambiguous. What does "positive" mean for a bear market?
- **Rule:** Use clear, context-aware sentiment terminology. `Bullish`, `Bearish`, `Neutral` not `Positive`, `Negative`, `Neutral`.
- **Defense:** `sentiment_direction` instead of `sentiment_value` to avoid confusion.

---

## Implementation Guidelines

### Structure and Patterns to Follow

1. **Sentiment Schema**: Define strict schema for sentiment scores and sources
2. **Source-Specific Models**: Different models for news vs. Twitter vs. Reddit
3. **Temporal Tracking**: Track sentiment changes over time
4. **Aggregation Layer**: Combine multiple sources into composite signals
5. **Alert System**: Alert on significant sentiment shifts

### Common Data Structures

```python
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum


class SentimentScore(BaseModel):
    """
    Canonical sentiment score with validation.
    Score is in range [-1.0, 1.0] where:
    -1.0 = extremely bearish/negative
     0.0 = neutral
    +1.0 = extremely bullish/positive
    """
    score: float = Field(..., ge=-1.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    magnitude: float = Field(..., ge=0.0, le=1.0)  # Intensity of sentiment
    
    @field_validator('score')
    @classmethod
    def validate_score(cls, v):
        """Ensure score is within valid range"""
        if v < -1.0 or v > 1.0:
            raise ValueError(f"Sentiment score must be between -1.0 and 1.0, got {v}")
        return v
    
    @classmethod
    def neutral(cls) -> 'SentimentScore':
        """Create neutral sentiment score"""
        return cls(score=0.0, confidence=0.0, magnitude=0.0)
    
    @property
    def direction(self) -> str:
        """Get sentiment direction as string"""
        if self.score > 0.2:
            return "bullish"
        elif self.score < -0.2:
            return "bearish"
        else:
            return "neutral"
    
    @property
    def is_significant(self) -> bool:
        """Check if sentiment is significant enough for trading"""
        return self.confidence > 0.6 and self.magnitude > 0.3


class SentimentSource(Enum):
    """Source types for sentiment analysis"""
    NEWS_ARTICLE = "news"
    TWITTER_POST = "twitter"
    REDDIT_POST = "reddit"
    TELEGRAM_CHANNEL = "telegram"
    YOUTUBE_COMMENT = "youtube"
    FORUM_POST = "forum"
    POLITICAL_TWEET = "political"  # Special category for politicians


class SentimentSource(Enum):
    """Source types for sentiment analysis"""
    NEWS_ARTICLE = "news"
    TWITTER_POST = "twitter"
    REDDIT_POST = "reddit"
    TELEGRAM_CHANNEL = "telegram"
    YOUTUBE_COMMENT = "youtube"
    FORUM_POST = "forum"
    POLITICAL_TWEET = "political"  # Special category for politicians


class SentimentCategory(Enum):
    """Categories for sentiment classification"""
    MARKET_SENTIMENT = "market"
    ENTITY_SENTIMENT = "entity"  # Company, cryptocurrency, asset
    PERSONAL_SENTIMENT = "personal"  # Individual people (Elon, Trump)
    POLITICAL_SENTIMENT = "political"
    REGULATORY_SENTIMENT = "regulatory"
    TECHNICAL_SENTIMENT = "technical"
```

---

## Code Examples

### Example 1: Multi-Source Sentiment Analysis Pipeline

```python
"""
Multi-Source Sentiment Analysis: Analyzes sentiment from multiple sources
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
import asyncio
import logging
import re

logger = logging.getLogger(__name__)


class SentimentSource(str, Enum):
    """Source types for sentiment analysis"""
    NEWS_ARTICLE = "news"
    TWITTER_POST = "twitter"
    REDDIT_POST = "reddit"
    TELEGRAM_CHANNEL = "telegram"
    YOUTUBE_COMMENT = "youtube"
    FORUM_POST = "forum"
    POLITICAL_TWEET = "political"


class SentimentCategory(str, Enum):
    """Categories for sentiment classification"""
    MARKET_SENTIMENT = "market"
    ENTITY_SENTIMENT = "entity"
    PERSONAL_SENTIMENT = "personal"
    POLITICAL_SENTIMENT = "political"
    REGULATORY_SENTIMENT = "regulatory"


class SentimentScore(BaseModel):
    """Canonical sentiment score"""
    score: float = Field(..., ge=-1.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    magnitude: float = Field(..., ge=0.0, le=1.0)
    
    @property
    def direction(self) -> str:
        if self.score > 0.2:
            return "bullish"
        elif self.score < -0.2:
            return "bearish"
        else:
            return "neutral"


class SentimentResult(BaseModel):
    """Complete sentiment analysis result"""
    source_type: SentimentSource
    source_id: str
    text: str
    sentiment: SentimentScore
    categories: List[SentimentCategory]
    entities: List[str] = []  # Named entities mentioned (tickers, people)
    timestamp: datetime
    analysis_model: str
    analysis_version: str


class SentimentAnalyzer:
    """Multi-source sentiment analysis engine"""
    
    def __init__(self, models: Optional[Dict[str, Any]] = None):
        self.models = models or {}
        self._entity_patterns = {
            'BTC': [r'\bBTC\b', r'\bbitcoin\b', r'0x Bitcoin'],
            'ETH': [r'\bETH\b', r'\bethereum\b', r'0x Ethereum'],
            'SOL': [r'\bSOL\b', r'\bsolana\b'],
            'ADA': [r'\bADA\b', r'\bcardano\b'],
            'DOGE': [r'\bDOGE\b', r'\bdogecoin\b'],
            'TSLA': [r'\bTSLA\b', r'\btesla\b'],
            'AAPL': [r'\bAAPL\b', r'\bapple\b'],
        }
    
    def detect_entities(self, text: str) -> List[str]:
        """Detect cryptocurrency/ticker mentions in text"""
        entities = []
        text_lower = text.lower()
        
        for ticker, patterns in self._entity_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    entities.append(ticker)
                    break
        
        return entities
    
    def analyze_text(
        self,
        text: str,
        source_type: SentimentSource,
        source_id: str,
        timestamp: Optional[datetime] = None
    ) -> SentimentResult:
        """
        Analyze sentiment for a single text
        
        Args:
            text: Text to analyze
            source_type: Source type (twitter, news, etc.)
            source_id: Unique identifier for the source
            timestamp: When the content was published
        
        Returns:
            SentimentResult with score and metadata
        """
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Guard clause: empty text returns neutral sentiment
        if not text or not text.strip():
            return SentimentResult(
                source_type=source_type,
                source_id=source_id,
                text=text or "",
                sentiment=SentimentScore(score=0.0, confidence=0.0, magnitude=0.0),
                categories=[],
                entities=[],
                timestamp=timestamp,
                analysis_model="rule_based",
                analysis_version="1.0"
            )
        
        # Detect entities
        entities = self.detect_entities(text)
        
        # Get sentiment score using appropriate model
        sentiment = self._get_sentiment_score(text, source_type)
        
        # Determine categories based on content
        categories = self._categorize_sentiment(text, source_type, entities)
        
        return SentimentResult(
            source_type=source_type,
            source_id=source_id,
            text=text[:1000],  # Truncate for storage
            sentiment=sentiment,
            categories=categories,
            entities=entities,
            timestamp=timestamp,
            analysis_model=self._get_model_name(source_type),
            analysis_version="1.0"
        )
    
    def _get_sentiment_score(self, text: str, source_type: SentimentSource) -> SentimentScore:
        """Get sentiment score using appropriate model for source"""
        # For demo, use rule-based scoring
        # In production, this would call ML models
        
        score = 0.0
        confidence = 0.5
        magnitude = 0.5
        
        # Source-specific scoring
        if source_type == SentimentSource.TWITTER_POST:
            score, confidence, magnitude = self._score_twitter(text)
        elif source_type == SentimentSource.NEWS_ARTICLE:
            score, confidence, magnitude = self._score_news(text)
        elif source_type == SentimentSource.REDDIT_POST:
            score, confidence, magnitude = self._score_reddit(text)
        elif source_type == SentimentSource.POLITICAL_TWEET:
            score, confidence, magnitude = self._score_political(text)
        else:
            score, confidence, magnitude = self._score_generic(text)
        
        # Validate and clamp
        score = max(-1.0, min(1.0, score))
        confidence = max(0.0, min(1.0, confidence))
        magnitude = max(0.0, min(1.0, magnitude))
        
        return SentimentScore(score=score, confidence=confidence, magnitude=magnitude)
    
    def _score_twitter(self, text: str) -> tuple:
        """Score sentiment for Twitter posts"""
        score = 0.0
        positive_words = ['bullish', 'long', 'moon', 'to the moon', 'hodl', 'diamond hands', 'lambo', '-rich', 'buy', 'gain', 'up', 'rocket', 'pump']
        negative_words = ['bearish', 'short', 'dump', 'crash', 'red', 'sell', 'loss', 'down', 'blood', 'panic', 'FUD']
        
        text_lower = text.lower()
        
        for word in positive_words:
            if word in text_lower:
                score += 0.1
                break
        
        for word in negative_words:
            if word in text_lower:
                score -= 0.1
                break
        
        # Bitcoin-specific
        if 'btc' in text_lower or 'bitcoin' in text_lower:
            if 'to the moon' in text_lower or 'moon' in text_lower:
                score += 0.2
            if 'crash' in text_lower or 'dump' in text_lower:
                score -= 0.2
        
        # Normalize
        score = max(-1.0, min(1.0, score))
        confidence = 0.6 if abs(score) > 0.3 else 0.4
        magnitude = abs(score)
        
        return score, confidence, magnitude
    
    def _score_news(self, text: str) -> tuple:
        """Score sentiment for news articles"""
        score = 0.0
        positive_indicators = ['record high', 'all-time high', 'surge', 'rally', 'breakout', 'bullish', 'buy the dip']
        negative_indicators = ['record low', 'crash', 'plummet', 'dump', 'bearish', 'sell-off', 'correction']
        
        for indicator in positive_indicators:
            if indicator in text.lower():
                score += 0.15
        
        for indicator in negative_indicators:
            if indicator in text.lower():
                score -= 0.15
        
        # News is more conservative in sentiment
        score = score * 0.7  # Dampen extreme scores
        score = max(-1.0, min(1.0, score))
        
        confidence = 0.8 if abs(score) > 0.3 else 0.5
        magnitude = abs(score)
        
        return score, confidence, magnitude
    
    def _score_reddit(self, text: str) -> tuple:
        """Score sentiment for Reddit posts"""
        score = 0.0
        positive_words = ['pump', 'moon', 'to the moon', 'diamond hands', 'strong buy', 'accumulation']
        negative_words = ['dump', 'crash', 'blood', 'FUD', 'weak hands', 'panic selling']
        
        text_lower = text.lower()
        
        for word in positive_words:
            if word in text_lower:
                score += 0.12
        
        for word in negative_words:
            if word in text_lower:
                score -= 0.12
        
        # Reddit tends to be more extreme
        score = score * 1.2
        score = max(-1.0, min(1.0, score))
        
        confidence = 0.5 if abs(score) > 0.4 else 0.3
        magnitude = abs(score)
        
        return score, confidence, magnitude
    
    def _score_political(self, text: str) -> tuple:
        """Score sentiment for political tweets (Trump, Elon, etc.)"""
        score = 0.0
        positive_phrases = ['great', 'beautiful', 'winning', 'good', 'best', 'love', 'happy']
        negative_phrases = ['bad', 'disaster', 'failure', 'hate', 'sad', 'weak', 'loser']
        
        text_lower = text.lower()
        
        for phrase in positive_phrases:
            if phrase in text_lower:
                score += 0.1
        
        for phrase in negative_phrases:
            if phrase in text_lower:
                score -= 0.1
        
        # Political tweets are less directly market-impacting
        score = score * 0.5
        score = max(-1.0, min(1.0, score))
        
        confidence = 0.7 if abs(score) > 0.3 else 0.4
        magnitude = abs(score)
        
        return score, confidence, magnitude
    
    def _score_generic(self, text: str) -> tuple:
        """Generic sentiment scoring fallback"""
        positive_words = ['good', 'great', 'excellent', 'positive', 'strong', 'buy', 'up', 'gain']
        negative_words = ['bad', 'worst', 'poor', 'negative', 'weak', 'sell', 'down', 'loss']
        
        score = 0.0
        words = text.lower().split()
        
        for word in positive_words:
            if word in words:
                score += 0.1
        
        for word in negative_words:
            if word in words:
                score -= 0.1
        
        score = max(-1.0, min(1.0, score))
        confidence = 0.4
        magnitude = abs(score)
        
        return score, confidence, magnitude
    
    def _categorize_sentiment(
        self,
        text: str,
        source_type: SentimentSource,
        entities: List[str]
    ) -> List[SentimentCategory]:
        """Categorize sentiment based on content"""
        categories = []
        text_lower = text.lower()
        
        # Market sentiment (general market direction)
        if any(word in text_lower for word in ['market', 'crypto', 'btc', 'bitcoin', 'ethereum', 'price', 'trading']):
            categories.append(SentimentCategory.MARKET_SENTIMENT)
        
        # Entity sentiment (specific assets)
        if entities:
            categories.append(SentimentCategory.ENTITY_SENTIMENT)
        
        # Political sentiment (politicians, regulations)
        if any(word in text_lower for word in ['trump', 'biden', 'fed', 'sec', 'regulation', 'policy', 'law']):
            categories.append(SentimentCategory.POLITICAL_SENTIMENT)
        
        # Personal sentiment (specific people)
        if any(name in text_lower for name in ['elon', 'musk', 'cz', 'changpeng', 'vitalik', 'buterin']):
            categories.append(SentimentCategory.PERSONAL_SENTIMENT)
        
        # Default to market sentiment
        if not categories:
            categories.append(SentimentCategory.MARKET_SENTIMENT)
        
        return categories
    
    def _get_model_name(self, source_type: SentimentSource) -> str:
        """Get model name for source type"""
        models = {
            SentimentSource.TWITTER_POST: "twitter_bert_v1",
            SentimentSource.NEWS_ARTICLE: "news_roberta_v1",
            SentimentSource.REDDIT_POST: "reddit_roberta_v1",
            SentimentSource.POLITICAL_TWEET: "political_distilbert_v1",
        }
        return models.get(source_type, "generic_bert_v1")


# Example usage
if __name__ == "__main__":
    analyzer = SentimentAnalyzer()
    
    # Test different sources
    samples = [
        ("BTC is going to the moon! Long positions paying off! #crypto", SentimentSource.TWITTER_POST, "tw_123"),
        ("Bitcoin hits record high as institutional demand surges", SentimentSource.NEWS_ARTICLE, "news_456"),
        ("Elon Musk just tweeted about Dogecoin again", SentimentSource.POLITICAL_TWEET, "pol_789"),
        ("The market is crashing, everyone selling in panic", SentimentSource.REDDIT_POST, "redd_101"),
    ]
    
    for text, source_type, source_id in samples:
        result = analyzer.analyze_text(text, source_type, source_id)
        print(f"\nSource: {source_type.value}")
        print(f"Sentiment: {result.sentiment.score:.2f} ({result.sentiment.direction})")
        print(f"Confidence: {result.sentiment.confidence:.2f}")
        print(f"Entities: {result.entities}")
        print(f"Categories: {[c.value for c in result.categories]}")

```

### Example 2: Political Social Media Monitoring (Trump, Elon Musk, etc.)

```python
"""
Political Social Media Monitoring: Track and analyze political figures' impact on markets
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
import asyncio
import re
import logging

logger = logging.getLogger(__name__)


class PoliticalFigure(str, Enum):
    """Supported political figures"""
    DONALD_TRUMP = "donald_trump"
    JOE_BIDEN = "joe_biden"
    ELON_MUSK = "elon_musk"
    VITALIK_BUTERIN = "vitalik_buterin"
    CZ = "changpeng_zhao"
    GARY_GENSLER = "gary_gensler"


class PoliticalSentiment(BaseModel):
    """Political figure sentiment analysis"""
    figure: PoliticalFigure
    sentiment_score: float = Field(..., ge=-1.0, le=1.0)
    sentiment_direction: str
    sentiment_magnitude: float = Field(..., ge=0.0, le=1.0)
    post_count: int = 0
    engagement_score: float = 0.0
    keywords: List[str] = []
    impact_score: float = Field(..., ge=0.0, le=1.0)  # How likely this affects markets
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class PoliticalMonitor:
    """Monitors political figures' social media activity"""
    
    def __init__(self):
        # Keywords by figure
        self._figure_keywords = {
            PoliticalFigure.DONALD_TRUMP: {
                'crypto': ['cryptocurrency', 'bitcoin', 'digital', 'dod', 'doge'],
                'regulation': ['sec', 'regulation', 'law', 'policy', 'bill'],
                'negative': ['bad', 'disaster', 'fail', 'weak', 'loser'],
                'positive': ['great', 'good', 'winning', 'strong', 'best'],
            },
            PoliticalFigure.ELON_MUSK: {
                'crypto': ['btc', 'doge', 'coin', 'cryptocurrency', 'blockchain'],
                'tesla': ['tsla', 'tesla', 'ev', 'electric'],
                'x': ['x.com', 'twitter', 'social'],
                'negative': ['bad', 'failed', 'problem', 'issue'],
                'positive': ['cool', 'great', 'amazing', 'awesome', 'fun'],
            },
            PoliticalFigure.CZ: {
                'crypto': ['binance', 'crypto', 'bitcoin', 'exchange', 'tokens'],
                'negative': ['scam', 'fraud', 'hack', 'security'],
                'positive': ['innovation', 'growth', 'adoption', 'future'],
            },
            PoliticalFigure.GARY_GENSLER: {
                'regulation': ['sec', 'securities', 'law', 'compliance', 'regulation'],
                'negative': ['unregistered', 'illegal', 'violation', 'enforcement'],
                'positive': ['compliance', 'framework', 'guidance'],
            },
        }
        
        # Impact weights by figure
        self._figure_impact = {
            PoliticalFigure.DONALD_TRUMP: 0.7,
            PoliticalFigure.JOE_BIDEN: 0.6,
            PoliticalFigure.ELON_MUSK: 0.9,  # Very high impact
            PoliticalFigure.VITALIK_BUTERIN: 0.6,
            PoliticalFigure.CZ: 0.8,  # High impact
            PoliticalFigure.GARY_GENSLER: 0.85,  # Regulatory impact
        }
    
    def analyze_figure(
        self,
        figure: PoliticalFigure,
        recent_tweets: List[Dict[str, Any]],
        engagement_metrics: Dict[str, float]
    ) -> PoliticalSentiment:
        """
        Analyze sentiment for a political figure
        
        Args:
            figure: Political figure to analyze
            recent_tweets: List of recent tweets
            engagement_metrics: Like, retweet, reply counts
        
        Returns:
            PoliticalSentiment analysis
        """
        keywords = self._figure_keywords.get(figure, {})
        
        # Calculate sentiment
        total_score = 0.0
        tweet_count = 0
        positive_count = 0
        negative_count = 0
        
        for tweet in recent_tweets:
            text = tweet.get('text', '')
            score, direction = self._score_tweet(text, keywords)
            
            total_score += score
            if direction == 'positive':
                positive_count += 1
            elif direction == 'negative':
                negative_count += 1
            
            tweet_count += 1
        
        # Calculate average sentiment
        if tweet_count > 0:
            avg_score = total_score / tweet_count
        else:
            avg_score = 0.0
        
        # Calculate magnitude
        magnitude = abs(avg_score)
        
        # Calculate engagement score
        engagement_score = self._calculate_engagement_score(engagement_metrics, tweet_count)
        
        # Calculate impact score (combination of sentiment and impact weight)
        impact_weight = self._figure_impact.get(figure, 0.5)
        impact_score = abs(avg_score) * impact_weight
        
        # Determine direction
        if avg_score > 0.2:
            direction = "bullish"
        elif avg_score < -0.2:
            direction = "bearish"
        else:
            direction = "neutral"
        
        return PoliticalSentiment(
            figure=figure,
            sentiment_score=round(avg_score, 3),
            sentiment_direction=direction,
            sentiment_magnitude=round(magnitude, 3),
            post_count=tweet_count,
            engagement_score=round(engagement_score, 3),
            keywords=self._extract_keywords(recent_tweets, keywords),
            impact_score=round(impact_score, 3)
        )
    
    def _score_tweet(self, text: str, keywords: Dict[str, List[str]]) -> tuple:
        """Score sentiment for a single tweet"""
        text_lower = text.lower()
        score = 0.0
        
        # Check for positive keywords
        for phrase in keywords.get('positive', []):
            if phrase in text_lower:
                score += 0.2
        
        # Check for negative keywords
        for phrase in keywords.get('negative', []):
            if phrase in text_lower:
                score -= 0.2
        
        # Check for positive crypto mentions
        for phrase in keywords.get('crypto', []):
            if phrase in text_lower:
                score += 0.1
        
        # Normalize
        score = max(-1.0, min(1.0, score))
        
        if score > 0.2:
            direction = 'positive'
        elif score < -0.2:
            direction = 'negative'
        else:
            direction = 'neutral'
        
        return score, direction
    
    def _calculate_engagement_score(self, metrics: Dict[str, float], tweet_count: int) -> float:
        """Calculate engagement score from metrics"""
        if tweet_count == 0:
            return 0.0
        
        likes = metrics.get('likes', 0)
        retweets = metrics.get('retweets', 0)
        replies = metrics.get('replies', 0)
        
        # Weight retweets and replies more heavily
        engagement = (likes + retweets * 2 + replies * 3) / tweet_count
        
        # Normalize to 0-1 scale (assuming typical engagement)
        normalized = min(1.0, engagement / 1000)  # 1000 avg engagement = 1.0
        
        return normalized
    
    def _extract_keywords(
        self,
        tweets: List[Dict[str, Any]],
        keywords: Dict[str, List[str]]
    ) -> List[str]:
        """Extract most relevant keywords from tweets"""
        word_counts = {}
        
        for tweet in tweets:
            text = tweet.get('text', '').lower()
            words = re.findall(r'\b[a-z]{3,}\b', text)
            
            for word in words:
                if word not in word_counts:
                    word_counts[word] = 0
                word_counts[word] += 1
        
        # Get most common words that match figure keywords
        matching_keywords = []
        for phrase_list in keywords.values():
            for phrase in phrase_list:
                for word in phrase.split():
                    if word in word_counts and word_counts[word] > 0:
                        if word not in matching_keywords:
                            matching_keywords.append(word)
        
        return matching_keywords[:10]  # Return top 10
    
    def monitor_all_figures(
        self,
        figure_data: Dict[PoliticalFigure, Dict[str, Any]]
    ) -> Dict[PoliticalFigure, PoliticalSentiment]:
        """Monitor sentiment for all supported figures"""
        results = {}
        
        for figure, data in figure_data.items():
            result = self.analyze_figure(
                figure,
                data.get('tweets', []),
                data.get('engagement', {})
            )
            results[figure] = result
        
        return results


class PoliticalAlertSystem:
    """Generates alerts for significant political sentiment shifts"""
    
    def __init__(self):
        self._thresholds = {
            'sentiment_change': 0.3,  # 30% change
            'impact_score': 0.5,  # Minimum impact score
            'new_post': True,  # Alert on any new post
        }
        self._previous_sentiments: Dict[PoliticalFigure, PoliticalSentiment] = {}
    
    async def check_alerts(
        self,
        current_sentiments: Dict[PoliticalFigure, PoliticalSentiment]
    ) -> List[Dict[str, Any]]:
        """Check for alert conditions"""
        alerts = []
        
        for figure, current in current_sentiments.items():
            previous = self._previous_sentiments.get(figure)
            
            # Check sentiment shift
            if previous and abs(current.sentiment_score - previous.sentiment_score) > self._thresholds['sentiment_change']:
                alerts.append({
                    'type': 'sentiment_shift',
                    'figure': figure,
                    'previous_score': previous.sentiment_score,
                    'current_score': current.sentiment_score,
                    'shift': current.sentiment_score - previous.sentiment_score,
                    'message': f"{figure.value} sentiment shifted by {abs(current.sentiment_score - previous.sentiment_score):.2%}",
                })
            
            # Check high impact
            if current.impact_score >= self._thresholds['impact_score']:
                alerts.append({
                    'type': 'high_impact',
                    'figure': figure,
                    'impact_score': current.impact_score,
                    'message': f"{figure.value} has high market impact score ({current.impact_score:.2%})",
                })
            
            # Update previous
            self._previous_sentiments[figure] = current
        
        return alerts


# Example usage
if __name__ == "__main__":
    monitor = PoliticalMonitor()
    
    # Sample data
    sample_data = {
        PoliticalFigure.ELON_MUSK: {
            'tweets': [
                {'text': 'Bitcoin is great! BTC going to the moon 🚀'},
                {'text': 'Dogecoin to the moon! Doge lovers are winning 🐕'},
                {'text': 'SEC is doing a bad job regulating crypto'},
            ],
            'engagement': {
                'likes': 50000,
                'retweets': 10000,
                'replies': 5000,
            }
        },
        PoliticalFigure.GARY_GENSLER: {
            'tweets': [
                {'text': 'Need clear regulatory framework for crypto markets'},
                {'text': 'Securities laws apply to most tokens - compliance is key'},
                {'text': 'Protecting investors is our top priority'},
            ],
            'engagement': {
                'likes': 10000,
                'retweets': 2000,
                'replies': 800,
            }
        }
    }
    
    # Monitor figures
    sentiments = monitor.monitor_all_figures(sample_data)
    
    for figure, sentiment in sentiments.items():
        print(f"\n{figure.value}:")
        print(f"  Sentiment: {sentiment.sentiment_score:.2f} ({sentiment.sentiment_direction})")
        print(f"  Impact Score: {sentiment.impact_score:.2%}")
        print(f"  Posts: {sentiment.post_count}")
        print(f"  Keywords: {sentiment.keywords}")

```

### Example 3: Sentiment Aggregation and Signal Generation

```python
"""
Sentiment Aggregation: Combine multiple sentiment sources into trading signals
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
import asyncio
import statistics
import logging

logger = logging.getLogger(__name__)


class SentimentAggregation(BaseModel):
    """Aggregated sentiment from multiple sources"""
    composite_score: float = Field(..., ge=-1.0, le=1.0)
    composite_confidence: float = Field(..., ge=0.0, le=1.0)
    source_count: int = 0
    sources: List[str] = []
    weighted_sources: Dict[str, float] = {}  # Source name -> weight
    volatility: float = 0.0  # Standard deviation of individual scores
    trend: str = "neutral"  # "bullish", "bearish", "neutral"
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class SentimentSignal(BaseModel):
    """Trading signal based on sentiment"""
    signal_type: str  # "buy", "sell", "hold", "exit"
    confidence: float = Field(..., ge=0.0, le=1.0)
    sentiment_score: float
    signal_strength: str  # "strong", "moderate", "weak"
    supporting_factors: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SentimentAggregator:
    """Aggregates sentiment from multiple sources"""
    
    def __init__(self):
        # Source weights (importance for trading)
        self._source_weights = {
            'news': 1.0,
            'twitter': 0.8,
            'reddit': 0.6,
            'telegram': 0.7,
            'political': 0.9,  # Political figures have high impact
            'institutional': 1.2,  # Institutional sources are weighted higher
        }
        
        # Trend calculation window
        self._trend_window = 24  # hours
    
    def aggregate_sentiment(
        self,
        sentiment_results: List[Dict[str, Any]]
    ) -> SentimentAggregation:
        """
        Aggregate sentiment from multiple results
        
        Args:
            sentiment_results: List of sentiment analysis results
        
        Returns:
            SentimentAggregation with composite score
        """
        if not sentiment_results:
            return SentimentAggregation(
                composite_score=0.0,
                composite_confidence=0.0,
                source_count=0,
                sources=[],
                weighted_sources={},
                volatility=0.0
            )
        
        # Extract scores and sources
        scores = []
        sources = set()
        weighted_scores = []
        
        for result in sentiment_results:
            sentiment = result.get('sentiment', {})
            source = result.get('source', 'unknown')
            
            score = sentiment.get('score', 0.0)
            confidence = sentiment.get('confidence', 0.5)
            
            # Weight by confidence
            weighted_score = score * confidence
            weighted_scores.append(weighted_score)
            
            scores.append(score)
            sources.add(source)
        
        # Calculate composite score (weighted average)
        if weighted_scores:
            composite_score = sum(weighted_scores) / len(weighted_scores)
        else:
            composite_score = 0.0
        
        # Calculate confidence (average of individual confidences)
        if sentiment_results:
            avg_confidence = statistics.mean([
                r.get('sentiment', {}).get('confidence', 0.5) for r in sentiment_results
            ])
        else:
            avg_confidence = 0.0
        
        # Calculate volatility (standard deviation of scores)
        if len(scores) > 1:
            volatility = statistics.stdev(scores)
        else:
            volatility = 0.0
        
        # Determine trend
        if composite_score > 0.2:
            trend = "bullish"
        elif composite_score < -0.2:
            trend = "bearish"
        else:
            trend = "neutral"
        
        return SentimentAggregation(
            composite_score=round(composite_score, 3),
            composite_confidence=round(avg_confidence, 3),
            source_count=len(sentiment_results),
            sources=list(sources),
            weighted_sources=dict.fromkeys(sources, 1.0 / len(sources) if sources else 0),
            volatility=round(volatility, 3),
            trend=trend
        )
    
    def generate_trading_signal(
        self,
        sentiment_agg: SentimentAggregation,
        price_data: Optional[Dict[str, Any]] = None,
        technical_indicators: Optional[Dict[str, Any]] = None
    ) -> SentimentSignal:
        """
        Generate trading signal from aggregated sentiment
        
        Args:
            sentiment_agg: Aggregated sentiment results
            price_data: Optional price data for confirmation
            technical_indicators: Optional technical indicators
        
        Returns:
            SentimentSignal with trading recommendation
        """
        score = sentiment_agg.composite_score
        confidence = sentiment_agg.composite_confidence
        
        # Determine signal type based on sentiment
        if score > 0.3 and confidence > 0.6:
            signal_type = "buy"
            signal_strength = "strong"
        elif score > 0.15 and confidence > 0.5:
            signal_type = "buy"
            signal_strength = "moderate"
        elif score < -0.3 and confidence > 0.6:
            signal_type = "sell"
            signal_strength = "strong"
        elif score < -0.15 and confidence > 0.5:
            signal_type = "sell"
            signal_strength = "moderate"
        else:
            signal_type = "hold"
            signal_strength = "weak"
        
        # Determine supporting factors
        supporting_factors = []
        
        if sentiment_agg.trend == "bullish":
            supporting_factors.append("Positive market sentiment")
        elif sentiment_agg.trend == "bearish":
            supporting_factors.append("Negative market sentiment")
        
        if sentiment_agg.source_count > 3:
            supporting_factors.append(f"High source diversity ({sentiment_agg.source_count} sources)")
        
        if sentiment_agg.volatility < 0.2:
            supporting_factors.append("Consistent sentiment across sources")
        
        # Check technical confirmation
        if technical_indicators:
            rsi = technical_indicators.get('rsi', 50)
            macd = technical_indicators.get('macd', 'neutral')
            
            if signal_type == "buy" and rsi < 70 and macd == "bullish":
                supporting_factors.append("Technical confirmation: RSI healthy, MACD bullish")
            elif signal_type == "sell" and rsi > 30 and macd == "bearish":
                supporting_factors.append("Technical confirmation: RSI not oversold, MACD bearish")
        
        # Adjust confidence based on signal strength
        confidence = confidence * (1.0 if signal_strength == "strong" else 0.7)
        
        return SentimentSignal(
            signal_type=signal_type,
            confidence=round(confidence, 3),
            sentiment_score=score,
            signal_strength=signal_strength,
            supporting_factors=supporting_factors
        )
    
    def calculate_historical_trend(
        self,
        historical_sentiments: List[SentimentAggregation]
    ) -> Dict[str, Any]:
        """
        Calculate historical sentiment trend
        
        Args:
            historical_sentiments: List of historical sentiment aggregations
        
        Returns:
            Trend analysis including slope, volatility, and patterns
        """
        if not historical_sentiments:
            return {
                'current_score': 0.0,
                'trend_slope': 0.0,
                'volatility': 0.0,
                'patterns': [],
            }
        
        scores = [s.composite_score for s in historical_sentiments]
        
        # Calculate trend slope
        if len(scores) > 1:
            # Linear regression
            x = list(range(len(scores)))
            mean_x = statistics.mean(x)
            mean_y = statistics.mean(scores)
            
            numerator = sum((x[i] - mean_x) * (scores[i] - mean_y) for i in range(len(scores)))
            denominator = sum((x[i] - mean_x) ** 2 for i in range(len(scores)))
            
            slope = numerator / denominator if denominator != 0 else 0.0
        else:
            slope = 0.0
        
        # Calculate volatility
        if len(scores) > 1:
            volatility = statistics.stdev(scores)
        else:
            volatility = 0.0
        
        # Detect patterns
        patterns = []
        
        # Bullish reversal: was negative, now positive
        if len(scores) >= 2 and scores[-2] < 0 and scores[-1] > 0:
            patterns.append("bullish_reversal")
        
        # Bearish reversal: was positive, now negative
        if len(scores) >= 2 and scores[-2] > 0 and scores[-1] < 0:
            patterns.append("bearish_reversal")
        
        # Continuation: same direction for 3+ periods
        if len(scores) >= 3:
            if all(s > 0 for s in scores[-3:]):
                patterns.append("bullish_continuation")
            elif all(s < 0 for s in scores[-3:]):
                patterns.append("bearish_continuation")
        
        return {
            'current_score': scores[-1] if scores else 0.0,
            'trend_slope': round(slope, 4),
            'volatility': round(volatility, 3),
            'patterns': patterns,
        }


# Example usage
if __name__ == "__main__":
    aggregator = SentimentAggregator()
    
    # Sample sentiment results
    sentiment_results = [
        {
            'source': 'news',
            'sentiment': {'score': 0.4, 'confidence': 0.8}
        },
        {
            'source': 'twitter',
            'sentiment': {'score': 0.6, 'confidence': 0.7}
        },
        {
            'source': 'reddit',
            'sentiment': {'score': 0.3, 'confidence': 0.6}
        },
        {
            'source': 'telegram',
            'sentiment': {'score': 0.5, 'confidence': 0.75}
        },
        {
            'source': 'political',
            'sentiment': {'score': -0.2, 'confidence': 0.5}
        },
    ]
    
    # Aggregate sentiment
    agg = aggregator.aggregate_sentiment(sentiment_results)
    print(f"Composite Score: {agg.composite_score:.3f}")
    print(f"Confidence: {agg.composite_confidence:.3f}")
    print(f"Sources: {agg.sources}")
    print(f"Trend: {agg.trend}")
    print(f"Volatility: {agg.volatility:.3f}")
    
    # Generate trading signal
    signal = aggregator.generate_trading_signal(
        agg,
        technical_indicators={
            'rsi': 55,
            'macd': 'bullish',
        }
    )
    print(f"\nTrading Signal: {signal.signal_type}")
    print(f"Strength: {signal.signal_strength}")
    print(f"Confidence: {signal.confidence:.3f}")
    print(f"Supporting Factors: {signal.supporting_factors}")

```

---

## Adherence Checklist

Before completing your sentiment analysis system, verify:
- [ ] **Guard Clauses**: Are empty text inputs handled at the top with neutral sentiment?
- [ ] **Parsed State**: Is all sentiment output parsed into `SentimentScore` with valid range [-1, 1]?
- [ ] **Purity**: Do sentiment functions return new scores without mutation?
- [ ] **Fail Loud**: Do invalid sentiment scores throw clear `ValueError` exceptions?
- [ ] **Readability**: Are sentiment directions `bullish`, `bearish`, `neutral` not `positive`, `negative`, `neutral`?

---

## Common Mistakes to Avoid

### ❌ Mistake 1: No Sentiment Range Validation
```python
# BAD: Accepts any score value
def analyze(text):
    return {'score': -1.5, 'confidence': 0.8}  # Invalid score!

# GOOD: Validates with Pydantic
class SentimentScore(BaseModel):
    score: float = Field(..., ge=-1.0, le=1.0)
    
    @field_validator('score')
    @classmethod
    def validate_score(cls, v):
        if v < -1.0 or v > 1.0:
            raise ValueError(f"Score must be between -1.0 and 1.0")
        return v
```

### ❌ Mistake 2: No Source Differentiation
```python
# BAD: Same model for all sources
def analyze_sentiment(text, source):
    return model.predict(text)  # Wrong model for source!

# GOOD: Source-specific models
def analyze_sentiment(text, source):
    models = {
        'twitter': twitter_model,
        'news': news_model,
        'reddit': reddit_model,
    }
    model = models.get(source, generic_model)
    return model.predict(text)
```

### ❌ Mistake 3: No Confidence Scores
```python
# BAD: No confidence in sentiment
def analyze(text):
    return {'score': 0.5, 'direction': 'bullish'}  # No confidence!

# GOOD: Returns confidence
def analyze(text):
    return {
        'score': 0.5,
        'confidence': 0.8,  # Model confidence
        'direction': 'bullish'
    }
```

### ❌ Mistake 4: No Entity Detection
```python
# BAD: Doesn't identify mentioned entities
def analyze(text):
    return analyze_sentiment(text)  # Don't know what was mentioned!

# GOOD: Detects entities
def analyze(text):
    entities = detect_entities(text)
    sentiment = analyze_sentiment(text, entities)
    return {'sentiment': sentiment, 'entities': entities}
```

### ❌ Mistake 5: No Political Figure Monitoring
```python
# BAD: Treats all text the same
def analyze_all(text):
    return analyze_sentiment(text)  # Political mentions ignored!

# GOOD: Monitors key figures
def analyze_all(text):
    entities = detect_entities(text)
    
    # Check for political figures
    political_mentions = [e for e in entities if e in POLITICAL_FIGURES]
    political_sentiment = analyze_political(text) if political_mentions else None
    
    return {
        'sentiment': analyze_sentiment(text),
        'political_mentions': political_mentions,
        'political_sentiment': political_sentiment,
    }
```

---

## References

1. **Hugging Face Sentiment Analysis** - https://huggingface.co/docs/transformers/en/tasks/sentiment_analysis - Pre-trained models
2. **VADER Sentiment Analysis** - https://github.com/cjhutto/vaderSentiment - Twitter-optimized sentiment
3. **GPT-4o API Pricing** - https://openai.com/api/pricing/ - LLM sentiment analysis costs
4. **Twitter API v2** - https://developer.twitter.com/en/docs/twitter-api - Political tweet monitoring
5. **Sentiment Aggregation** - https://en.wikipedia.org/wiki/Sentiment_analysis - Combining multiple signals
