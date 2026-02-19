var ShowLiveVideo = pc.createScript('showLiveVideo');

ShowLiveVideo.attributes.add('videoUrl', {
    type: 'string', 
    default: 'https://res.cloudinary.com/demo/video/upload/dog.mp4' 
});

// initialize code called once per entity
ShowLiveVideo.prototype.initialize = function() {
    var finalUrl = this.videoUrl;
    if (window.MY_LIVEURL_1 && window.MY_LIVEURL_1.defaultVideoUrl) {
        finalUrl = window.MY_LIVEURL_1.defaultVideoUrl;
        console.log("index.html からビデオアドレスの読み込みに成功しました:", finalUrl);
    }

    this.graph = this.app.root.findByName('3DUIGraph_temp');
    if (this.graph) {
        this.chartCanvas = this.graph.findByName('videoScreen');
    }
    if (!this.chartCanvas) {
        console.error('ChartCanvasがありません！');
        return;
    }

    // 1. 非表示のHTML5 Videoタグを作成する
    this.video = document.createElement('video');
    this.video.src = finalUrl;
    this.video.crossOrigin = 'anonymous';
    this.video.loop = true;
    this.video.muted = false;
    this.video.volume = 1.0;
    this.video.playsInline = true;

    // 2. PlayCanvasテクスチャを作成し、ビデオソースに関連付ける
    var gd = this.app.graphicsDevice;
    this.videoTexture = new pc.Texture(gd, {
        format: pc.PIXELFORMAT_R8_G8_B8,
        autoMipmap: false
    });
    this.videoTexture = new pc.Texture(gd, {
        format: pc.PIXELFORMAT_R8_G8_B8,
        autoMipmap: false,
        mipmaps: false,
        minFilter: pc.FILTER_LINEAR,
        magFilter: pc.FILTER_LINEAR,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });

    this.video.addEventListener('canplay', function() {
        this.videoTexture.setSource(this.video);
    }.bind(this));

    this._applyTexture();

    this.visible = false; 
    this.chartCanvas.enabled = this.visible;

    this.entity.button.on('click', this.toggle, this);

    this.enableChartClickZoom();
};

ShowLiveVideo.prototype._applyTexture = function() {
    if (this.chartCanvas.element) {
        this.chartCanvas.element.texture = this.videoTexture;
    } else if (this.chartCanvas.render) {
        var meshInstances = this.chartCanvas.render.meshInstances;
        for (var i = 0; i < meshInstances.length; i++) {
            meshInstances[i].material.emissiveMap = this.videoTexture;
            meshInstances[i].material.emissive = new pc.Color(1, 1, 1);
            meshInstances[i].material.update();
        }
    }
};

ShowLiveVideo.prototype.toggle = function() {
    this.visible = !this.visible;
    this.chartCanvas.enabled = this.visible;

    if (this.visible) {
        this.video.muted = false;
        this.video.play().catch(function(e) {
            console.warn("自動再生がブロックされました:", e);
        });
    } else {
        this.video.pause();
    }
};

ShowLiveVideo.prototype.update = function(dt) {
    if (this.visible && this.video.readyState >= this.video.HAVE_CURRENT_DATA) {
        this.videoTexture.upload();
    }
};

ShowLiveVideo.prototype.enableChartClickZoom = function() {
    if (this.chartCanvas.element) {
        this.chartCanvas.element.on('click', this.openZoomOverlay, this);
    }
};

ShowLiveVideo.prototype.openZoomOverlay = function() {
    // 1. 全画面マスクを作成する
    const overlay = document.createElement('div');
    overlay.id = 'video-zoom-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.9); z-index: 10000;
        display: flex; justify-content: center; align-items: center;
    `;

    // 2. コンテナを作成する
    const container = document.createElement('div');
    container.style.cssText = `
        position: relative; width: 80%; max-width: 1200px;
        background: #000; line-height: 0; border: 2px solid #444;
    `;

    // 3. ビデオ要素をクローンするか、直接使用して大画面に表示する
    // 注意：再生の同期を維持するため、initialize内のthis.videoを直接DOMに挿入します
    const bigVideo = this.video;
    bigVideo.style.cssText = `width: 100%; height: auto; display: block;`;
    bigVideo.controls = true;

    // 4. Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕ Close';
    closeBtn.style.cssText = `
        position: absolute; top: -40px; left: 0;
        background: #ff4444; color: white; border: none;
        padding: 8px 15px; cursor: pointer; border-radius: 4px;
    `;

    const closeZoom = () => {
        bigVideo.controls = false; 

        document.body.appendChild(bigVideo);
        bigVideo.style.display = 'none';

        if (overlay && overlay.parentNode) {
            document.body.removeChild(overlay);
        }

        if (this.video) {
            this.video.play().then(() => {
            }).catch((err) => {
                this.video.muted = true;
                this.video.play();
            });
        }
    };

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


    closeBtn.onclick = closeZoom;
    overlay.onclick = (e) => { if(e.target === overlay) closeZoom(); };

    container.appendChild(bigVideo);
    container.appendChild(closeBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

}

ShowLiveVideo.prototype.destroy = function() {
    if (this.entity.button) {
        this.entity.button.off('click', this.toggle, this);
    }
    if (this.video) {
        this.video.pause();
        this.video.src = "";
    }
};