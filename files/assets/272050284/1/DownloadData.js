var DownloadData = pc.createScript('downloadData');

// initialize code called once per entity
DownloadData.prototype.initialize = function() {
    this.graph = this.app.root.findByName('3DUIGraph');
    this.chartCanvas = this.graph.findByName('ChartCanvas');

    // クリックイベントをバインドする
    this.entity.button.on('click', this.handleClick, this);

};

DownloadData.prototype.handleClick = async function() {
    const startDate = await GetTimeTools.getTime('開始時間を入力してください（デフォルト：1時間前）');
    const endDate = await GetTimeTools.getTime('終了時間を入力してください（デフォルト：現在）', true);

    const data = await this.fetchDataFromSupabase(startDate, endDate);
    if (data.length > 0) {
        await this.downloadDataAsCSV(data);
    }
};



DownloadData.prototype.fetchDataFromSupabase = async function(startDate, endDate) {
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
        const startTimeISO = startDate.toISOString();
        const endTimeISO = endDate.toISOString();

        const params = new URLSearchParams();
        params.append('select', 'datetime, latitude, longitude, rx_rssi');
        params.append('datetime', `gte.${startTimeISO}`);
        params.append('datetime', `lte.${endTimeISO}`);
        params.append('order', 'datetime.asc');
        params.append('limit', '10000');

        const url = `${supabaseUrl}/rest/v1/${tableName}?${params.toString()}`;
        console.log('URL:', url);

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
        console.log(`${data.length} 件のデータを正常に取得しました`);

        if (data.length === 0) {
            console.log('指定した時間範囲内にデータは見つかりませんでした');
            return [];
        }

        const result = data.map(row => {
            const dateObj = new Date(row.datetime);
            const rssiValue = parseFloat(row.rx_rssi);
            const latitude = parseFloat(row.latitude);
            const longitude = parseFloat(row.longitude);
            
            if (isNaN(dateObj.getTime()) || isNaN(rssiValue) || 
                isNaN(latitude) || isNaN(longitude)) {
                console.warn('無効なデータ行をスキップする:', row);
                return null;
            }
            
            return {
                datetime: dateObj,
                latitude: latitude,
                longitude: longitude,
                rx_rssi: rssiValue,
            };
        }).filter(item => item !== null);

        console.log(`処理後の有効データ: ${result.length} 件`);
        
        return result;

    } catch (error) {
        console.error('データ取得中に例外が発生しました:', error);
        console.error('エラースタック:', error.stack);
        return [];
    }
};

// CSVデータダウンロード関数
DownloadData.prototype.downloadDataAsCSV = async function(data) {
    if (!data || data.length === 0) {
        alert('ダウンロードするデータがありません。');
        return;
    }
    
    console.log(`📊 zipダウンロード開始: ${data.length}件のデータ`);
    
    try {
        // 1. ファイル名を生成（現在日時を含む）
        const now = new Date();
        const timestamp = 
            now.getFullYear() + 
            String(now.getMonth() + 1).padStart(2, '0') + 
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + 
            String(now.getMinutes()).padStart(2, '0') + 
            String(now.getSeconds()).padStart(2, '0');
        
        const defaultFileName = `iot_data_${timestamp}.zip`;
        
        // 2. ファイル保存ダイアログを表示
        const fileName = await this.showSaveDialog(defaultFileName);
        if (!fileName) {
            console.log('ユーザーがダウンロードをキャンセルしました。');
            return;
        }
        
        // 3. CSVデータを生成
        const csvContent = this.convertToCSV(data);
        const jsonContent = this.convertToJSON(data);

        const zip = new JSZip();
        zip.file("data.csv", csvContent);
        zip.file("data.json", jsonContent);
        
        // 4. ファイルをダウンロード
        const zipContent = await zip.generateAsync({type: "blob"});
        this.downloadFile(zipContent, fileName, 'application/zip');
        
        console.log(`ZIPファイルをダウンロードしました: ${fileName}`);
        alert(`データをZIPファイルとしてダウンロードしました。\nファイル名: ${fileName}\nデータ件数: ${data.length}件\n\n含まれるファイル:\n- data.csv\n- data.json`);
        
    } catch (error) {
        console.error('ZIPダウンロード中にエラーが発生しました:', error);
        alert('ZIPファイルのダウンロードに失敗しました。');
    }
};

// データをCSV形式に変換する関数
DownloadData.prototype.convertToCSV = function(data) {
    // ヘッダー行（日本語）
    const headers = [
        'datetime',
        'latitude',
        'longitude',
        'rssi'
    ];
    
    // データ行を生成
    const rows = data.map(item => {
        // 日時をフォーマット（YYYY-MM-DD HH:MM:SS）
        const datetimeStr = 
            item.datetime.getFullYear() + '-' +
            String(item.datetime.getMonth() + 1).padStart(2, '0') + '-' +
            String(item.datetime.getDate()).padStart(2, '0') + ' ' +
            String(item.datetime.getHours()).padStart(2, '0') + ':' +
            String(item.datetime.getMinutes()).padStart(2, '0') + ':' +
            String(item.datetime.getSeconds()).padStart(2, '0');
        
        // CSV行を生成（カンマ区切り、文字列はダブルクォートで囲む）
        return [
            `"${datetimeStr}"`,
            item.latitude.toString(),
            item.longitude.toString(),
            item.rx_rssi.toString()
        ].join(',');
    });
    
    // ヘッダーとデータを結合
    return [headers.join(','), ...rows].join('\n');
};

DownloadData.prototype.convertToJSON = function(data) {
    // JSON形式に変換
    const jsonData = data.map(item => ({
        datetime: item.datetime.toISOString(),
        latitude: item.latitude,
        longitude: item.longitude,
        rx_rssi: item.rx_rssi
    }));
    
    return JSON.stringify(jsonData, null, 2); // フォーマットされたJSON
};

// ファイル保存ダイアログを表示する関数
DownloadData.prototype.showSaveDialog = function(defaultFileName) {
    return new Promise((resolve) => {
        // ダイアログを作成
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; padding: 20px; border-radius: 8px; z-index: 1000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3); min-width: 300px;
        `;
        
        // タイトル
        const title = document.createElement('div');
        title.textContent = 'ファイル保存場所を選択';
        title.style.cssText = 'font-weight: bold; margin-bottom: 10px;';
        dialog.appendChild(title);
        
        // ファイル名入力
        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultFileName;
        input.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 15px;';
        dialog.appendChild(input);
        
        // ボタンコンテナ
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 10px;';
        
        // キャンセルボタン
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'キャンセル';
        cancelBtn.style.cssText = `
            flex: 1; padding: 10px; background: #e0e0e0; 
            border: none; border-radius: 4px; cursor: pointer;
        `;
        
        // 保存ボタン
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.style.cssText = `
            flex: 1; padding: 10px; background: #007bff; color: white;
            border: none; border-radius: 4px; cursor: pointer;
        `;
        
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(saveBtn);
        dialog.appendChild(buttonContainer);
        
        document.body.appendChild(dialog);
        input.focus();
        input.select();
        
        // オーバーレイ
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 999;
        `;
        document.body.appendChild(overlay);
        
        // クリーンアップ関数
        const cleanup = () => {
            if (dialog.parentNode) document.body.removeChild(dialog);
            if (overlay.parentNode) document.body.removeChild(overlay);
        };
        
        // 保存ボタン処理
        saveBtn.addEventListener('click', () => {
            const fileName = input.value.trim();
            if (!fileName) {
                alert('ファイル名を入力してください。');
                return;
            }
            
            // .zip拡張子がなければ追加
            const finalFileName = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`;
            cleanup();
            resolve(finalFileName);
        });
        
        // キャンセルボタン処理
        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(null);
        });
        
        // オーバーレイクリックでキャンセル
        overlay.addEventListener('click', () => {
            cleanup();
            resolve(null);
        });
        
        // ESCキー処理
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEsc);
                resolve(null);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // 30秒タイムアウト
        setTimeout(() => {
            if (document.body.contains(dialog)) {
                cleanup();
                resolve(null);
            }
        }, 30000);
    });
};

// ファイルダウンロード実行関数
DownloadData.prototype.downloadFile = function(content, fileName, mimeType) {
    // Blobを作成
    const blob = new Blob([content], { type: mimeType });
    
    // ダウンロードリンクを作成
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = 'none';
    
    // ダウンロード実行
    document.body.appendChild(link);
    link.click();
    
    // クリーンアップ
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }, 100);
};