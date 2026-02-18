var StatisticsUtils = {
    // 平均値を計算する
    calculateAverage: function(values) {
        if (!values || values.length === 0) return 0;
        const sum = values.reduce((total, value) => total + value, 0);
        return sum / values.length;
    },
    
    // 分散を計算する（オプション：母分散または標本分散）
    calculateVariance: function(values, isSample = false) {
        if (!values || values.length < 2) return 0;
        
        const mean = this.calculateAverage(values);
        const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
        const sumSquaredDiff = squaredDifferences.reduce((total, value) => total + value, 0);
        
        // 母分散は n で割り、標本分散は n-1 で割る
        const divisor = isSample ? values.length - 1 : values.length;
        return sumSquaredDiff / divisor;
    },
    
    // 標準偏差を計算する
    calculateStdDev: function(values, isSample = false) {
        const variance = this.calculateVariance(values, isSample);
        return Math.sqrt(variance);
    },
    
    // すべての統計量を計算する
    calculateAllStats: function(values, isSample = false) {
        if (!values || values.length === 0) {
            return {
                count: 0,
                avg: 0,
                variance: 0,
                stdDev: 0,
                min: 0,
                max: 0,
                range: 0,
                sum: 0
            };
        }
        
        const count = values.length;
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / count;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        // 分散を計算する
        const squaredDiffs = values.map(x => Math.pow(x - avg, 2));
        const sumSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0);
        const variance = sumSquaredDiff / (isSample ? count - 1 : count);
        const stdDev = Math.sqrt(variance);
        
        return {
            count: count,
            avg: avg,
            variance: variance,
            stdDev: stdDev,
            min: min,
            max: max,
            range: max - min,
            sum: sum,
            isSample: isSample
        };
    },
    
    // 統計結果を文字列としてフォーマットする
    formatStats: function(stats, precision = 2) {
        return `データ:${stats.count} 平均:${stats.avg.toFixed(precision)} 標準偏差:${stats.stdDev.toFixed(precision)}`;
    },
    
    // 中央値を計算する
    calculateMedian: function(values) {
        if (!values || values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        } else {
            return sorted[middle];
        }
    },
    
    // 最頻値を計算する
    calculateMode: function(values) {
        if (!values || values.length === 0) return [];
        
        const frequency = {};
        let maxFreq = 0;
        const modes = [];
        
        values.forEach(value => {
            frequency[value] = (frequency[value] || 0) + 1;
            if (frequency[value] > maxFreq) {
                maxFreq = frequency[value];
            }
        });
        
        for (const value in frequency) {
            if (frequency[value] === maxFreq) {
                modes.push(parseFloat(value));
            }
        }
        
        return modes.length === values.length ? [] : modes;
    },

    // CDF（累積分布関数）関連の関数
    calculateCDF: function(values) {
        if (!values || values.length === 0) return [];
        
        const sortedValues = [...values].sort((a, b) => a - b);
        const n = sortedValues.length;
        
        const cdf = sortedValues.map((value, index) => {
            return {
                value: value,
                probability: (index + 1) / n
            };
        });
        
        return cdf;
    },

    calculateQuantile: function(values, probability) {
        if (!values || values.length === 0) return 0;
        if (probability < 0 || probability > 1) {
            console.warn('確率は0から1の範囲でなければなりません');
            return 0;
        }
        
        const sortedValues = [...values].sort((a, b) => a - b);
        const n = sortedValues.length;
        
        const pos = probability * (n - 1);
        const lowerIndex = Math.floor(pos);
        const upperIndex = Math.ceil(pos);
        
        if (lowerIndex === upperIndex) {
            return sortedValues[lowerIndex];
        }
        
        const weight = pos - lowerIndex;
        return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
    },

    prepareCDFForChart: function(values, maxPoints = 100) {
        const cdf = this.calculateCDF(values);
        
        if (cdf.length <= maxPoints) {
            return cdf;
        }
        
        const result = [];
        const step = Math.max(1, Math.floor(cdf.length / maxPoints));
        
        for (let i = 0; i < cdf.length; i += step) {
            result.push(cdf[i]);
        }
        
        if (result[result.length - 1] !== cdf[cdf.length - 1]) {
            result.push(cdf[cdf.length - 1]);
        }
        
        return result;
    },

    calculateCDFSummary: function(values) {
        if (!values || values.length === 0) {
            return {
                count: 0,
                mean: 0,
                median: 0,
                stdDev: 0,
                min: 0,
                max: 0,
                q1: 0,
                q3: 0
            };
        }
        
        const stats = this.calculateAllStats(values);
        const sortedValues = [...values].sort((a, b) => a - b);
        
        return {
            count: stats.count,
            mean: stats.avg,
            median: this.calculateMedian(values),
            stdDev: stats.stdDev,
            min: stats.min,
            max: stats.max,
            q1: this.calculateQuantile(values, 0.25),
            q3: this.calculateQuantile(values, 0.75),
            range: stats.range
        };
    }

};

// 他のスクリプトで使用できるようにエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatisticsUtils;
}