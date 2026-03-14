var ShowGraphButtonControllerRain = pc.createScript('showGraphButtonControllerRain');

// initialize code called once per entity
ShowGraphButtonControllerRain.prototype.initialize = function() {
    this.graph = this.app.root.findByName('3DUIGraph_rain');

    this.chartCanvas = this.graph.findByName('ChartCanvas_rain');
    if (!this.chartCanvas) {
        console.error('ChartCanvasがありません！');
        return;
    }

    this.visible = false;
    this.graph.enabled = false;

    this.entity.button.on('click', this.toggle, this);
};

ShowGraphButtonControllerRain.prototype.toggle = function() {
    this.visible = !this.visible;
    this.graph.enabled = this.visible;
};

ShowGraphButtonControllerRain.prototype.destroy = function() {
    if (this.entity.button) {
        this.entity.button.off('click', this.toggle, this);
    }
};

