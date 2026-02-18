// 定義
const metricSelect = document.getElementById('metric');
const calFunctionSelect = document.getElementById('calFunction');
const durationSelect = document.getElementById('duration');
const startInput = document.getElementById('start');
const endInput = document.getElementById('end');
const loadBtn = document.getElementById('load');
const resetBtn = document.getElementById('reset');
const info = document.getElementById('information');
const staInfo = document.getElementById('statisticsInfo');

const uiControls = [
  metricSelect,
  calFunctionSelect,
  durationSelect,
  startInput,
  endInput,
  loadBtn,
  resetBtn
];

// 日時を初期化
const now = new Date();
const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
const formatToLocalTime = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
};
if (startInput && endInput) {
    startInput.value = formatToLocalTime(oneHourAgo);
    endInput.value = formatToLocalTime(now);
}

let realtimeData = [];
let isRealtimeActive = false;
let supabaseClient = null;
let subscription = null;
let heartbeatTimer = null;
const MAX_REALTIME_POINTS = 20;
// 定義完了




// ユーザ制御
enableInterface();
// ドロップダウンの変更を監視する
updateDateInputState();
durationSelect.addEventListener('change', updateDateInputState);
updateCalFunctionState();
calFunctionSelect.addEventListener('change', () => {
  if (calFunctionSelect.value === 'realTime') {
    updateCalFunctionState();
  } else {
    durationSelect.disabled = false;
    durationSelect.classList.toggle('opacity-50', false);
    updateDateInputState();
  }
});
info.textContent = '[INFO] Initialization complete.';




// ロードボタンがアクティブになった後
loadBtn.onclick = async () => {
  setUIEnabled(false);
  const btnText = document.getElementById('btn-text');
  const spinner = document.getElementById('spinner');
  if (btnText && spinner) {
    btnText.classList.add('invisible');
    spinner.classList.remove('hidden');
    spinner.classList.add('flex');
  }
  try {
    await analyzeData(metricSelect.value, calFunctionSelect.value, durationSelect.value, startInput.value, endInput.value);
    setResetUIEnabled(true);
  } catch (err) {
    info.textContent = '[INFO] Execution failed: ' + err.message;
  } finally {
    setResetUIEnabled(true);
    if (btnText && spinner) {
      btnText.classList.remove('invisible');
      spinner.classList.add('hidden');
      spinner.classList.remove('flex');
    }
  };
}



// リセットボタンがアクティブになった後
resetBtn.onclick = () => {
  if (window.myChartInstance) {
    window.myChartInstance.destroy();
    window.myChartInstance = null; 
  }

  stopRealtimeUpdates();

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
  startInput.value = formatToLocalTime(oneHourAgo);
  endInput.value = formatToLocalTime(now);
  durationSelect.value = "fixable";
  setUIEnabled(true);
  updateDateInputState();
  updateCalFunctionState();
  staInfo.innerHTML = '';
  info.textContent = '[INFO] Reset complete.';
}







/////////////////
// subFunctions
/////////////////
function updateDateInputState() {
  const mode = durationSelect.value
  const isFixable = mode === 'fixable'

  startInput.disabled = !isFixable
  endInput.disabled = !isFixable

  startInput.classList.toggle('opacity-50', !isFixable)
  endInput.classList.toggle('opacity-50', !isFixable)
}


function updateCalFunctionState() {
  const calFunction = calFunctionSelect.value;
  const isRealtime = calFunction === 'realTime';

  durationSelect.disabled = isRealtime;
  startInput.disabled = isRealtime;
  endInput.disabled = isRealtime;

  durationSelect.classList.toggle('opacity-50', isRealtime);
  startInput.classList.toggle('opacity-50', isRealtime);
  endInput.classList.toggle('opacity-50', isRealtime);
}


function setUIEnabled(enabled) {
  uiControls.forEach(el => {
    el.disabled = !enabled;
    el.classList.toggle('opacity-50', !enabled);
    el.classList.toggle('cursor-not-allowed', !enabled);
  })
}


function setResetUIEnabled(enabled) {
  resetBtn.disabled = !enabled;
  resetBtn.classList.toggle('opacity-50', !enabled);
  resetBtn.classList.toggle('cursor-not-allowed', !enabled);
}


async function analyzeData(metric, calFunction, duration, start, end) {

  if (metric === "temperature" || metric === "humidity" || metric === "pressure") {
    if (calFunction === "timeSeries" || calFunction === "dis_CDF") {
      const data = await supabase2Data(metric, duration, start, end);
      if (data && data.length > 0) {
        if (calFunction === "timeSeries") {
          drawChart(metric, data);
          info.textContent = '[INFO] Execution successful.';
        } else if (calFunction === "dis_CDF") {
          const cdfResult = calculateCDFData(data);
          if (cdfResult && cdfResult.temp.length > 0) {
            drawCDFChart(metric, cdfResult.temp);
            updateCDFStatistics(cdfResult.tempStats);
            info.textContent = '[INFO] Execution successful.';
          }
        }
      } else {
        if (window.myChartInstance) window.myChartInstance.destroy();
        info.textContent = "[INFO] No data within the specified range.";
      }
    } else if (calFunction === "realTime") {
      await startRealtimeUpdates(metric);
      info.textContent = '[INFO] Execution successful.';
    }
  }

  if (metric === "rssi") {
    if (calFunction === "timeSeries" || calFunction === "dis_CDF") {
      const data = await supabase2Data(metric, duration, start, end);
      if (data && data.length > 0) {
        if (calFunction === "timeSeries") {
          drawChart(metric, data);
          info.textContent = '[INFO] Execution successful.';
        } else if (calFunction === "dis_CDF") {
          const cdfResult = calculateCDFData(data);
          if (cdfResult && cdfResult.temp.length > 0) {
            drawCDFChart(metric, cdfResult.temp);
            updateCDFStatistics(cdfResult.tempStats);
            info.textContent = '[INFO] Execution successful.';
          }
        }
      } else {
        if (window.myChartInstance) window.myChartInstance.destroy();
        info.textContent = "[INFO] No data within the specified range.";
      }
    } else if (calFunction === "realTime") {
      //未実装
      await startRealtimeUpdates(metric);
      //await new Promise(resolve => setTimeout(resolve, 3000));
      info.textContent = "[INFO] In development.";
    }
  }

  if (metric === "rainfall" || metric === "waterLevel") {
    await new Promise(resolve => setTimeout(resolve, 3000));
    info.textContent = "[INFO] In development.";
  }
  return "分析完了";
}


async function supabase2Data(metric, duration, start, end) {
  let supabaseUrl = null;
  let apiKey = null;
  let tableName = null;
  if (metric === "rssi") {
    supabaseUrl = AppConfig.SUPABASE1.URL;
    apiKey = AppConfig.SUPABASE1.API_KEY;
    tableName = AppConfig.SUPABASE1.TABLE_NAME;
  } else if (metric === "temperature" || metric === "humidity" || metric === "pressure") {
    supabaseUrl = AppConfig.SUPABASE2.URL;
    apiKey = AppConfig.SUPABASE2.API_KEY;
    tableName = AppConfig.SUPABASE2.TABLE_NAME;
  }
  
  let startDate;
  let endDate;
  if (duration === "fixable") {
    startDate = new Date(start);
    endDate = new Date(end);
  } else if (duration === "oneDay") {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    startDate = oneDayAgo;
    endDate = now;
  } else if (duration === "oneWeek") {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    startDate = oneWeekAgo;
    endDate = now;
  } else if (duration === "oneMonth") {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - (4 * 7 * 24 * 60 * 60 * 1000));
    startDate = oneMonthAgo;
    endDate = now;
  }

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
    if (metric == "rssi") {
      params.append('select', 'datetime,rx_rssi');
      params.append('datetime', `gte.${startTimeISO}`);
      params.append('datetime', `lte.${endTimeISO}`);
      if (duration === "fixable") {
        params.append('order', 'datetime.asc');
      } else {
        params.append('order', 'datetime.desc');
      }
    } else if (metric === "temperature") {
      params.append('select', 'created_at, temp');
      params.append('created_at', `gte.${startTimeISO}`);
      params.append('created_at', `lte.${endTimeISO}`);
      if (duration === "fixable") {
        params.append('order', 'created_at.asc');
      } else {
        params.append('order', 'created_at.desc');
      }
    } else if (metric == "humidity") {
      params.append('select', 'created_at, humi');
      params.append('created_at', `gte.${startTimeISO}`);
      params.append('created_at', `lte.${endTimeISO}`);
      if (duration === "fixable") {
        params.append('order', 'created_at.asc');
      } else {
        params.append('order', 'created_at.desc');
      }
    } else if (metric == "pressure") {
      params.append('select', 'created_at, pressure');
      params.append('created_at', `gte.${startTimeISO}`);
      params.append('created_at', `lte.${endTimeISO}`);
      if (duration === "fixable") {
        params.append('order', 'created_at.asc');
      } else {
        params.append('order', 'created_at.desc');
      }
    }
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
      let dateObj = null;
      if (metric == "rssi") {
        dateObj = new Date(row.datetime);
      } else if (metric === "temperature" || metric === "humidity" || metric === "pressure") {
        dateObj = new Date(row.created_at);
      }
        
      // パラメータはすべて数値型である
      let targetValue;
      if (metric == "temperature") {
        targetValue = parseFloat(row.temp);
      } else if (metric == "humidity") {
        targetValue = parseFloat(row.humi);
      } else if (metric == "pressure") {
        targetValue = parseFloat(row.pressure);
      } else if (metric == "rssi") {
        targetValue = parseFloat(row.rx_rssi);
      }
        
      // 无効なデータをスキップする
      if (isNaN(dateObj.getTime()) || isNaN(targetValue)) {
          console.warn('無効なデータをスキップする:', row);
          return null;
      }
        
      return [dateObj, targetValue];
    }).filter(item => item !== null);

    console.log(`処理後の有効データ: ${result.length} 件`);
    return result;

  } catch (error) {
    console.error('データ取得中に例外が発生しました:', error);
    console.error('エラースタッ:', error.stack);
    return [];
  }
}


/**
 * Chart.js を使用して折れ線グラフを描画します
 * @param {string} label - データのラベル（例：温度、湿度）
 * @param {Array} rawData - 形式：[[日付, 値], ...] の配列
 */
function drawChart(label, rawData) {
  if (label === "temperature") {
    label = "温度 (°C)";
  } else if (label === "humidity") {
    label = "湿度 (%)";
  } else if (label === "pressure") {
    label = "気圧 (hPa)";
  } else if (label === "rssi") {
    label = "受信電力 (dBm)";
  }

  const chartPoints = rawData.map(d => ({
    x: d[0],
    y: d[1]
  }));

  // 2. HTML内のCanvas要素を取得する
  const ctx = document.getElementById('myChart').getContext('2d');

  // 3. 古いチャートインスタンスを破棄します（重要：ロードを複数回クリックした後のチャートの重複やホバーエラーを防ぐため）
  if (window.myChartInstance) {
    window.myChartInstance.destroy();
  }

  // 4. 新しいチャートを作成します
  window.myChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: label,
        data: chartPoints,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 5,
        tension: 0.2,           // 曲線の滑らかさ
        fill: true              // 面積塗りつぶしを有効にする
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // .chart-container の高さに適合させる
      interaction: {
        intersect: false,
        mode: 'index',
      },
      scales: {
        x: {
          type: 'time', // chartjs-adapter-date-fns が読み込まれていることを必ず確認してください
          time: {
            displayFormats: {
              minute: 'HH:mm',
              hour: 'MM/dd HH:mm',
              day: 'MM/dd'
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          title: {
            display: true,
            text: '時間',
            color: '#94a3b8'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          title: {
            display: true,
            text: label,
            color: '#94a3b8'
          },
          beginAtZero: false,
        }
      },
      plugins: {
        zoom: {
          limits: {
            y: {
              min: 'original', // ズームを許可する最小値。「original」は初期表示時の最小値を意味します
              max: 'original', // ズームを許可する最大値
            }
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'y',
            scaleMode: 'y',
            speed: 0.01
          },
          pan: {
            enabled: true,       // パン（移動）を許可する
            mode: 'y',           // 垂直方向のパンのみ許可する
          }
        },
        legend: {
          labels: { color: '#f1f5f9' }
        },
        tooltip: {
          enabled: true,
          backgroundColor: '#1e293b',
          titleColor: '#f1f5f9',
          bodyColor: '#f1f5f9'
        }
      }
    }
  });

  const yValues = rawData.map(d => d[1]);
  const tempStats = StatisticsUtils.calculateAllStats(yValues);
  updateStatistics(tempStats);
}


function calculateCDFData(data) {
  const yValues = [];
  data.forEach(item => {
      const temp = item[1];
      if (!isNaN(temp)) yValues.push(temp);
  });
  const tempCDF = StatisticsUtils.prepareCDFForChart(yValues, 100);
  const tempStats = StatisticsUtils.calculateCDFSummary(yValues);
  return {
    temp: tempCDF,
    tempStats: tempStats,
    dataCount: data.length
  }
}


/**
 * 累積確率分布図 (CDF) を描画します
 * @param {string} metric - 測定指標（例：「temperature」、「humidity」）
 * @param {Array} cdfData - 形式：[{value: 16.1, probability: 0.08}, ...] の配列
 */
function drawCDFChart(metric, cdfData) {
  const ctx = document.getElementById('myChart').getContext('2d');

  // 1. 古いチャートインスタンスを破棄します（重複防止）
  if (window.myChartInstance) {
    window.myChartInstance.destroy();
  }

  // 2. メトリック定義に基づいてX軸ラベルを設定します
  const labels = {
    'temperature': '温度 (°C)',
    'humidity': '湿度 (%)',
    'pressure': '気圧 (hPa)',
    'rainfall': '雨量 (mm)',
    'waterLevel': '水位 (m)',
    'rssi': '受信電力 (dBm)'
  };
  const xTitle = labels[metric] || '測定値';

  // 3. コアデータマッピング：データを Chart.js が必要とする {x, y} 形式に変換します
  const chartPoints = cdfData.map(d => ({
    x: d.value,
    y: d.probability
  }));

  // 4. 新しいチャートを作成します
  window.myChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: `累積確率分布 (CDF): ${xTitle}`,
        data: chartPoints,
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        stepped: true,                // 【重要】CDFグラフは階段状である必要があります
        fill: true,                   // 下部領域を塗りつぶします
        tension: 0                    // 曲線の平滑化を無効にする
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          title: { display: true, text: xTitle, color: '#94a3b8' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          min: 0,
          max: 1,
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          title: { display: true, text: '累積確率', color: '#94a3b8' },
          ticks: { 
              color: '#94a3b8',
              stepSize: 0.1
          }
        }
      },
      plugins: {
        zoom: {
          limits: {
            x: {
              min: 'original',
              max: 'original',
            }
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
            scaleMode: 'x',
            speed: 0.01
          },
          pan: {
            enabled: true,
            mode: 'x'
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          callbacks: {
            label: function(context) {
              const val = context.parsed.x;
              const prob = (context.parsed.y * 100).toFixed(1);
              return ` 値: ${val} | 累積確率: ${prob}%`;
            }
          }
        },
        legend: {
          labels: { color: '#f1f5f9' }
        }
      }
    }
  });
}


/**
 * CDF統計情報のUI表示を更新する
 * @param {Object} stats - count、mean、median、stdDev、min、max などのプロパティを含むオブジェクト
 */
function updateCDFStatistics(stats) {
  if (!staInfo) return;

  staInfo.innerHTML = `
    <div class="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
      <h3 class="text-cyan-400 font-bold text-lg mb-3 flex items-center">
        <span class="mr-2">📈</span> CDF 統計データ
      </h3>
      
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">サンプル数</span>
          <span class="text-xl font-semibold text-slate-200">${stats.count}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">平均値</span>
          <span class="text-xl font-semibold text-slate-200">${stats.mean.toFixed(2)}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">中央値 (P50)</span>
          <span class="text-xl font-semibold text-slate-200">${stats.median.toFixed(2)}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">標準偏差</span>
          <span class="text-xl font-semibold text-slate-200">${stats.stdDev.toFixed(4)}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">最小値</span>
          <span class="text-xl font-semibold text-slate-200">${stats.min}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">最大値</span>
          <span class="text-xl font-semibold text-slate-200">${stats.max}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">第1四分位数</span>
          <span class="text-xl font-semibold text-slate-200">${stats.q1}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">第3四分位数</span>
          <span class="text-xl font-semibold text-slate-200">${stats.q3}</span>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-slate-700/50">
        <p class="text-xs text-slate-500 leading-relaxed">
          注: 中央値は累積確率が50%に達する地点の数値です。標準偏差が小さいほど、データは平均値付近に集中しています。<br>
          注: 第1四分位数はデータを小さい順に並べたとき、下位（小さい方）から25%の位置にくる値のことです。<br>
          注: 第3四分位数はデータを小さい順に並べたとき、下位（小さい方）から75%の位置にくる値のことです。
        </p>
      </div>
    </div>
  `;
}


/**
 * 期間内統計データのUI表示を更新します（既存の統計変数名に適合）
 * @param {Object} tempStats - count、avg、variance、stdDev、min、max などのプロパティを含むオブジェクト
 */
function updateStatistics(tempStats) {
  if (!staInfo) return;
  staInfo.innerHTML = `
    <div class="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
      <h3 class="text-cyan-400 font-bold text-lg mb-3 flex items-center">
        <span class="mr-2">📊</span> 期間内統計データ
      </h3>
      
      <div class="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">データ数</span>
          <span class="text-xl font-semibold text-slate-200">${tempStats.count}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">平均値</span>
          <span class="text-xl font-semibold text-slate-200">${tempStats.avg.toFixed(3)}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">分散</span>
          <span class="text-xl font-semibold text-slate-200">${tempStats.variance.toFixed(3)}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">標準偏差</span>
          <span class="text-xl font-semibold text-slate-200">${tempStats.stdDev.toFixed(3)}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">最小値</span>
          <span class="text-xl font-semibold text-slate-200">${tempStats.min}</span>
        </div>

        <div class="flex flex-col">
          <span class="text-xs text-slate-500 uppercase">最大値</span>
          <span class="text-xl font-semibold text-slate-200">${tempStats.max}</span>
        </div>
      </div>
    </div>
  `;
}



async function startRealtimeUpdates(metric) {
  info.textContent = '[INFO] Start updating real-time data.';
  try {
    supabaseClient = initializeSupabase(metric);
    if (!supabaseClient) {
      console.error('Supabase クライアントを初期化できません。');
      return;
    }

    // 最新 20 件を初期表示データとして取得します。
    await fetchInitialData(metric);
    drawChart(metric, realtimeData);

    // リアルタイム購読を設定する
    setupRealtimeSubscription(metric);
    isRealtimeActive = true;
    info.textContent = '[INFO] Real-time update started.';

    // ハートビートメカニズムを起動する
    startSimpleHeartbeat(metric);


  } catch (error) {
    console.error('リアルタイム更新の開始に失敗しました:', error);
    isRealtimeActive = false;
  }
}


function initializeSupabase(metric) {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (typeof supabase === 'undefined') {
    console.error('Supabase クライアントライブラリが読み込まれていません。PlayCanvas の設定で外部スクリプトが追加されていることを確認してください。');
    console.error('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    return null;
  }

  let supabaseUrl, apiKey;
  if (metric === "temperature" || metric === "humidity" || metric === "pressure") {
    supabaseUrl = AppConfig.SUPABASE2.URL;
    apiKey = AppConfig.SUPABASE2.API_KEY;
  } else if (metric === "rssi") {
    supabaseUrl = AppConfig.SUPABASE1.URL;
    apiKey = AppConfig.SUPABASE1.API_KEY;
  }

  try {
    supabaseClient = supabase.createClient(supabaseUrl, apiKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    console.log('Supabase クライアントの初期化に成功しました。');
    return supabaseClient;
  } catch (error) {
    console.error('Supabase クライアントの初期化に失敗しました。:', error);
    return null;
  }
}


async function fetchInitialData(metric) {
  let supabaseUrl, apiKey, tableName;
  if (metric === "temperature" || metric === "humidity" || metric === "pressure") {
    supabaseUrl = AppConfig.SUPABASE2.URL;
    apiKey = AppConfig.SUPABASE2.API_KEY;
    tableName = AppConfig.SUPABASE2.TABLE_NAME;
  } else if (metric === "rssi") {
    supabaseUrl = AppConfig.SUPABASE1.URL;
    apiKey = AppConfig.SUPABASE1.API_KEY;
    tableName = AppConfig.SUPABASE1.TABLE_NAME;
  }

  try {
    const params = new URLSearchParams();
    if (metric === "temperature") {
      params.append('select', 'created_at, temp');
      params.append('order', 'created_at.desc');
    } else if (metric === "humidity") {
      params.append('select', 'created_at, humi');
      params.append('order', 'created_at.desc');
    } else if (metric === "pressure") {
      params.append('select', 'created_at, pressure');
      params.append('order', 'created_at.desc');
    } else if (metric === "rssi") {
      params.append('select', 'datetime, rx_rssi');
      params.append('order', 'datetime.desc');
    }
    params.append('limit', MAX_REALTIME_POINTS);

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
    realtimeData = data.map(row => {
      let dateObj;
      if (metric === "temperature" || metric === "humidity" || metric === "pressure") {
        dateObj = new Date(row.created_at);
      } else if (metric === "rssi") {
        dateObj = new Date(row.datetime);
      }

      if (metric === "temperature") {
        const tempValue = parseFloat(row.temp);
        if (isNaN(dateObj.getTime()) || isNaN(tempValue)) {
          console.warn('無効なデータ:', row);
          return null;
        }
        return [dateObj, tempValue];
      } else if (metric === "humidity") {
        const humiValue = parseFloat(row.humi);
        if (isNaN(dateObj.getTime()) || isNaN(humiValue)) {
          console.warn('無効なデータ:', row);
          return null;
        }
        return [dateObj, humiValue];
      } else if (metric === "pressure") {
        const pressureValue = parseFloat(row.pressure);
        if (isNaN(dateObj.getTime()) || isNaN(pressureValue)) {
          console.warn('無効なデータ:', row);
          return null;
        }
        return [dateObj, pressureValue];
      } else if (metric === "rssi") {
        const rssiValue = parseFloat(row.rx_rssi);
        if (isNaN(dateObj.getTime()) || isNaN(rssiValue)) {
          console.warn('無効なデータ:', row);
          return null;
        }
        return [dateObj, rssiValue];
      }
    }).filter(item => item !== null);

    // 時間順に昇順で並べる
    realtimeData.sort((a, b) => a[0].getTime() - b[0].getTime());
    console.log(`処理後の有効データ: ${realtimeData.length} 件`);

  } catch (error) {
    console.error('初期データの取得に失敗しました:', error);
  }
}


function setupRealtimeSubscription(metric) {
  if (!supabaseClient) {
    console.error('Supabase クライアント未初期化');
    return;
  }

  let tableName;
  if (metric === "temperature" || metric === "humidity" || metric === "pressure") {
    tableName = AppConfig.SUPABASE2.TABLE_NAME;
  } else if (metric === "rssi") {
    tableName = AppConfig.SUPABASE1.TABLE_NAME;
  }
  
  let selectedColumns = null;
  if (metric === "temperature") {
    selectedColumns = ['created_at', 'temp'];
  } else if (metric === "humidity") {
    selectedColumns = ['created_at', 'humi'];
  } else if (metric === "pressure") {
    selectedColumns = ['created_at', 'pressure'];
  } else if (metric === "rssi") {
    selectedColumns = ['datetime', 'rx_rssi'];
  }

  try {
    if (subscription) {
      try {
        if (typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      } catch (error) {
        console.warn('旧サブスクリプションの削除中にエラー:', error);
      }
      subscription = null;
    }

    subscription = supabaseClient.channel('realtime_' + tableName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: tableName },
        (payload) => {
          const filteredData = {};
          selectedColumns.forEach(col => filteredData[col] = payload.new[col]);
          console.log('新しいデータを受信:', filteredData);
          handleNewData(metric, filteredData);
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
        if (status === 'SUBSCRIBED') {
          console.log('リアルタイムサブスクリプション成功');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('サブスクリプションチャネルエラー');
          alert('リアルタイムサブスクリプション接続失敗。ネットワークを確認してください。');
        }
      });
    console.log('リアルタイムサブスクリプションを作成しました');  
  } catch (error) {
    console.error('リアルタイムサブスクリプションの設定に失敗:', error);
    alert('リアルタイムサブスクリプションの設定に失敗: ' + error.message);
  }
}


function handleNewData(metric, newData) {
  if (metric === "temperature" || metric === "humidity" || metric === "pressure") {
    if (!newData || !newData.created_at) {
      console.warn('空のデータを受信した、またはフォーマットが正しくありません:', newData);
      return;
    }
  } else if (metric === "rssi") {
    if (!newData || !newData.datetime) {
      console.warn('空のデータを受信した、またはフォーマットが正しくありません:', newData);
      return;
    }
  }

  // 新しいデータの形式を変換する
  let dateObj;
  if (metric === "temperature" || metric === "humidity" || metric === "pressure") {
    dateObj = new Date(newData.created_at);
  } else if (metric === "rssi") {
    dateObj = new Date(newData.datetime);
  }

  let yValue = null;
  if (metric === "temperature") {
    yValue = parseFloat(newData.temp);
  } else if (metric === "humidity") {
    yValue = parseFloat(newData.humi);
  } else if (metric === "pressure") {
    yValue = parseFloat(newData.pressure);
  } else if (metric === "rssi") {
    yValue = parseFloat(newData.rx_rssi);
  }

  if (isNaN(dateObj.getTime()) || isNaN(yValue)) {
    console.warn('無効な数値を受信しました:', newData);
    return;
  }

  const newDataPoint = [dateObj, yValue];
  // データ配列に追加する
  realtimeData.push(newDataPoint);
  // 最新のデータポイントのみを保持する
  if (realtimeData.length > MAX_REALTIME_POINTS) {
    realtimeData.shift(); // 最も古いデータを削除する
  }
  console.log(`データが更新されました。現在のデータポイント: ${realtimeData.length}/${MAX_REALTIME_POINTS}`);

  if (window.myChartInstance) {
    const newChartPoints = realtimeData.map(d => ({
      x: d[0],
      y: d[1]
    }));
    window.myChartInstance.data.datasets[0].data = newChartPoints;
    window.myChartInstance.update('none'); 
    const yValues = realtimeData.map(d => d[1]);
    const tempStats = StatisticsUtils.calculateAllStats(yValues);
    updateStatistics(tempStats);
  }
}

function stopRealtimeUpdates() {
  console.log('リアルタイム更新を停止');

  // ハードビットが停止
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
    console.log('ハートビートメカニズムが停止しました');
  }

  if (supabaseClient && subscription) {
    console.log('サブスクリプションをキャンセルします...');
    if (typeof subscription.unsubscribe === 'function') {
      try {
        subscription.unsubscribe();
        console.log('サブスクリプションはunsubscribe()でキャンセルされました');
      } catch (error) {
        console.error('unsubscribe()でエラー:', error);
      }
    } else if (typeof subscription.close === 'function') {
      try {
          subscription.close();
          console.log('サブスクリプションはclose()でキャンセルされました');
      } catch (error) {
          console.error('close()でエラー:', error);
      }
    } else {
      console.warn('サブスクリプションオブジェクトにキャンセルメソッドが見つかりません');
    }
    subscription = null;
    //supabaseClient = null;
  }
  isRealtimeActive = false;
  console.log('リアルタイム更新が完全に停止しました');
}


function startSimpleHeartbeat(metric) {
  // 追加：起動前に古いタイマーをクリアし、ロードを複数回クリックした際の処理過多を防ぐ
  if (typeof heartbeatTimer !== 'undefined' && heartbeatTimer) {
    clearTimeout(heartbeatTimer);
  }

  const createNextHeartbeat = () => {
    const nextInterval = 55000 + Math.floor(Math.random() * 10000);

    heartbeatTimer = setTimeout(async () => {
      await sendSimpleHeartbeat(metric);
      createNextHeartbeat();
    }, nextInterval);
    
    console.log(`[DEBUG] 次のハートビートまで　${(nextInterval/1000).toFixed(1)} 秒`);
  }

  sendSimpleHeartbeat(metric).then(() => createNextHeartbeat());
}


async function sendSimpleHeartbeat(metric) {
  if (!isRealtimeActive || !supabaseClient) return;

  let tableName, title;
  if (metric === "temperature" || metric === "humidity" || metric === "pressure") {
    tableName = AppConfig.SUPABASE2.TABLE_NAME;
    title = 'created_at';
  } else if (metric === "rssi") {
    tableName = AppConfig.SUPABASE1.TABLE_NAME;
    title = 'datetime';
  }

  try {
    const { error } = await supabaseClient
      .from(tableName)
      .select(title)
      .limit(1);

    if (error) console.warn('[HEARTBEAT] Ping failed:', error.message);
    else console.log('[HEARTBEAT] Connection maintained via REST Ping');
  } catch (err) {
    console.error('[HEARTBEAT] Fatal error:', err);
  }
}