var ShowGraphButtonController = pc.createScript('showGraphButtonController');

ShowGraphButtonController.prototype.initialize = function() {
    // グラフを取得する
    this.graph = this.app.root.findByName('3DUIGraph');

    // グラフのキャンバスを取得する
    this.chartCanvas = this.graph.findByName('ChartCanvas');
    if (!this.chartCanvas) {
        console.error('ChartCanvasがありません！');
        return;
    }

    // 初期状態
    this.visible = false;
    this.graph.enabled = false;
    
    // クリックイベントをバインドする
    this.entity.button.on('click', this.toggle, this);
};

ShowGraphButtonController.prototype.toggle = function() {
    this.visible = !this.visible;
    this.graph.enabled = this.visible;
};

ShowGraphButtonController.prototype.destroy = function() {
    if (this.entity.button) {
        this.entity.button.off('click', this.toggle, this);
    }
};