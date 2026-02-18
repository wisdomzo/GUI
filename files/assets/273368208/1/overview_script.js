var OverviewScript = pc.createScript('overviewScript');

// initialize code called once per entity
OverviewScript.prototype.initialize = function() {
    
    const pos = this.entity.getLocalPosition();
    const rot = this.entity.getLocalEulerAngles();
    const fov = this.entity.camera ? this.entity.camera.fov : 35;
    
    this.entity.enabled = true;
    
    this.app.on('camera:reset', () => {
        this.entity.enabled = true;
    });
};

OverviewScript.prototype.getCameraInfo = function() {
    return {
        name: this.entity.name,
        position: this.entity.getLocalPosition(),
        rotation: this.entity.getLocalEulerAngles(),
        fov: this.entity.camera ? this.entity.camera.fov : 35,
        isEnabled: this.entity.enabled
    };
};
