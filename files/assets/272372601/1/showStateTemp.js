var ShowStateTemp = pc.createScript('showStateTemp');

// initialize code called once per entity
ShowStateTemp.prototype.initialize = function() {
    this.graph = this.app.root.findByName('3DUIGraph_temp');
    this.chartCanvas = this.graph.findByName('ChartCanvas_temp');

    // chartCanvas に状態マーカーがあることを確認する
    if (this.chartCanvas) {
        // chartMode を初期化する、または既存の状態を保持する
        if (!this.chartCanvas.chartMode) {
            this.chartCanvas.chartMode = 'none'; // 'none', 'historical', 'realtime'
        }
    }

    // クリックイベントをバインドする
    this.bindClick();

    // グラフクリック時の拡大イベントをバインドする
    this.enableChartClickZoom();

};

ShowStateTemp.prototype.bindClick = function() {
    // ボタンコンポーネントの読み込みを待機する
    const tryBind = () => {
        if (this.entity.button) {
            this.entity.button.on('click', this.handleClick, this);
        } else {
            setTimeout(tryBind, 100);
        }
    };
    tryBind();
};

ShowStateTemp.prototype.handleClick = async function() {
    try {
        const startDate = await GetTimeTools.getTime('開始時間を入力してください（デフォルト：1時間前）');
        const endDate = await GetTimeTools.getTime('終了時間を入力してください（デフォルト：現在）', true);
        
        const data = await this.fetchDataFromSupabase(startDate, endDate);
        
        if (data.length > 0) {
            this.drawSimpleChart(data);
        }
        
    } catch (error) {
        console.log('操作に失敗しました:', error.message);
    }
};

ShowStateTemp.prototype.drawSimpleChart = function(data) {
    // グラフモードを更新する
    if (this.chartCanvas) {
        this.chartCanvas.chartMode = 'historical';
    }

    // 拡大用データを保存する
    this.currentChartData = data;
    
    // 既存の描画コードは維持しつつ、一部を簡略化する
    if (!this.chartCanvas || !this.chartCanvas.element) return;
    
    // Canvas を作成する
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    
    // 抽出した関数を用いて描画する
    this.drawChartToCanvas(canvas, data, false);
    
    // テクスチャを作成し、ChartCanvas に適用する（既存ロジック）
    const texture = new pc.Texture(this.app.graphicsDevice, {
        width: 800,
        height: 500,
        format: pc.PIXELFORMAT_R8_G8_B8_A8
    });
    
    texture.setSource(canvas);
    this.chartCanvas.element.texture = texture;
    
    console.log('グラフの描画が完了し、データは保存されました');
};

ShowStateTemp.prototype.enableChartClickZoom = function() {
    const tryBind = () => {
        if (this.chartCanvas && this.chartCanvas.button) {
            // 既存の可能性がある古いリスナーを削除する
            this.chartCanvas.button.off('click', this.showZoomedChart, this);
            // 新しいリスナーを追加する
            this.chartCanvas.button.on('click', this.showZoomedChart, this);
        } else {
            setTimeout(tryBind, 100);
        }
    };
    tryBind();
};

ShowStateTemp.prototype.showZoomedChart = function() {

    const currentMode = this.chartCanvas.chartMode || 'none';

    if (currentMode !== 'historical') {
        console.log('現在は履歴モードではないため、履歴グラフの拡大表示をスキップします');
        return;
    }

    // 現在のデータが存在するかを確認する
    if (!this.currentChartData || this.currentChartData.length === 0) {
        alert('ボタンをクリックしてグラフ用データを生成してください。');
        return;
    }
    
    // 拡大したグラフを直接再描画する！
    this.drawZoomedChart(this.currentChartData);
};

// drawSimpleChart のロジックを再利用し、簡略化した拡大用グラフ描画関数を作成する
ShowStateTemp.prototype.drawZoomedChart = function(data) {
    
    // 1. 全画面のオーバーレイを作成する
    const overlay = document.createElement('div');
    overlay.id = 'chart-zoom-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    // 2. 拡大表示用のグラフコンテナを作成する
    const container = document.createElement('div');
    container.style.cssText = `
        background: white;
        border-radius: 10px;
        padding: 20px;
        position: relative;
        max-width: 95vw;
        max-height: 95vh;
        overflow: auto;
        box-shadow: 0 0 30px rgba(0,0,0,0.5);
    `;
    
    // 3. 元より大きいサイズの Canvas を作成する
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 800;
    canvas.style.cssText = `
        display: block;
        max-width: 90vw;
        max-height: 80vh;
        background: white;
    `;
    
    // 4. drawSimpleChart の中核ロジックを再利用して、Canvas に描画する
    this.drawChartToCanvas(canvas, data, true); // true の場合、拡大版であることを示す
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times; Close';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 15px;
        cursor: pointer;
        font-size: 14px;
        z-index: 10001;
    `;

    const stopAllEvents = (e) => {
        if (e.target === closeBtn) {
            if (e.type === 'click' || e.type === 'touchend') {
                return;
            }
        }
        if (e.type === 'touchstart' || e.type === 'touchend') {
            e.stopPropagation();
            return;
        }
        e.stopPropagation();
        e.preventDefault();
    };
    overlay.addEventListener('click', stopAllEvents, true);
    overlay.addEventListener('mousedown', stopAllEvents, true);
    overlay.addEventListener('mouseup', stopAllEvents, true);
    overlay.addEventListener('touchstart', stopAllEvents, true);
    overlay.addEventListener('touchend', stopAllEvents, true);
    
    closeBtn.onclick = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        
        if (overlay && overlay.parentNode) {
            document.body.removeChild(overlay);
            
            if (overlay._escHandler) {
                document.removeEventListener('keydown', overlay._escHandler);
            }
        } else {
            console.log('overlay が存在しない、または親ノードがありません');
        }
    };
    
    // 6. 組み立て
    container.appendChild(canvas);
    container.appendChild(closeBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    // 7. オーバーレイをクリックして閉じる
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });

    const escHandler = (e) => {
        if (e.key === 'Escape' && document.body.contains(overlay)) {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', escHandler);
        }
    };
    
    document.addEventListener('keydown', escHandler);
    
    overlay._escHandler = escHandler;

};

ShowStateTemp.prototype.convertToChartData = function(data) {
    // 元のデータをグラフ用の形式に変換する
    // 3つのデータ系列を含むオブジェクトを返す
    const tempData = [];
    const humiData = [];
    const pressureData = [];
    
    data.forEach(item => {
        const dateObj = item[0];
        const temp = item[1];
        const humi = item[2];
        const pressure = item[3];
        
        if (dateObj && !isNaN(temp) && !isNaN(humi) && !isNaN(pressure)) {
            tempData.push({
                x: dateObj,
                y: temp
            });
            
            humiData.push({
                x: dateObj,
                y: humi
            });
            
            pressureData.push({
                x: dateObj,
                y: pressure
            });
        }
    });
    
    return {
        temp: tempData,
        humi: humiData,
        pressure: pressureData,
        allDates: data.map(item => item[0])
    };
};

ShowStateTemp.prototype.drawChartToCanvas = function(canvas, rawData, isZoomed = false) {
    if (!rawData || rawData.length === 0) {
        console.error('描画できるデータがありません');
        return;
    }
    
    // データ形式を変換する
    const chartData = this.convertToChartData(rawData);
    
    const ctx = canvas.getContext('2d');
    
    // 背景をクリアする
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 二重縦軸用に余白を拡大する
    const margin = isZoomed ? 
        { top: 100, right: 120, bottom: 120, left: 120 } :
        { top: 80, right: 80, bottom: 70, left: 80 };
    
    const width = canvas.width - margin.left - margin.right;
    const height = canvas.height - margin.top - margin.bottom;
    
    // タイトルを追加する
    ctx.fillStyle = '#333';
    ctx.font = isZoomed ? 'bold 24px Arial' : 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('松本キャンパス環境データ', canvas.width / 2, 30);
    
    // 統計情報を追加する
    const tempValues = chartData.temp.map(item => item.y);
    const humiValues = chartData.humi.map(item => item.y);
    const pressureValues = chartData.pressure.map(item => item.y);
    
    const tempStats = StatisticsUtils.calculateAllStats(tempValues);
    const humiStats = StatisticsUtils.calculateAllStats(humiValues);
    const pressureStats = StatisticsUtils.calculateAllStats(pressureValues);

    const statsText1 = `データ数: ${chartData.allDates.length} | 期間内平均: 温度 ${tempStats.avg.toFixed(1)}°C | 湿度 ${humiStats.avg.toFixed(1)}% | 気圧 ${pressureStats.avg.toFixed(1)}hPa`;
    const statsText2 = `期間内標準偏差: 温度 ${tempStats.stdDev.toFixed(1)}°C | 湿度 ${humiStats.stdDev.toFixed(1)}% | 気圧 ${pressureStats.stdDev.toFixed(1)}hPa`;
    ctx.font = isZoomed ? '16px Arial' : '14px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText(statsText1, canvas.width / 2, isZoomed ? 55 : 55);
    ctx.fillText(statsText2, canvas.width / 2, isZoomed ? 80 : 75);
    
    const minTemp = Math.min(...tempValues);
    const maxTemp = Math.max(...tempValues);
    const rangeTemp = maxTemp - minTemp || 1;
    
    const minHumi = Math.min(...humiValues);
    const maxHumi = Math.max(...humiValues);
    const rangeHumi = maxHumi - minHumi || 1;
    
    const minPressure = Math.min(...pressureValues);
    const maxPressure = Math.max(...pressureValues);
    const rangePressure = maxPressure - minPressure || 1;
    
    // 時間範囲を確定する
    const timeValues = chartData.allDates.map(date => date.getTime());
    const minTime = Math.min(...timeValues);
    const maxTime = Math.max(...timeValues);
    const rangeTime = maxTime - minTime || 1;
    
    // 座標軸を描画する
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    
    // Y軸（左）
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + height);
    ctx.stroke();
    
    // 右 Y 軸（気圧）を描画する
    const rightAxisX = margin.left + width;
    ctx.beginPath();
    ctx.moveTo(rightAxisX, margin.top);
    ctx.lineTo(rightAxisX, margin.top + height);
    ctx.stroke();
    
    // X 軸を描画する
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + height);
    ctx.lineTo(margin.left + width, margin.top + height);
    ctx.stroke();
    
    // グリッド線を描画する
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    const yGridLines = isZoomed ? 20 : 10;
    for (let i = 0; i <= yGridLines; i++) {
        const y = margin.top + height - (i / yGridLines) * height;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + width, y);
        ctx.stroke();
        
        // 左軸の目盛りラベル（温度）
        ctx.fillStyle = '#FF5722';
        ctx.font = isZoomed ? '14px Arial' : '12px Arial';
        ctx.textAlign = 'right';
        const tempValue = minTemp + (i / yGridLines) * rangeTemp;
        ctx.fillText(tempValue.toFixed(1), margin.left - (isZoomed ? 20 : 10), y + 4);
        
        // 左軸の目盛りラベル（湿度）
        ctx.fillStyle = '#2196F3';
        ctx.textAlign = 'left';
        const humiValue = minHumi + (i / yGridLines) * rangeHumi;
        ctx.fillText(humiValue.toFixed(1), margin.left + (isZoomed ? 20 : 10), y + 4);
    }
    
    // 右軸の目盛りラベル（気圧）
    for (let i = 0; i <= yGridLines; i++) {
        const y = margin.top + height - (i / yGridLines) * height;
        ctx.fillStyle = '#4CAF50';
        ctx.font = isZoomed ? '14px Arial' : '12px Arial';
        ctx.textAlign = 'left';
        const pressureValue = minPressure + (i / yGridLines) * rangePressure;
        ctx.fillText(pressureValue.toFixed(1), rightAxisX + (isZoomed ? 20 : 10), y + 4);
    }
    
    // X軸のグリッド線
    const xGridLines = Math.min(isZoomed ? 15 : 10, chartData.allDates.length - 1);
    for (let i = 0; i <= xGridLines; i++) {
        const x = margin.left + (i / xGridLines) * width;
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, margin.top + height);
        ctx.stroke();
        
        // X軸の目盛りラベル
        if (chartData.allDates.length > 0) {
            const index = Math.floor((i / xGridLines) * (chartData.allDates.length - 1));
            if (index < chartData.allDates.length) {
                const time = chartData.allDates[index];
                const timeStr = this.formatTimeForAxis(time);
                ctx.fillStyle = '#666';
                ctx.font = isZoomed ? '13px Arial' : '12px Arial';
                ctx.textAlign = 'center';
                ctx.save();
                ctx.translate(x, margin.top + height + (isZoomed ? 25 : 20));
                ctx.rotate(-Math.PI / 4);
                ctx.fillText(timeStr, 0, 0);
                ctx.restore();
            }
        }
    }
    
    // === 温度線を描画 ===
    ctx.strokeStyle = '#FF5722';
    ctx.lineWidth = isZoomed ? 4 : 3;
    ctx.beginPath();
    
    for (let i = 0; i < chartData.temp.length; i++) {
        const timeRatio = (chartData.temp[i].x.getTime() - minTime) / rangeTime;
        const x = margin.left + timeRatio * width;
        const y = margin.top + height - ((chartData.temp[i].y - minTemp) / rangeTemp) * height;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // === 湿度線を描画 ===
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = isZoomed ? 4 : 3;
    ctx.beginPath();
    
    for (let i = 0; i < chartData.humi.length; i++) {
        const timeRatio = (chartData.humi[i].x.getTime() - minTime) / rangeTime;
        const x = margin.left + timeRatio * width;
        const y = margin.top + height - ((chartData.humi[i].y - minHumi) / rangeHumi) * height;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // === 気圧線を描画 ===
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = isZoomed ? 4 : 3;
    ctx.beginPath();
    
    for (let i = 0; i < chartData.pressure.length; i++) {
        const timeRatio = (chartData.pressure[i].x.getTime() - minTime) / rangeTime;
        const x = margin.left + timeRatio * width;
        const y = margin.top + height - ((chartData.pressure[i].y - minPressure) / rangePressure) * height;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // データポイントを描画する（データ点が少ない場合のみ）
    const maxPointsToDraw = isZoomed ? 100 : 50;
    
    // 温度点
    if (chartData.temp.length <= maxPointsToDraw) {
        ctx.fillStyle = '#FF5722';
        for (let i = 0; i < chartData.temp.length; i++) {
            const timeRatio = (chartData.temp[i].x.getTime() - minTime) / rangeTime;
            const x = margin.left + timeRatio * width;
            const y = margin.top + height - ((chartData.temp[i].y - minTemp) / rangeTemp) * height;
            
            ctx.beginPath();
            ctx.arc(x, y, isZoomed ? 8 : 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    // 湿度ポイント
    if (chartData.humi.length <= maxPointsToDraw) {
        ctx.fillStyle = '#2196F3';
        for (let i = 0; i < chartData.humi.length; i++) {
            const timeRatio = (chartData.humi[i].x.getTime() - minTime) / rangeTime;
            const x = margin.left + timeRatio * width;
            const y = margin.top + height - ((chartData.humi[i].y - minHumi) / rangeHumi) * height;
            
            ctx.beginPath();
            ctx.arc(x, y, isZoomed ? 8 : 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    // 気圧ポイント
    if (chartData.pressure.length <= maxPointsToDraw) {
        ctx.fillStyle = '#4CAF50';
        for (let i = 0; i < chartData.pressure.length; i++) {
            const timeRatio = (chartData.pressure[i].x.getTime() - minTime) / rangeTime;
            const x = margin.left + timeRatio * width;
            const y = margin.top + height - ((chartData.pressure[i].y - minPressure) / rangePressure) * height;
            
            ctx.beginPath();
            ctx.arc(x, y, isZoomed ? 8 : 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    // 拡大表示時に（必要であれば）数値ラベルを追加する
    /*
    if (isZoomed) {
        const labelInterval = Math.ceil(chartData.allDates.length / 20);
        
        // 温度ラベル
        ctx.fillStyle = '#FF5722';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        for (let i = 0; i < chartData.temp.length; i += labelInterval) {
            const timeRatio = (chartData.temp[i].x.getTime() - minTime) / rangeTime;
            const x = margin.left + timeRatio * width;
            const y = margin.top + height - ((chartData.temp[i].y - minTemp) / rangeTemp) * height;
            ctx.fillText(chartData.temp[i].y.toFixed(1), x, y - 15);
        }
        
        // 湿度ラベル
        ctx.fillStyle = '#2196F3';
        for (let i = 0; i < chartData.humi.length; i += labelInterval) {
            const timeRatio = (chartData.humi[i].x.getTime() - minTime) / rangeTime;
            const x = margin.left + timeRatio * width;
            const y = margin.top + height - ((chartData.humi[i].y - minHumi) / rangeHumi) * height;
            ctx.fillText(chartData.humi[i].y.toFixed(1), x, y - 30);
        }
        
        // 気圧ラベル
        ctx.fillStyle = '#4CAF50';
        for (let i = 0; i < chartData.pressure.length; i += labelInterval) {
            const timeRatio = (chartData.pressure[i].x.getTime() - minTime) / rangeTime;
            const x = margin.left + timeRatio * width;
            const y = margin.top + height - ((chartData.pressure[i].y - minPressure) / rangePressure) * height;
            ctx.fillText(chartData.pressure[i].y.toFixed(1), x, y - 45);
        }
    }
    */
    
    // 軸ラベル
    ctx.fillStyle = '#333';
    ctx.font = isZoomed ? 'bold 18px Arial' : 'bold 16px Arial';
    ctx.textAlign = 'center';
    
    // X軸ラベル
    ctx.fillText('日時', canvas.width / 2, canvas.height - (isZoomed ? 30 : 20));
    
    // 左 Y 軸ラベル（温度/湿度）
    ctx.save();
    ctx.translate(isZoomed ? 40 : 30, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('温度 (°C) / 湿度 (%)', 0, 0);
    ctx.restore();
    
    // 右 Y 軸ラベル（気圧）
    ctx.save();
    ctx.translate(canvas.width - (isZoomed ? 40 : 30), canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('気圧 (hPa)', 0, 0);
    ctx.restore();
    
    // 凡例を追加する
    const legendX = margin.left + width - (isZoomed ? 300 : 225);
    const legendY = margin.top + height + (isZoomed ? 60 : 40);
    
    // 温度図例
    ctx.fillStyle = '#FF5722';
    ctx.fillRect(legendX, legendY, 20, 10);
    ctx.fillStyle = '#333';
    ctx.font = isZoomed ? '14px Arial' : '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('温度 (°C)', legendX + 25, legendY + 10);
    
    // 湿度図例
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(legendX + 90, legendY, 20, 10);
    ctx.fillStyle = '#333';
    ctx.fillText('湿度 (%)', legendX + 115, legendY + 10);
    
    // 気圧図例
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(legendX + 180, legendY, 20, 10);
    ctx.fillStyle = '#333';
    ctx.fillText('気圧 (hPa)', legendX + 205, legendY + 10);
};

// 補助関数：X軸表示用に時間をフォーマットする
ShowStateTemp.prototype.formatTimeForAxis = function(date) {
    // 時間のスパンに応じて表示フォーマットを決定する
    const now = new Date();
    const hoursDiff = (now - date) / (1000 * 60 * 60);
    
    if (hoursDiff < 24) {
        // 24時間以内は時:分で表示する
        return date.getHours().toString().padStart(2, '0') + ':' + 
               date.getMinutes().toString().padStart(2, '0');
    } else {
        // 24時間を超える場合は、月/日 時:分で表示する
        return (date.getMonth() + 1) + '/' + date.getDate() + ' ' +
               date.getHours().toString().padStart(2, '0') + ':' +
               date.getMinutes().toString().padStart(2, '0');
    }
};

// イベントリスナーをクリア
ShowStateTemp.prototype.onDestroy = function() {
    if (this.entity.button) {
        this.entity.button.off('click', this.handleClick, this);
    }
};

ShowStateTemp.prototype.fetchDataFromSupabase = async function(startDate, endDate) {
    const supabaseUrl = AppConfig.SUPABASE2.URL;
    const apiKey = AppConfig.SUPABASE2.API_KEY;
    const tableName = AppConfig.SUPABASE2.TABLE_NAME;

    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
        console.error('startDateとendDate は Date 型でなければなりません。');
        return [];
    }
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('startDateとendDate は有効な日付ではありません。');
        return [];
    }
    if (endDate <= startDate) {
        console.error('終了時刻は開始時刻より後でなければなりません。');
        return [];
    }

    try {
        // 1. クエリ URL を構築する - PostgREST 構文を使用
        const startTimeISO = startDate.toISOString();
        const endTimeISO = endDate.toISOString();

        const params = new URLSearchParams();
        params.append('select', 'created_at, temp, humi, pressure');
        params.append('created_at', `gte.${startTimeISO}`);
        params.append('created_at', `lte.${endTimeISO}`);
        params.append('order', 'created_at.asc');
        params.append('limit', '10000');

        const url = `${supabaseUrl}/rest/v1/${tableName}?${params.toString()}`;
        console.log('URL:', url);

        // 2. リクエストを送信する
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        console.log('HTTPステータスコード:', response.status);

        if (!response.ok) {
            console.error('リクエストに失敗しました:', response.statusText);
            const errorText = await response.text();
            console.error('エラー詳細:', errorText);
            return [];
        }

        const data = await response.json();
        console.log(`${data.length} 件のデータを正常に取得しました。`);

        if (data.length === 0) {
            console.log('指定期間内にデータが存在しません');
            return [];
        }

        // 4. 配列形式に変換する [datetime, temp, humi, pressure]
        const result = data.map(row => {
            // datetime が有効であることを確認する
            const dateObj = new Date(row.created_at);
            
            // 3つのパラメータはすべて数値型である
            const tempValue = parseFloat(row.temp);
            const humiValue = parseFloat(row.humi);
            const pressureValue = parseFloat(row.pressure);
            
            // 无効なデータをスキップする
            if (isNaN(dateObj.getTime()) || isNaN(tempValue) || isNaN(humiValue) || isNaN(pressureValue)) {
                console.warn('無効なデータをスキップする:', row);
                return null;
            }
            
            return [dateObj, tempValue, humiValue, pressureValue];
        }).filter(item => item !== null);
        
        console.log(`処理後の有効データ: ${result.length} 件`);

        // 5. データサンプルを表示する
        if (result.length > 0) {
            console.log('1件目のデータ:', {
                datetime: result[0][0],
                temp: result[0][1],
                humi: result[0][2],
                pressure: result[0][3]
            });
            
            if (result.length > 1) {
                console.log('最後のデータ:', {
                    datetime: result[result.length - 1][0],
                    temp: result[result.length - 1][1],
                    humi: result[result.length - 1][2],
                    pressure: result[result.length - 1][3]
                });
            }
        }
        
        return result;

    } catch (error) {
        console.error('データ取得中に例外が発生しました:', error);
        console.error('エラースタッ:', error.stack);
        return [];
    }
};