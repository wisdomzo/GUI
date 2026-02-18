var ShowRealTimeValue = pc.createScript('showRealTimeValue');

// initialize code called once per entity
ShowRealTimeValue.prototype.initialize = function() {
    this.graph = this.app.root.findByName('3DUIGraph_temp');
    this.chartCanvas = this.graph.findByName('ChartCanvas_temp');

    this.chartMode = 'none'; // 'none', 'historical', 'realtime'

    // リアルタイムデータ関連属性
    this.realtimeData = [];
    this.isRealtimeActive = false;

    // ハートビートメカニズムを追加する
    this.heartbeatTimer = null;

    // 最大データポイント数
    this.MAX_DATA_POINTS = 20;

    // すべてのコンポーネントの初期化が完了するまで待機します
    this.bindEventsAfterInit();

};

ShowRealTimeValue.prototype.bindEventsAfterInit = function() {
    // ボタンのクリックイベントをバインドする
    this.bindButtonEvent();
    
    // グラフのクリック拡大イベントをバインドする
    this.bindChartClick();
};

ShowRealTimeValue.prototype.bindButtonEvent = function() {
    const tryBind = () => {
        if (this.entity && this.entity.button) {
            // 先に、存在する可能性のある古いイベントリスナーを削除します。
            this.entity.button.off('click', this.handleClick, this);
            // 正しいスコープを使用してイベントをバインドします。
            this.entity.button.on('click', this.handleClick, this);
            // console.log('ボタンイベントのバインドに成功しました。');
        } else {
            setTimeout(tryBind, 100);
        }
    };
    tryBind();
};

ShowRealTimeValue.prototype.bindChartClick = function() {
    const tryBind = () => {
        if (this.chartCanvas && this.chartCanvas.button) {
            this.chartCanvas.button.off('click');
            
            this.chartCanvas.button.on('click', (event) => {
                const currentMode = this.chartCanvas.chartMode || 'none';
                
                if (currentMode !== 'realtime') {
                    console.log('現在はリアルタイムモードではないため、リアルタイムグラフ処理をスキップします');
                    return;
                }
                
                if (this.realtimeData.length === 0) {
                    alert('リアルタイムデータがありません。まずリアルタイム更新を開始してください。');
                    return;
                }
                
                this.showRealtimeZoomedChart();
            }, this);
        } else {
            setTimeout(tryBind, 100);
        }
    };
    tryBind();
};

ShowRealTimeValue.prototype.handleClick = function(event) {
    console.log('ボタンがクリックされました。', event);
    
    if (this.isRealtimeActive) {
        // すでに実行中の場合は停止します。
        this.stopRealtimeUpdates();
        console.log('リアルタイムデータの更新が停止しました。');
        
        // ボタンの状態表示を更新できます。
        if (this.entity && this.entity.button) {
            // ボタンのテキストや色を変更する
            this.updateButtonState(false);
        }
    } else {
        // リアルタイム更新を開始する
        this.startRealtimeUpdates();
        console.log('リアルタイムデータの更新を開始する');
        
        // ボタンの状態表示を更新する
        if (this.entity && this.entity.button) {
            this.updateButtonState(true);
        }
    }
};

ShowRealTimeValue.prototype.updateButtonState = function(isActive) {
    // ボタンの視覚的状態を更新する
    if (this.entity && this.entity.element) {
        if (isActive) {
            this.entity.element.color = new pc.Color(0.2, 0.8, 0.2);
            if (this.entity.element.text) {
                this.entity.element.text = 'Stop';
            }
        } else {
            this.entity.element.color = new pc.Color(0.8, 0.2, 0.2);
            if (this.entity.element.text) {
                this.entity.element.text = 'Start';
            }
        }
    }
};

ShowRealTimeValue.prototype.startRealtimeUpdates = async function() {
    // 状態をリアルタイムモードに更新する
    if (this.chartCanvas) {
        this.chartCanvas.chartMode = 'realtime';
    }
    
    try {
        const supabase = this.initializeSupabase();
        if (!supabase) {
            console.error('Supabase クライアントを初期化できません。');
            return;
        }
        
        // 最新 20 件を初期表示データとして取得します。
        await this.fetchInitialData();
        
        // リアルタイム購読を設定する
        this.setupRealtimeSubscription();
        
        this.isRealtimeActive = true;
        console.log('リアルタイム更新が開始されました。');

        // ハートビートメカニズムを起動する
        this.startSimpleHeartbeat();
        
    } catch (error) {
        console.error('リアルタイム更新の開始に失敗しました:', error);
        this.isRealtimeActive = false;
    }
};

ShowRealTimeValue.prototype.fetchInitialData = async function() {
    const supabaseUrl = AppConfig.SUPABASE2.URL;
    const apiKey = AppConfig.SUPABASE2.API_KEY;
    const tableName = AppConfig.SUPABASE2.TABLE_NAME;
    
    try {
        const params = new URLSearchParams();
        params.append('select', 'created_at, temp, humi, pressure');
        params.append('order', 'created_at.desc');
        params.append('limit', this.MAX_DATA_POINTS.toString());
        
        const url = `${supabaseUrl}/rest/v1/${tableName}?${params.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP通信エラー: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`初期データを受信: ${data.length} 件`);
        
        // データ形式を変換して並べ替える
        this.realtimeData = data.map(row => {
            const dateObj = new Date(row.created_at);
            const tempValue = parseFloat(row.temp);
            const humiValue = parseFloat(row.humi);
            const pressureValue = parseFloat(row.pressure);
            
            if (isNaN(dateObj.getTime()) || isNaN(tempValue) || isNaN(humiValue) || isNaN(pressureValue)) {
                console.warn('無効なデータ:', row);
                return null;
            }
            
            return [dateObj, tempValue, humiValue, pressureValue];
        }).filter(item => item !== null);
        
        // 時間順に昇順で並べる
        this.realtimeData.sort((a, b) => a[0].getTime() - b[0].getTime());
        
        console.log(`処理後の有効データ: ${this.realtimeData.length} 件`);
        
        // グラフを更新する
        this.updateRealtimeChart();
        
    } catch (error) {
        console.error('初期データの取得に失敗しました:', error);
    }
};

ShowRealTimeValue.prototype.setupRealtimeSubscription = function() {
    const supabase = this.supabaseClient;
    if (!supabase) {
        console.error('Supabase クライアント未初期化');
        return;
    }

    const tableName = AppConfig.SUPABASE2.TABLE_NAME;
    const selectedColumns = ['created_at', 'temp', 'humi', 'pressure'];

    try {
        if (this.subscription) {
            try {
                if (typeof this.subscription.unsubscribe === 'function') {
                    this.subscription.unsubscribe();
                }
            } catch (error) {
                console.warn('旧サブスクリプションの削除中にエラー:', error);
            }
            this.subscription = null;
        }

        this.subscription = supabase.channel('realtime_' + tableName)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: tableName },
                (payload) => {
                    const filteredData = {};
                    selectedColumns.forEach(col => filteredData[col] = payload.new[col]);
                    console.log('新しいデータを受信:', filteredData);
                    this.handleNewData(filteredData);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: tableName },
                (payload) => {
                    const filteredData = {};
                    selectedColumns.forEach(col => filteredData[col] = payload.new[col]);
                    console.log('データ更新:', filteredData);
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: tableName },
                (payload) => {
                    console.log('データ削除:', payload.old);
                }
            )
            .subscribe(status => {
                console.log('サブスクリプション状態:', status);
                if (status === 'SUBSCRIBED') console.log('リアルタイムサブスクリプション成功');
                else if (status === 'CHANNEL_ERROR') {
                    console.error('サブスクリプションチャネルエラー');
                    alert('リアルタイムサブスクリプション接続失敗。ネットワークを確認してください。');
                }
            });

        console.log('リアルタイムサブスクリプションを作成しました');

    } catch (error) {
        console.error('リアルタイムサブスクリプションの設定に失敗:', error);
        alert('リアルタイムサブスクリプションの設定に失敗: ' + error.message);
    }
};

ShowRealTimeValue.prototype.handleNewData = function(newData) {
    if (!newData || !newData.created_at) {
        console.warn('空のデータを受信した、またはフォーマットが正しくありません:', newData);
        return;
    }
    
    // 新しいデータの形式を変換する
    const dateObj = new Date(newData.created_at);
    const tempValue = parseFloat(newData.temp);
    const humiValue = parseFloat(newData.humi);
    const pressureValue = parseFloat(newData.pressure);
    
    if (isNaN(dateObj.getTime()) || isNaN(tempValue) || isNaN(humiValue) || isNaN(pressureValue)) {
        console.warn('無効な数値を受信しました:', newData);
        return;
    }
    
    const newDataPoint = [dateObj, tempValue, humiValue, pressureValue];
    
    // データ配列に追加する
    this.realtimeData.push(newDataPoint);
    
    // 最新のデータポイントのみを保持する
    if (this.realtimeData.length > this.MAX_DATA_POINTS) {
        this.realtimeData.shift(); // 最も古いデータを削除する
    }
    
    console.log(`データが更新されました。現在のデータポイント: ${this.realtimeData.length}/${this.MAX_DATA_POINTS}`);
    
    this.updateRealtimeChart();
    
    // もし拡大表示中のグラフがある場合も、更新します。
    if (this.zoomedChartActive) {
        this.updateZoomedChart();
    }
};

ShowRealTimeValue.prototype.showRealtimeZoomedChart = function() {
    const currentMode = this.chartCanvas.chartMode || 'none';
    if (currentMode !== 'realtime') {
        console.log('グラフは履歴モードのため、リアルタイムグラフの拡大表示は行いません');
        return;
    }

    if (this.realtimeData.length === 0) {
        alert('リアルタイムデータがありません。まずリアルタイム更新を開始してください。');
        return;
    }
    
    // 拡大グラフをアクティブ状態に設定する
    this.zoomedChartActive = true;
    
    // フルスクリーンオーバーレイを作成する
    const overlay = document.createElement('div');
    overlay.id = 'realtime-chart-zoom-overlay';
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
    
    // コンテナを作成する
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
    
    // Canvasを作成する
    const canvas = document.createElement('canvas');
    canvas.id = 'realtime-zoomed-canvas';
    canvas.width = 1400;
    canvas.height = 800;
    canvas.style.cssText = `
        display: block;
        max-width: 90vw;
        max-height: 80vh;
        background: white;
    `;
    
    // グラフを描画する
    this.drawRealtimeChartToCanvas(canvas, this.realtimeData, true);
    
    // 閉じるボタン
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
    
    closeBtn.onclick = () => {
        this.zoomedChartActive = false;
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', escHandler);
    };
    
    // 組み立て
    container.appendChild(canvas);
    container.appendChild(closeBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    // ESCキーで閉じる
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            this.zoomedChartActive = false;
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', escHandler);
        }
    };
    
    document.addEventListener('keydown', escHandler);
    overlay._escHandler = escHandler;
    
    // 背景をクリックして閉じる
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            this.zoomedChartActive = false;
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', escHandler);
        }
    });
    
    // 更新用にオーバーレイの参照を保存する
    this.zoomedOverlay = overlay;
};

ShowRealTimeValue.prototype.updateZoomedChart = function() {
    const canvas = document.getElementById('realtime-zoomed-canvas');
    if (canvas && this.zoomedChartActive) {
        this.drawRealtimeChartToCanvas(canvas, this.realtimeData, true);
        
        console.log('拡大グラフが更新されました');
    }
};

ShowRealTimeValue.prototype.stopRealtimeUpdates = function() {
    console.log('リアルタイム更新を停止');

    // ハードビットが停止
    if (this.heartbeatTimer) {
        clearTimeout(this.heartbeatTimer);
        this.heartbeatTimer = null;
        console.log('ハートビートメカニズムが停止しました');
    }
    
    if (this.subscription) {
        console.log('サブスクリプションをキャンセルします...');
        
        if (typeof this.subscription.unsubscribe === 'function') {
            try {
                this.subscription.unsubscribe();
                console.log('サブスクリプションはunsubscribe()でキャンセルされました');
            } catch (error) {
                console.error('unsubscribe()でエラー:', error);
            }
        } 
        else if (typeof this.subscription.close === 'function') {
            try {
                this.subscription.close();
                console.log('サブスクリプションはclose()でキャンセルされました');
            } catch (error) {
                console.error('close()でエラー:', error);
            }
        }
        else {
            console.warn('サブスクリプションオブジェクトにキャンセルメソッドが見つかりません');
        }
        
        this.subscription = null;
    }
    
    this.isRealtimeActive = false;
    this.updateButtonState(false);
    
    // 拡大グラフを閉じる
    if (this.zoomedChartActive && this.zoomedOverlay && document.body.contains(this.zoomedOverlay)) {
        this.zoomedChartActive = false;
        document.body.removeChild(this.zoomedOverlay);
        console.log('拡大グラフを閉じました');
    }
    
    console.log('リアルタイム更新が完全に停止しました');
};







// subFunctions
ShowRealTimeValue.prototype.initializeSupabase = function() {
    if (this.supabaseClient) {
        return this.supabaseClient;
    }
    
    // Supabase が読み込まれているか確認する
    if (typeof supabase === 'undefined') {
        console.error('Supabase クライアントライブラリが読み込まれていません。PlayCanvas の設定で外部スクリプトが追加されていることを確認してください。');
        console.error('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
        return null;
    }
    
    const supabaseUrl = AppConfig.SUPABASE2.URL;
    const apiKey = AppConfig.SUPABASE2.API_KEY;
    
    try {
        this.supabaseClient = supabase.createClient(supabaseUrl, apiKey, {
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });
        console.log('Supabase クライアントの初期化に成功しました。');
        return this.supabaseClient;
    } catch (error) {
        console.error('Supabase クライアントの初期化に失敗しました。:', error);
        return null;
    }
};

ShowRealTimeValue.prototype.updateRealtimeChart = function() {
    if (this.realtimeData.length === 0) {
        console.log('表示できるリアルタイムデータがありません');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    
    this.drawRealtimeChartToCanvas(canvas, this.realtimeData, false);
    
    const texture = new pc.Texture(this.app.graphicsDevice, {
        width: 800,
        height: 500,
        format: pc.PIXELFORMAT_R8_G8_B8_A8
    });
    
    texture.setSource(canvas);
    if (this.chartCanvas && this.chartCanvas.element) {
        this.chartCanvas.element.texture = texture;
    }
    
    console.log('リアルタイムグラフが更新されました');
};

ShowRealTimeValue.prototype.drawRealtimeChartToCanvas = function(canvas, data, isZoomed = false) {
    if (!data || data.length === 0) return;

    // データ形式を変換する
    const chartData = this.convertToChartData(data);
    
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const margin = isZoomed ? 
        { top: 100, right: 120, bottom: 120, left: 120 } :
        { top: 80, right: 80, bottom: 70, left: 80 };
    
    const width = canvas.width - margin.left - margin.right;
    const height = canvas.height - margin.top - margin.bottom;
    
    ctx.fillStyle = '#333';
    ctx.font = isZoomed ? 'bold 24px Arial' : 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('松本キャンパス環境データ（リアルタイム）', canvas.width / 2, 30);
    
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
    
    // データ範囲
    const minTemp = Math.min(...tempValues);
    const maxTemp = Math.max(...tempValues);
    const rangeTemp = maxTemp - minTemp || 1;
    
    const minHumi = Math.min(...humiValues);
    const maxHumi = Math.max(...humiValues);
    const rangeHumi = maxHumi - minHumi || 1;
    
    const minPressure = Math.min(...pressureValues);
    const maxPressure = Math.max(...pressureValues);
    const rangePressure = maxPressure - minPressure || 1;
    
    // 時間範囲
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
    
    // Y軸（右）
    const rightAxisX = margin.left + width;
    ctx.beginPath();
    ctx.moveTo(rightAxisX, margin.top);
    ctx.lineTo(rightAxisX, margin.top + height);
    ctx.stroke();
    
    // X軸
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
    const xGridLines = Math.min(isZoomed ? 20 : 10, chartData.allDates.length - 1);
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

    // 温度を描画する
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
    
    // 湿度を描画する
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
    
    // 気圧を描画する
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
    
    // 最新の更新時刻を表示する
    if (chartData.allDates.length > 0) {
        const latestTime = chartData.allDates[chartData.allDates.length - 1];
        const updateTimeStr = `更新: ${latestTime.toLocaleTimeString()}`;
        
        ctx.fillStyle = '#666';
        ctx.font = isZoomed ? '14px Arial' : '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(updateTimeStr, canvas.width - 10, canvas.height - 10);
    }
};

ShowRealTimeValue.prototype.formatRealtimeTime = function(date) {
    const now = new Date();
    const diffMinutes = (now - date) / (1000 * 60);
    
    if (diffMinutes < 1) {
        return '先ほど';
    } else if (diffMinutes < 60) {
        return `${Math.floor(diffMinutes)}分前`;
    } else {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
};

ShowRealTimeValue.prototype.onDestroy = function() {
    this.chartMode = 'none';
    if (this.chartCanvas && this.chartCanvas.chartMode === 'realtime') {
        this.chartCanvas.chartMode = 'none';
    }

    console.log('ShowRealTimeValueスクリプトをクリーンアップする');
    
    // リアルタイム更新を停止する
    this.stopRealtimeUpdates();
    
    // イベントリスナーを削除する
    if (this.entity && this.entity.button) {
        this.entity.button.off('click', this.handleClick, this);
    }
    
    if (this.chartCanvas && this.chartCanvas.button) {
        this.chartCanvas.button.off('click', this.showRealtimeZoomedChart, this);
    }
    
    // リソースをクリーンアップする
    this.realtimeData = [];
    this.supabaseClient = null;
    this.subscription = null;

    // ハートビット停止
    if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
    }
};

ShowRealTimeValue.prototype.convertToChartData = function(data) {
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

// 補助関数：X軸表示用に時間をフォーマットする
ShowRealTimeValue.prototype.formatTimeForAxis = function(date) {
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

ShowRealTimeValue.prototype.startSimpleHeartbeat = function() {
    if (typeof this.heartbeatTimer !== 'undefined' && this.heartbeatTimer) {
        clearTimeout(this.heartbeatTimer);
    }

    const createNextHeartbeat = () => {
        const nextInterval = 55000 + Math.floor(Math.random() * 10000);

        this.heartbeatTimer = setTimeout(async () => {
            await this.sendSimpleHeartbeat();
            createNextHeartbeat();
        }, nextInterval);
        
        console.log('次回のハートビートは ' + (nextInterval/1000).toFixed(1) + ' 秒後');
    }

    this.sendSimpleHeartbeat().then(() => createNextHeartbeat());
};

ShowRealTimeValue.prototype.sendSimpleHeartbeat = async function() {
    if (!this.isRealtimeActive || !this.supabaseClient) return;

    try {
        const { error } = await this.supabaseClient
        .from(AppConfig.SUPABASE2.TABLE_NAME)
        .select('created_at')
        .limit(1);

        if (error) console.warn('[HEARTBEAT] Ping failed:', error.message);
        else console.log('[HEARTBEAT] Connection maintained via REST Ping');
    } catch (err) {
        console.error('[HEARTBEAT] Fatal error:', err);
    }
};