var SettingWaterLevel = pc.createScript('settingWaterLevel');

SettingWaterLevel.prototype.initialize = function() {
    this.graph = this.app.root.findByName('3DUIGraph');
    this.chartCanvas = this.graph.findByName('ChartCanvas');
    
    // クリックイベントをバインドする
    this.bindClick();

    // グラフクリック時の拡大イベントをバインドする
    this.enableChartClickZoom();

};

SettingWaterLevel.prototype.bindClick = function() {
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

SettingWaterLevel.prototype.handleClick = async function() {
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

SettingWaterLevel.prototype.drawSimpleChart = function(data) {
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

SettingWaterLevel.prototype.enableChartClickZoom = function() {
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

SettingWaterLevel.prototype.showZoomedChart = function() {
    // 現在のデータが存在するかを確認する
    if (!this.currentChartData || this.currentChartData.length === 0) {
        alert('ボタンをクリックしてグラフ用データを生成してください。');
        return;
    }
    
    // 拡大したグラフを直接再描画する！
    this.drawZoomedChart(this.currentChartData);
};

// drawSimpleChart のロジックを再利用し、簡略化した拡大用グラフ描画関数を作成する
SettingWaterLevel.prototype.drawZoomedChart = function(data) {
    
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
    
    
    closeBtn.onclick = () => {
        document.body.removeChild(overlay);
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

// 中核となる描画ロジックを独立した関数として切り出す
SettingWaterLevel.prototype.drawChartToCanvas = function(canvas, chartData, isZoomed = false) {
    if (!chartData || chartData.length === 0) {
        console.error('描画できるデータがありません');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // 背景をクリアする
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 拡大の有無に応じてサイズを切り替える
    const margin = isZoomed ? 
        { top: 100, right: 100, bottom: 120, left: 120 } : 
        { top: 80, right: 50, bottom: 70, left: 80 };
    
    const width = canvas.width - margin.left - margin.right;
    const height = canvas.height - margin.top - margin.bottom;
    
    // 添加标题タイトルを追加する
    ctx.fillStyle = '#333';
    ctx.font = isZoomed ? 'bold 24px Arial' : 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RSSI変化', canvas.width / 2, 40);
    
    // サブタイトルを追加する
    const rssiValues = chartData.map(item => item[1]);
    const stats = StatisticsUtils.calculateAllStats(rssiValues);
    const statsText = `データ数: ${stats.count} | 平均: ${stats.avg.toFixed(2)} dBm | 標準偏差: ${stats.stdDev.toFixed(2)} dBm`;
    ctx.font = isZoomed ? '16px Arial' : '14px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(statsText, canvas.width / 2, isZoomed ? 75 : 55);
    
    // 座標軸を描画する
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    
    // Y軸
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + height);
    ctx.stroke();
    
    // X軸
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + height);
    ctx.lineTo(margin.left + width, margin.top + height);
    ctx.stroke();
    
    // データ範囲を算出する
    const yValues = chartData.map(p => p[1]);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const rangeY = maxY - minY || 1;
    
    // 時間範囲を算出する
    const timeValues = chartData.map(p => p[0].getTime());
    const minTime = Math.min(...timeValues);
    const maxTime = Math.max(...timeValues);
    const rangeTime = maxTime - minTime || 1;
    
    // グリッド線を描画する
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    // Y軸のグリッド線
    const yGridLines = isZoomed ? 15 : 10;
    for (let i = 0; i <= yGridLines; i++) {
        const y = margin.top + height - (i / yGridLines) * height;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + width, y);
        ctx.stroke();
        
        // Y軸の目盛りラベル
        ctx.fillStyle = '#666';
        ctx.font = isZoomed ? '14px Arial' : '12px Arial';
        ctx.textAlign = 'right';
        const value = minY + (i / yGridLines) * rangeY;
        const labelX = margin.left - (isZoomed ? 15 : 10);
        ctx.fillText(value.toFixed(isZoomed ? 2 : 1), labelX, y + 4);
    }
    
    // X軸のグリッド線
    const xGridLines = Math.min(isZoomed ? 15 : 10, chartData.length - 1);
    for (let i = 0; i <= xGridLines; i++) {
        const x = margin.left + (i / xGridLines) * width;
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, margin.top + height);
        ctx.stroke();
        
        // X軸の目盛りラベル
        if (chartData.length > 0) {
            const index = Math.floor((i / xGridLines) * (chartData.length - 1));
            if (index < chartData.length) {
                const time = chartData[index][0];
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
    
    // 折れ線を描画する
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = isZoomed ? 4 : 3;
    ctx.beginPath();
    
    for (let i = 0; i < chartData.length; i++) {
        const timeRatio = (chartData[i][0].getTime() - minTime) / rangeTime;
        const x = margin.left + timeRatio * width;
        const y = margin.top + height - ((chartData[i][1] - minY) / rangeY) * height;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // データポイントを描画する
    if (chartData.length <= (isZoomed ? 100 : 50)) {
        ctx.fillStyle = '#FF5722';
        for (let i = 0; i < chartData.length; i++) {
            const timeRatio = (chartData[i][0].getTime() - minTime) / rangeTime;
            const x = margin.left + timeRatio * width;
            const y = margin.top + height - ((chartData[i][1] - minY) / rangeY) * height;
            
            // データポイントを描画する
            ctx.beginPath();
            ctx.arc(x, y, isZoomed ? 8 : 6, 0, Math.PI * 2);
            ctx.fill();
            
            // 白色の枠線を描画する
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 拡大表示したグラフに数値ラベルを追加する
            if (isZoomed && i % Math.ceil(chartData.length / 20) === 0) {
                ctx.fillStyle = '#333';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(chartData[i][1].toFixed(2), x, y - 12);
            }
        }
    }
    
    // 軸ラベルを追加する
    ctx.fillStyle = '#333';
    ctx.font = isZoomed ? 'bold 18px Arial' : 'bold 16px Arial';
    ctx.textAlign = 'center';
    
    // X軸ラベル
    ctx.fillText('Time', canvas.width / 2, canvas.height - (isZoomed ? 30 : 20));
    
    // Y軸ラベル
    ctx.save();
    ctx.translate(isZoomed ? 40 : 30, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('RSSI in dBm', 0, 0);
    ctx.restore();
    
};

// 補助関数：X軸表示用に時間をフォーマットする
SettingWaterLevel.prototype.formatTimeForAxis = function(date) {
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
SettingWaterLevel.prototype.onDestroy = function() {
    if (this.entity.button) {
        this.entity.button.off('click', this.handleClick, this);
    }
};

SettingWaterLevel.prototype.fetchDataFromSupabase = async function(startDate, endDate) {
    const supabaseUrl = AppConfig.SUPABASE1.URL;
    const apiKey = AppConfig.SUPABASE1.API_KEY;
    const tableName = AppConfig.SUPABASE1.TABLE_NAME;

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
        params.append('select', 'datetime,rx_rssi');
        params.append('datetime', `gte.${startTimeISO}`);
        params.append('datetime', `lte.${endTimeISO}`);
        params.append('order', 'datetime.asc');
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

        // 4. 二次元配列形式に変換する
        const result = data.map(row => {
            // datetime が有効であることを確認する
            const dateObj = new Date(row.datetime);
            
            // rx_rssi が数値であることを確認する
            const rssiValue = parseFloat(row.rx_rssi);
            
            // 無効なデータをスキップする
            if (isNaN(dateObj.getTime()) || isNaN(rssiValue)) {
                console.warn('無効なデータをスキップする:', row);
                return null;
            }
            
            return [dateObj, rssiValue];
        }).filter(item => item !== null);
        
        console.log(`処理後の有効データ: ${result.length} 件`);

        // 5. データサンプルを表示する
        if (result.length > 0) {
            console.log('1件目のデータ:', {
                datetime: result[0][0],
                rx_rssi: result[0][1]
            });
            
            if (result.length > 1) {
                console.log('最後のデータ:', {
                    datetime: result[result.length - 1][0],
                    rx_rssi: result[result.length - 1][1]
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