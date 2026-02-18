var ReturnToOverviewButton = pc.createScript('returnToOverviewButton');

ReturnToOverviewButton.attributes.add('buttonText', {
    type: 'string',
    default: '俯瞰に戻る',
    title: 'ボタンテキスト'
});

ReturnToOverviewButton.attributes.add('normalColor', {
    type: 'string',
    default: '#2196F3',
    title: 'ノーマルカラー'
});

ReturnToOverviewButton.attributes.add('hoverColor', {
    type: 'string', 
    default: '#1976D2',
    title: 'ホバーカラー'
});

ReturnToOverviewButton.prototype.initialize = function() {
    
    // 初期状態：非表示（俯瞰視点ではない状態）
    this.entity.enabled = false;
    
    // 重複クリック防止のフラグ
    this.isProcessingClick = false;
    
    // ボタンのテキストと色を設定する
    this.updateButtonText(this.buttonText);
    this.updateButtonColor(this.normalColor);
    
    // クリックイベントをバインドする
    this.entity.button.on('click', this.onClick, this);
    
    // ホバーエフェクトを追加する
    this.entity.button.on('mouseenter', this.onMouseEnter, this);
    this.entity.button.on('mouseleave', this.onMouseLeave, this);
    
    // カメラ切り替えイベントをリスンする
    this.app.on('camera:flydown:complete', this.showButton, this);
    this.app.on('camera:reset', this.hideButton, this);
};

ReturnToOverviewButton.prototype.onClick = function() {
    if (this.isProcessingClick) {
        console.log('クリック処理中のため、スキップする');
        return;
    }
    
    this.isProcessingClick = true;
    
    this.addClickFeedback();

    this.entity.enabled = false;

    const entitiesToHide = ['3DUIGraph', '3DUIGraph_temp', 'ShowGraphButton', 'ShowGraphButton_temp'];
    entitiesToHide.forEach(entityName => {
        const entity = this.app.root.findByName(entityName);
        if (entity) {
            entity.enabled = false;
        }
    });
    
    setTimeout(() => {
        this.app.fire('camera:reset');
        
        setTimeout(() => {
            this.isProcessingClick = false;
        }, 500);
    }, 100);
};

ReturnToOverviewButton.prototype.showButton = function() {
    this.entity.enabled = true;
    
    this.isProcessingClick = false;
    
    this.fadeInAnimation();
};

ReturnToOverviewButton.prototype.hideButton = function() {
    this.entity.enabled = false;
    
    this.isProcessingClick = false;
};

ReturnToOverviewButton.prototype.onMouseEnter = function() {
    if (this.entity.enabled && this.entity.element && !this.isProcessingClick) {
        this.entity.element.color = new pc.Color().fromString(this.hoverColor);

        if (this.entity.element) {
            this.entity.element.scale = 1.05;
        }
    }
};

ReturnToOverviewButton.prototype.onMouseLeave = function() {
    if (this.entity.enabled && this.entity.element && !this.isProcessingClick) {
        this.entity.element.color = new pc.Color().fromString(this.normalColor);
        
        if (this.entity.element) {
            this.entity.element.scale = 1.0;
        }
    }
};

// クリックフィードバック効果
ReturnToOverviewButton.prototype.addClickFeedback = function() {
    // 一時的に色を変更する
    const originalColor = this.entity.element ? this.entity.element.color.clone() : new pc.Color();
    if (this.entity.element) {
        this.entity.element.color = new pc.Color().fromString('#64B5F6');
    }
    
    // 0.2秒後に復元する
    setTimeout(() => {
        if (this.entity && this.entity.element) {
            this.entity.element.color = originalColor;
        }
    }, 200);
    
    // スケールアニメーション
    if (this.entity.element) {
        const originalScale = this.entity.element.scale || 1.0;
        this.entity.element.scale = 0.95;
        
        setTimeout(() => {
            if (this.entity && this.entity.element) {
                this.entity.element.scale = originalScale;
            }
        }, 150);
    }
};

// フェードインアニメーション
ReturnToOverviewButton.prototype.fadeInAnimation = function() {
    if (!this.entity.element) return;
    
    // もし要素にopacity属性があれば
    if (this.entity.element.opacity !== undefined) {
        this.entity.element.opacity = 0;
        
        let opacity = 0;
        const fadeIn = () => {
            opacity += 0.05;
            this.entity.element.opacity = opacity;
            
            if (opacity < 1) {
                setTimeout(fadeIn, 16);
            }
        };
        
        fadeIn();
    }
};

ReturnToOverviewButton.prototype.updateButtonText = function(text) {
    if (this.entity.element) {
        this.entity.element.text = text;
    }
};

ReturnToOverviewButton.prototype.updateButtonColor = function(color) {
    if (this.entity.element) {
        this.entity.element.color = new pc.Color().fromString(color);
    }
};

ReturnToOverviewButton.prototype.destroy = function() {
    this.app.off('camera:flydown:complete', this.showButton, this);
    this.app.off('camera:reset', this.hideButton, this);
};