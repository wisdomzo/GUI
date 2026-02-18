var ClearChartData = pc.createScript('clearChartData');

ClearChartData.prototype.initialize = function() {
    
    this.entity.button.on('click', this.clearChart, this);

};

ClearChartData.prototype.clearChart = function() {
    console.log('グラフをクリアする...');
    
    const chartCanvas = this.entity.parent.findByName('ChartCanvas');
    if (!chartCanvas || !chartCanvas.element) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 800, 500);
    
    ctx.fillStyle = '#999';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    
    const texture = new pc.Texture(this.app.graphicsDevice, {
        width: 800,
        height: 500,
        format: pc.PIXELFORMAT_R8_G8_B8_A8
    });
    
    texture.setSource(canvas);
    chartCanvas.element.texture = texture;

    this.clearParaInputData();
    
};


ClearChartData.prototype.clearParaInputData = function() {
    const uiGraph = this.app.root.findByName('3DUIGraph');
        if (!uiGraph) {
            console.log('3DUIGraphが検出されませんでした。');
            return;
        }
    const paraInput = uiGraph.findByName('paraInput');
    if (paraInput && paraInput.script && paraInput.script.settingWaterLevel) {
        paraInput.script.settingWaterLevel.currentChartData = null;
    } else {
        console.log('スクリプトが検出されませんでした。');
    }

};