var ClearAllRain = pc.createScript('clearAllRain');

ClearAllRain.prototype.initialize = function() {
    // ボタンのクリックイベントをバインドする
    this.entity.button.on('click', this.handleClear, this);
};

ClearAllRain.prototype.handleClear = function() {
    // 1. グラフ用Canvasエンティティを検索する
    const graph = this.app.root.findByName('3DUIGraph_rain');
    const chartCanvas = graph ? graph.findByName('ChartCanvas_rain') : null;
    
    // 2. グラフモードの状態をリセットする
    if (chartCanvas) {
        chartCanvas.chartMode = 'none';
        
        // 3. グラフ表示をクリアする（テクスチャをクリア）
        if (chartCanvas.element && chartCanvas.element.texture) {
            chartCanvas.element.texture.destroy();
            chartCanvas.element.texture = null;
        }
    }
    
    // 4. （実行中であれば）リアルタイム更新を停止しようとする
    this.stopRealtimeIfRunning();

    // 5. （実行中であれば）CDF表示を停止しようとする
    this.stopCDFIfRunning();
    
    // 6. 開いているすべての拡大表示をクリアする
    this.closeAllZoomedCharts();

    // 7. 履歴データをクリア
    this.clearHistoricalData();
    
    // 8. クリアが正常に完了しました
    alert('グラフがクリアされました');
    console.log('クリア操作が完了しました');
};

ClearAllRain.prototype.closeAllZoomedCharts = function() {
    const historicalOverlay = document.getElementById('chart-zoom-overlay');
    if (historicalOverlay && historicalOverlay.parentNode) {
        historicalOverlay.parentNode.removeChild(historicalOverlay);
        console.log('履歴グラフの拡大表示を閉じました');
    }
    
    const realtimeOverlay = document.getElementById('realtime-chart-zoom-overlay');
    if (realtimeOverlay && realtimeOverlay.parentNode) {
        realtimeOverlay.parentNode.removeChild(realtimeOverlay);
        console.log('リアルタイムグラフの拡大表示を閉じました');
    }

    // CDF拡大表示も閉じる
    const cdfOverlay = document.getElementById('cdf-chart-zoom-overlay');
    if (cdfOverlay && cdfOverlay.parentNode) {
        cdfOverlay.parentNode.removeChild(cdfOverlay);
        console.log('CDFグラフの拡大表示を閉じました');
    }
};

ClearAllRain.prototype.stopRealtimeIfRunning = function() {
    const realtimeEntity = this.app.root.findByName('realTime_rain');

    if (realtimeEntity && realtimeEntity.script && realtimeEntity.script.showRealTimeValueRain) {
        const scriptInstance = realtimeEntity.script.showRealTimeValueRain;
        
        if (scriptInstance.isRealtimeActive) {
            console.log('実行中のリアルタイム更新を検出したため、停止します');
            
            if (typeof scriptInstance.stopRealtimeUpdates === 'function') {
                scriptInstance.stopRealtimeUpdates();
            }
            
            scriptInstance.isRealtimeActive = false;
            scriptInstance.realtimeData = [];

            scriptInstance.chartMode = 'none';
            
            if (typeof scriptInstance.updateButtonState === 'function') {
                scriptInstance.updateButtonState(false);
            }
            
            console.log('リアルタイム更新は停止しました');
        }
    } else {
        console.log('リアルタイム更新スクリプトのインスタンスが見つかりません');
    }
};

ClearAllRain.prototype.onDestroy = function() {
    if (this.entity.button) {
        this.entity.button.off('click', this.handleClear, this);
    }
};

ClearAllRain.prototype.clearHistoricalData = function() {
    const historicalEntity = this.app.root.findByName('state_rain');
    
    if (historicalEntity && historicalEntity.script && historicalEntity.script.showStateRain) {
        const scriptInstance = historicalEntity.script.showStateRain;
        
        scriptInstance.currentChartData = null;
        scriptInstance.chartMode = 'none';
        
        console.log('履歴データがクリアされました');
    }
};

// 新しい関数を追加
ClearAllRain.prototype.stopCDFIfRunning = function() {
    const cdfEntity = this.app.root.findByName('CDF_rain');
    
    if (cdfEntity && cdfEntity.script && cdfEntity.script.showCDF_rain) {
        const scriptInstance = cdfEntity.script.showCDF_rain;
        
        if (scriptInstance.isCDFActive) {
            console.log('実行中のCDF表示を検出したため、停止します');
            
            if (typeof scriptInstance.stopCDFDisplay === 'function') {
                scriptInstance.stopCDFDisplay();
            }
            
            scriptInstance.isCDFActive = false;
            scriptInstance.cdfData = null;
            scriptInstance.chartMode = 'none';
            
            if (typeof scriptInstance.updateButtonState === 'function') {
                scriptInstance.updateButtonState(false);
            }
            
            console.log('CDF表示は停止しました');
        }
    } else {
        console.log('CDF表示スクリプトのインスタンスが見つかりません');
    }
};