---
name: trading-technical-cycle-analysis
description: Market cycles and periodic patterns in price movement
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: cycles, market, periodic, technical cycle analysis, technical-cycle-analysis
  related-skills: trading-technical-false-signal-filtering, trading-technical-indicator-confluence,
    trading-fundamentals-trading-edge, trading-fundamentals-trading-plan
---

**Role:** Identify and trade based on cyclical market behavior

**Philosophy:** Markets exhibit repeating cycles; understanding cycle phases enables timing advantages

## Key Principles

1. **Cycle Detection**: FFT, autocorrelation for cycle identification
2. **Phase Analysis**: Current position within cycle
3. **Cycle Amplitude**: Cycle strength and predictability
4. **Harmonic Cycles**: Multiple cycles operating simultaneously
5. **Cycle Phase Transitions**: Key turning point signals

## Implementation Guidelines

### Structure
- Core logic: technical_analysis/cycles.py
- Helper functions: technical_analysis/fourier.py
- Tests: tests/test_cycles.py

### Patterns to Follow
- Decompose price into cycle components
- Track cycle phase and amplitude
- Identify dominant cycle lengths

## Adherence Checklist
Before completing your task, verify:
- [ ] Multiple cycle lengths detected (intraday, daily, weekly, monthly)
- [ ] Cycle phase tracked in real-time
- [ ] Dominant cycle identified and monitored
- [ ] Cycle phase transitions trigger signals
- [ ] Cycle amplitude adapts to market conditions


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from scipy import signal
from scipy.fft import fft, fftfreq
from scipy.signal import find_peaks

@dataclass
class MarketCycle:
    """Detected market cycle."""
    period: float  # In bars/units
    amplitude: float
    phase: float  # 0-2π
    strength: float  # 0-1
    frequency: float

class CycleAnalyzer:
    """Analyzes market cycles and periodic patterns."""
    
    def __init__(self, min_period: int = 10, max_period: int = 252):
        self.min_period = min_period
        self.max_period = max_period
    
    def detect_cycles_fft(
        self, prices: np.ndarray, sample_rate: float = 1.0
    ) -> List[MarketCycle]:
        """Detect cycles using Fast Fourier Transform."""
        # Detrend prices
        trend = np.polyfit(np.arange(len(prices)), prices, 1)
        detrended = prices - np.polyval(trend, np.arange(len(prices)))
        
        # Apply FFT
        n = len(detrended)
        yf = fft(detrended)
        xf = fftfreq(n, sample_rate)
        
        # Get magnitude spectrum (only positive frequencies)
        magnitude = 2.0 / n * np.abs(yf[:n // 2])
        frequencies = xf[:n // 2]
        
        # Find peaks in frequency spectrum
        peaks, _ = find_peaks(magnitude, height=np.mean(magnitude))
        
        cycles = []
        for peak in peaks:
            if self.min_period <= 1 / frequencies[peak] <= self.max_period:
                cycle = MarketCycle(
                    period=1 / frequencies[peak] if frequencies[peak] > 0 else self.max_period,
                    amplitude=magnitude[peak],
                    phase=np.angle(yf[peak]),
                    strength=magnitude[peak] / np.max(magnitude),
                    frequency=frequencies[peak]
                )
                cycles.append(cycle)
        
        return sorted(cycles, key=lambda x: x.strength, reverse=True)
    
    def detect_cycles_autocorrelation(
        self, prices: np.ndarray, max_lag: int = 200
    ) -> List[MarketCycle]:
        """Detect cycles using autocorrelation."""
        # Detrend
        trend = np.polyfit(np.arange(len(prices)), prices, 1)
        detrended = prices - np.polyval(trend, np.arange(len(prices)))
        
        # Calculate autocorrelation
        n = len(detrended)
        autocorr = np.correlate(detrended, detrended, mode='full')
        autocorr = autocorr[n-1:] / autocorr[n-1]  # Normalize
        
        # Find peaks (excluding lag 0)
        peaks, _ = find_peaks(autocorr[1:], prominence=0.1)
        
        cycles = []
        for peak in peaks:
            lag = peak + 1
            if self.min_period <= lag <= self.max_period:
                cycle = MarketCycle(
                    period=float(lag),
                    amplitude=autocorr[lag],
                    phase=0,  # Would need more analysis
                    strength=autocorr[lag],
                    frequency=1.0 / lag
                )
                cycles.append(cycle)
        
        return sorted(cycles, key=lambda x: x.strength, reverse=True)
    
    def calculate_cycle_phase(
        self, prices: np.ndarray, cycle_period: float
    ) -> float:
        """Calculate current phase of cycle (0-2π)."""
        if cycle_period <= 0:
            return 0
        
        # Create synthetic cycle
        t = np.arange(len(prices))
        synthetic = np.sin(2 * np.pi * t / cycle_period)
        
        # Cross-correlate to find phase
        correlation = np.correlate(prices, synthetic, mode='full')
        max_idx = np.argmax(np.abs(correlation))
        
        # Convert to phase
        phase_offset = max_idx - len(prices) + 1
        phase = 2 * np.pi * phase_offset / cycle_period
        
        return phase % (2 * np.pi)
    
    def identify_cycle_phase_transitions(
        self, prices: np.ndarray, cycle_period: float
    ) -> List[Dict]:
        """Identify key cycle phase transitions."""
        if cycle_period <= 0:
            return []
        
        t = np.arange(len(prices))
        synthetic = np.sin(2 * np.pi * t / cycle_period)
        
        transitions = []
        
        for i in range(1, len(prices)):
            # Detect zero crossings
            if synthetic[i-1] < 0 and synthetic[i] >= 0:
                transitions.append({
                    'type': 'bottom',
                    'phase': 'trough',
                    'index': i,
                    'price': prices[i]
                })
            elif synthetic[i-1] > 0 and synthetic[i] <= 0:
                transitions.append({
                    'type': 'top',
                    'phase': 'peak',
                    'index': i,
                    'price': prices[i]
                })
        
        return transitions
    
    def multi_cycle_analysis(
        self, prices: np.ndarray
    ) -> Dict[str, List[MarketCycle]]:
        """Analyze multiple cycle horizons simultaneously."""
        results = {
            'short': [],  # 5-50 periods
            'medium': [],  # 50-200 periods
            'long': []  # 200+ periods
        }
        
        # Short cycles
        results['short'] = self.detect_cycles_fft(prices[-100:], 1.0)
        results['short'] = [c for c in results['short'] if c.period < 50]
        
        # Medium cycles
        results['medium'] = self.detect_cycles_fft(prices[-500:], 1.0)
        results['medium'] = [c for c in results['medium'] 
                           if 50 <= c.period <= 200]
        
        # Long cycles
        results['long'] = self.detect_cycles_fft(prices[-2520:], 1.0)
        results['long'] = [c for c in results['long'] if c.period > 200]
        
        return results
```