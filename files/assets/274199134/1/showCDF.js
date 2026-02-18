var ShowCDF = pc.createScript('showCDF');

// initialize code called once per entity
ShowCDF.prototype.initialize = function() {
    this.graph = this.app.root.findByName('3DUIGraph_temp');
    this.chartCanvas = this.graph.findByName('ChartCanvas_temp');

    // chartCanvas に状態マーカーがあることを確認する
    if (this.chartCanvas) {
        // chartMode を初期化する、または既存の状態を保持する
        if (!this.chartCanvas.chartMode) {
            this.chartCanvas.chartMode = 'none'; // 'none', 'historical', 'cdf'
        }
    }

    // クリックイベントをバインドする
    this.bindClick();

    // グラフクリック時の拡大イベントをバインドする
    this.enableChartClickZoom();

    this.cdfData = null;
};

ShowCDF.prototype.bindClick = function() {
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

ShowCDF.prototype.handleClick = async function() {
    try {
        // 日付選択ダイアログを表示
        //const dateSelection = await this.showDateSelectionDialog();
        const startDate = await GetTimeTools.getTime('開始時間を入力してください（デフォルト：1時間前）');
        const endDate = await GetTimeTools.getTime('終了時間を入力してください（デフォルト：現在）', true);

        if (startDate >= endDate) {
            alert('開始日時は終了日時より前にしてください。');
            return;
        }

        const data = await this.fetchDataFromSupabase(startDate, endDate);

        if (data.length > 0) {
            // CDFデータを計算
            this.cdfData = this.calculateCDFData(data);
            this.drawCDFChart(this.cdfData);
        }
        
    } catch (error) {
        console.log('操作に失敗しました:', error.message);
    }
};

ShowCDF.prototype.drawCDFChart = function(cdfData) {
    // グラフモードを更新する
    if (this.chartCanvas) {
        this.chartCanvas.chartMode = 'cdf';
    }

    // 拡大用データを保存する
    this.currentCDFData = cdfData;
    
    // Canvas を作成する
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    
    // 抽出した関数を用いて描画する
    this.drawCDFChartToCanvas(canvas, cdfData, false);
    
    // テクスチャを作成し、ChartCanvas に適用する
    const texture = new pc.Texture(this.app.graphicsDevice, {
        width: 800,
        height: 500,
        format: pc.PIXELFORMAT_R8_G8_B8_A8
    });
    
    texture.setSource(canvas);
    this.chartCanvas.element.texture = texture;
    
    console.log('CDFグラフの描画が完了し、データは保存されました');
};

ShowCDF.prototype.enableChartClickZoom = function() {
    const tryBind = () => {
        if (this.chartCanvas && this.chartCanvas.button) {
            // 既存の可能性がある古いリスナーを削除する
            this.chartCanvas.button.off('click', this.showCDFZoomedChart, this);
            // 新しいリスナーを追加する
            this.chartCanvas.button.on('click', this.showCDFZoomedChart, this);
        } else {
            setTimeout(tryBind, 100);
        }
    };
    tryBind();
};

ShowCDF.prototype.showCDFZoomedChart = function() {
    const currentMode = this.chartCanvas.chartMode || 'none';

    if (currentMode !== 'cdf') {
        console.log('現在はCDFモードではないため、CDFグラフの拡大表示をスキップします');
        return;
    }

    // 現在のデータが存在するかを確認する
    if (!this.currentCDFData) {
        alert('ボタンをクリックしてCDFグラフ用データを生成してください。');
        return;
    }
    
    // 拡大したグラフを直接再描画する！
    this.drawCDFZoomedChart(this.currentCDFData);
};

ShowCDF.prototype.drawCDFZoomedChart = function(cdfData) {
    // 1. 全画面のオーバーレイを作成する
    const overlay = document.createElement('div');
    overlay.id = 'cdf-chart-zoom-overlay';
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
    
    // 4. drawCDFChart の中核ロジックを再利用して、Canvas に描画する
    this.drawCDFChartToCanvas(canvas, cdfData, true); // true の場合、拡大版であることを示す
    
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
    
    // 7. オーバーレイをクリックして閉じる（showStateTemp.jsと同じ方法）
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });

    // 8. コンテナ内のクリックイベントがオーバーレイに伝播しないようにする
    container.addEventListener('click', (e) => {
        e.stopPropagation();
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

ShowCDF.prototype.calculateCDFData = function(data) {
    // 元のデータからCDF用データを計算する
    const tempValues = [];
    const humiValues = [];
    const pressureValues = [];
    
    data.forEach(item => {
        const temp = item[1];
        const humi = item[2];
        const pressure = item[3];
        
        if (!isNaN(temp)) tempValues.push(temp);
        if (!isNaN(humi)) humiValues.push(humi);
        if (!isNaN(pressure)) pressureValues.push(pressure);
    });
    
    // CDFデータを準備
    const tempCDF = StatisticsUtils.prepareCDFForChart(tempValues, 100);
    const humiCDF = StatisticsUtils.prepareCDFForChart(humiValues, 100);
    const pressureCDF = StatisticsUtils.prepareCDFForChart(pressureValues, 100);
    
    // 統計情報を計算 - calculateAllStats は median を含まないため、calculateCDFSummary を使用
    const tempStats = StatisticsUtils.calculateCDFSummary(tempValues);
    const humiStats = StatisticsUtils.calculateCDFSummary(humiValues);
    const pressureStats = StatisticsUtils.calculateCDFSummary(pressureValues);
    
    return {
        temp: tempCDF,
        humi: humiCDF,
        pressure: pressureCDF,
        tempStats: tempStats,
        humiStats: humiStats,
        pressureStats: pressureStats,
        dataCount: data.length
    };
};

ShowCDF.prototype.drawCDFChartToCanvas = function(canvas, cdfData, isZoomed = false) {
    if (!cdfData) {
        console.error('描画できるCDFデータがありません');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // 背景をクリアする
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // サブプロットの設定
    const subplotCount = 3;
    const subplotHeight = Math.floor((canvas.height - 120) / subplotCount);
    const margin = isZoomed ? 
        { top: 100, right: 120, bottom: 120, left: 120 } :
        { top: 80, right: 80, bottom: 70, left: 80 };
    
    const plotWidth = canvas.width - margin.left - margin.right;
    
    // タイトルを追加する
    ctx.fillStyle = '#333';
    ctx.font = isZoomed ? 'bold 24px Arial' : 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('松本キャンパス環境データ（確率分布）', canvas.width / 2, 30);
    
    // 統計情報を追加する - calculateCDFSummary を使用
    const statsText1 = `データ数: ${cdfData.dataCount} | 期間内平均: 温度 ${cdfData.tempStats.mean.toFixed(1)}°C | 湿度 ${cdfData.humiStats.mean.toFixed(1)}% | 気圧 ${cdfData.pressureStats.mean.toFixed(1)}hPa`;
    const statsText2 = `期間内標準偏差: 温度 ${cdfData.tempStats.stdDev.toFixed(1)}°C | 湿度 ${cdfData.humiStats.stdDev.toFixed(1)}% | 気圧 ${cdfData.pressureStats.stdDev.toFixed(1)}hPa`;
    ctx.font = isZoomed ? '16px Arial' : '14px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText(statsText1, canvas.width / 2, isZoomed ? 55 : 55);
    ctx.fillText(statsText2, canvas.width / 2, isZoomed ? 80 : 75);
    
    // 各パラメータのCDFを描画
    this.drawCDFSubplot(ctx, 0, '温度（°C）', cdfData.temp, cdfData.tempStats, 
                       margin, plotWidth, subplotHeight, isZoomed);
    
    this.drawCDFSubplot(ctx, 1, '湿度（%）', cdfData.humi, cdfData.humiStats,
                       margin, plotWidth, subplotHeight, isZoomed);
    
    this.drawCDFSubplot(ctx, 2, '気圧（hPa）', cdfData.pressure, cdfData.pressureStats,
                       margin, plotWidth, subplotHeight, isZoomed);
    
    // 凡例を追加する
    this.drawCDFLegend(ctx, canvas, margin, plotWidth, subplotHeight, isZoomed);
    
    // 右側の空白部分に垂直な図例を追加
    this.drawVerticalLegend(ctx, canvas, margin, plotWidth, isZoomed);
};

ShowCDF.prototype.drawVerticalLegend = function(ctx, canvas, margin, plotWidth, isZoomed) {
    const legendX = margin.left + plotWidth + (isZoomed ? 30 : 20);
    const legendY = margin.top + 50;
    
    const quantileLabels = ['第1四分位数', '中央値', '第3四分位数'];
    const quantileColors = ['#FF9800', '#F44336', '#9C27B0'];
    const quantilePercentages = ['(25%)', '(50%)', '(75%)'];
    
    // 図例のタイトル
    ctx.fillStyle = '#333';
    ctx.font = isZoomed ? 'bold 14px Arial' : 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('分位点:', legendX, legendY);
    
    // 各分位点の図例
    quantileLabels.forEach((label, index) => {
        const y = legendY + (index + 1) * (isZoomed ? 35 : 30);
        
        // 色付きのマーカー
        ctx.fillStyle = quantileColors[index];
        ctx.beginPath();
        ctx.arc(legendX, y - 8, isZoomed ? 7 : 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // ラベル
        ctx.fillStyle = '#333';
        ctx.font = isZoomed ? '12px Arial' : '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(label, legendX + 15, y);
        
        // パーセンテージ
        ctx.fillStyle = '#666';
        ctx.font = isZoomed ? '11px Arial' : '9px Arial';
        ctx.fillText(quantilePercentages[index], legendX + 15, y + (isZoomed ? 15 : 12));
    });
};

ShowCDF.prototype.drawCDFSubplot = function(ctx, index, title, cdfPoints, stats, 
                                           margin, plotWidth, plotHeight, isZoomed) {
    const yOffset = margin.top + index * plotHeight;
    
    // サブプロットの枠を描画
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin.left, yOffset, plotWidth, plotHeight);
    
    // タイトル
    /*
    ctx.fillStyle = '#333';
    ctx.font = isZoomed ? 'bold 16px Arial' : 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(title, margin.left, yOffset - 5);
    */
    
    // 統計情報 - calculateCDFSummary のプロパティを使用
    const statsText = `中央値:${stats.median.toFixed(1)}`;
    ctx.font = isZoomed ? '12px Arial' : '10px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(statsText, margin.left + plotWidth - 150, yOffset - 5);
    
    if (cdfPoints.length < 2) return;
    
    // 値の範囲を計算
    const values = cdfPoints.map(point => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    
    // X軸を描画
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, yOffset + plotHeight);
    ctx.lineTo(margin.left + plotWidth, yOffset + plotHeight);
    ctx.stroke();
    
    // Y軸を描画
    ctx.beginPath();
    ctx.moveTo(margin.left, yOffset);
    ctx.lineTo(margin.left, yOffset + plotHeight);
    ctx.stroke();
    
    // グリッド線を描画
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    // X軸グリッド
    for (let i = 0; i <= 5; i++) {
        const x = margin.left + (i / 5) * plotWidth;
        ctx.beginPath();
        ctx.moveTo(x, yOffset);
        ctx.lineTo(x, yOffset + plotHeight);
        ctx.stroke();
        
        // X軸ラベル
        const value = minValue + (i / 5) * valueRange;
        ctx.fillStyle = '#666';
        ctx.font = isZoomed ? '12px Arial' : '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value.toFixed(1), x, yOffset + plotHeight + 15);
    }
    
    // Y軸グリッド
    for (let i = 0; i <= 5; i++) {
        const y = yOffset + plotHeight - (i / 5) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + plotWidth, y);
        ctx.stroke();
        
        // Y軸ラベル
        const probability = i / 5;
        ctx.fillStyle = '#666';
        ctx.font = isZoomed ? '12px Arial' : '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(probability.toFixed(1), margin.left - 5, y + 4);
    }
    
    // Y軸ラベル
    ctx.save();
    ctx.translate(margin.left - 60, yOffset + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#333';
    ctx.font = isZoomed ? '14px Arial' : '12px Arial';
    ctx.textAlign = 'center';

    // 各サブプロットに応じたラベルを設定
    let parameterLabel = '';
    if (index === 0) {
        parameterLabel = '温度（°C）累積確率';
    } else if (index === 1) {
        parameterLabel = '湿度（%）累積確率';
    } else if (index === 2) {
        parameterLabel = '気圧（hPa）累積確率';
    }

    // ラベルを描画
    ctx.fillText(parameterLabel, 0, 0);
    ctx.restore();
    
    // CDF曲線を描画
    ctx.strokeStyle = this.getColorByIndex(index);
    ctx.lineWidth = isZoomed ? 3 : 2;
    ctx.beginPath();
    
    for (let i = 0; i < cdfPoints.length; i++) {
        const x = margin.left + ((cdfPoints[i].value - minValue) / valueRange) * plotWidth;
        const y = yOffset + plotHeight - (cdfPoints[i].probability * plotHeight);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // 分位点を描画
    const quantiles = [0.25, 0.5, 0.75];
    const quantileColors = ['#FF9800', '#F44336', '#9C27B0'];
    
    quantiles.forEach((q, qIndex) => {
        const quantileValue = StatisticsUtils.calculateQuantile(values, q);
        const x = margin.left + ((quantileValue - minValue) / valueRange) * plotWidth;
        const y = yOffset + plotHeight - (q * plotHeight);
        
        ctx.fillStyle = quantileColors[qIndex];
        ctx.beginPath();
        ctx.arc(x, y, isZoomed ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
};

ShowCDF.prototype.getColorByIndex = function(index) {
    const colors = ['#FF5722', '#2196F3', '#4CAF50'];
    return colors[index % colors.length];
};

ShowCDF.prototype.drawCDFLegend = function(ctx, canvas, margin, plotWidth, subplotHeight, isZoomed) {
    const legendX = margin.left + plotWidth - 300;
    const legendY = margin.top + 3 * subplotHeight + 40;
    
    const quantileLabels = ['第1四分位数 (Q1)', '中央値 (Q2)', '第3四分位数 (Q3)'];
    const quantileColors = ['#FF9800', '#F44336', '#9C27B0'];
    
    quantileLabels.forEach((label, index) => {
        const x = legendX + index * 150;
        
        ctx.fillStyle = quantileColors[index];
        ctx.beginPath();
        ctx.arc(x, legendY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#333';
        ctx.font = isZoomed ? '12px Arial' : '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 10, legendY + 4);
    });
};

ShowCDF.prototype.fetchDataFromSupabase = async function(startDate, endDate) {
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
            
            // 無効なデータをスキップする
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
        console.error('エラースタック:', error.stack);
        return [];
    }
};

// イベントリスナーをクリア
ShowCDF.prototype.onDestroy = function() {
    if (this.entity.button) {
        this.entity.button.off('click', this.handleClick, this);
    }
    
    // 拡大グラフのオーバーレイがあれば削除
    const overlay = document.getElementById('cdf-chart-zoom-overlay');
    if (overlay && document.body.contains(overlay)) {
        // ESCキーハンドラーを削除
        if (overlay._escHandler) {
            document.removeEventListener('keydown', overlay._escHandler);
        }
        document.body.removeChild(overlay);
    }
};