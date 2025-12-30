/**
 * Technical Indicators Library
 * Provides calculations for common technical analysis indicators
 */

export interface IndicatorValue {
  time: number;
  value: number;
}

export interface BBandsValue {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface MACDValue {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface StochasticValue {
  time: number;
  k: number;
  d: number;
}

/**
 * Simple Moving Average
 */
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

/**
 * Exponential Moving Average
 */
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let emaValue: number | null = null;
  
  // Use SMA of first period as starting point
  const smaValue = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      emaValue = smaValue;
      result.push(smaValue);
    } else if (emaValue !== null && Number.isFinite(emaValue)) {
      const dataPoint = data[i];
      if (dataPoint !== undefined) {
        emaValue = dataPoint * multiplier + emaValue * (1 - multiplier);
        result.push(emaValue);
      } else {
        result.push(NaN);
      }
    } else {
      result.push(NaN);
    }
  }
  
  return result;
}

/**
 * Relative Strength Index
 */
export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  
  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const change = data[i];
    const prevChange = data[i - 1];
    if (change !== undefined && prevChange !== undefined) {
      changes.push(change - prevChange);
    }
  }
  
  // Calculate gains and losses
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    if (change !== undefined) {
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
  }
  
  // Calculate average gain and loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  rsi.push(NaN); // First value is undefined
  
  for (let i = 0; i < period; i++) {
    rsi.push(NaN);
  }
  
  for (let i = period; i < data.length; i++) {
    const gain = gains[i];
    const loss = losses[i];
    if (gain !== undefined && loss !== undefined) {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      
      const rs = avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      rsi.push(isFinite(rsiValue) ? rsiValue : 50);
    } else {
      rsi.push(NaN);
    }
  }
  
  return rsi;
}

/**
 * Bollinger Bands
 */
export function calculateBBands(
  data: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BBandsValue[] {
  const result: BBandsValue[] = [];
  const sma = calculateSMA(data, period);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: i, upper: NaN, middle: NaN, lower: NaN });
    } else {
      const dataSlice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      
      if (mean !== undefined) {
        // Calculate standard deviation
        const variance = dataSlice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        
        result.push({
          time: i,
          upper: mean + stdDev * stdDevMultiplier,
          middle: mean,
          lower: mean - stdDev * stdDevMultiplier,
        });
      } else {
        result.push({ time: i, upper: NaN, middle: NaN, lower: NaN });
      }
    }
  }
  
  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDValue[] {
  const result: MACDValue[] = [];
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // Calculate MACD line
  const macdLine: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const fast = fastEMA[i];
    const slow = slowEMA[i];
    if (fast !== undefined && slow !== undefined && !isNaN(fast) && !isNaN(slow)) {
      macdLine.push(fast - slow);
    } else {
      macdLine.push(NaN);
    }
  }
  
  // Calculate signal line
  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  // Calculate histogram
  for (let i = 0; i < data.length; i++) {
    const macd = macdLine[i];
    const signal = signalLine[i];
    
    if (macd !== undefined && signal !== undefined) {
      result.push({
        time: i,
        macd: isNaN(macd) ? NaN : macd,
        signal: isNaN(signal) ? NaN : signal,
        histogram: !isNaN(macd) && !isNaN(signal) ? macd - signal : NaN,
      });
    } else {
      result.push({
        time: i,
        macd: NaN,
        signal: NaN,
        histogram: NaN,
      });
    }
  }
  
  return result;
}

/**
 * Stochastic Oscillator
 */
export function calculateStochastic(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14,
  signalPeriod: number = 3
): StochasticValue[] {
  const result: StochasticValue[] = [];
  const kValues: number[] = [];
  
  // Calculate %K
  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      kValues.push(NaN);
    } else {
      const highSlice = high.slice(i - period + 1, i + 1);
      const lowSlice = low.slice(i - period + 1, i + 1);
      const closeVal = close[i];
      
      if (closeVal !== undefined && highSlice.length > 0 && lowSlice.length > 0) {
        const highestHigh = Math.max(...highSlice.filter((h): h is number => h !== undefined));
        const lowestLow = Math.min(...lowSlice.filter((l): l is number => l !== undefined));
        
        const k = ((closeVal - lowestLow) / (highestHigh - lowestLow)) * 100;
        kValues.push(isFinite(k) ? k : 50);
      } else {
        kValues.push(NaN);
      }
    }
  }
  
  // Calculate %D (SMA of %K)
  const dValues = calculateSMA(kValues, signalPeriod);
  
  for (let i = 0; i < close.length; i++) {
    const k = kValues[i];
    const d = dValues[i];
    result.push({
      time: i,
      k: k ?? NaN,
      d: d ?? NaN,
    });
  }
  
  return result;
}

/**
 * Average True Range (ATR)
 */
export function calculateATR(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): number[] {
  const atr: number[] = [];
  const trueRanges: number[] = [];
  
  for (let i = 0; i < high.length; i++) {
    const highVal = high[i];
    const lowVal = low[i];
    
    if (highVal === undefined || lowVal === undefined) {
      trueRanges.push(NaN);
      continue;
    }
    
    let tr: number;
    
    if (i === 0) {
      tr = highVal - lowVal;
    } else {
      const closeVal = close[i - 1];
      if (closeVal === undefined) {
        tr = highVal - lowVal;
      } else {
        const tr1 = highVal - lowVal;
        const tr2 = Math.abs(highVal - closeVal);
        const tr3 = Math.abs(lowVal - closeVal);
        tr = Math.max(tr1, tr2, tr3);
      }
    }
    
    trueRanges.push(tr);
  }
  
  // Calculate ATR using EMA
  let atrValue = trueRanges.slice(0, period).reduce((a, b) => !isNaN(a) && !isNaN(b) ? a + b : NaN, 0) / period;
  
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period) {
      atr.push(NaN);
    } else {
      const tr = trueRanges[i];
      if (tr !== undefined && !isNaN(tr)) {
        atrValue = (atrValue * (period - 1) + tr) / period;
        atr.push(atrValue);
      } else {
        atr.push(NaN);
      }
    }
  }
  
  return atr;
}

/**
 * Fibonacci Retracement Levels
 */
export function calculateFibonacciLevels(highPrice: number, lowPrice: number) {
  const range = highPrice - lowPrice;
  
  return {
    level0: highPrice, // 0%
    level236: highPrice - range * 0.236, // 23.6%
    level382: highPrice - range * 0.382, // 38.2%
    level500: highPrice - range * 0.5, // 50%
    level618: highPrice - range * 0.618, // 61.8%
    level786: highPrice - range * 0.786, // 78.6%
    level100: lowPrice, // 100%
  };
}
