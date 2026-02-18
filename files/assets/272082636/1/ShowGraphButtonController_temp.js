var ShowGraphButtonControllerTemp = pc.createScript('showGraphButtonControllerTemp');

// initialize code called once per entity
ShowGraphButtonControllerTemp.prototype.initialize = function() {
    this.graph = this.app.root.findByName('3DUIGraph_temp');

    this.chartCanvas = this.graph.findByName('ChartCanvas_temp');
    if (!this.chartCanvas) {
        console.error('ChartCanvasがありません！');
        return;
    }

    this.visible = false;
    this.graph.enabled = false;

    this.entity.button.on('click', this.toggle, this);

};

ShowGraphButtonControllerTemp.prototype.toggle = function() {
    this.visible = !this.visible;
    this.graph.enabled = this.visible;
};

ShowGraphButtonControllerTemp.prototype.destroy = function() {
    if (this.entity.button) {
        this.entity.button.off('click', this.toggle, this);
    }
};