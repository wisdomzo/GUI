var ReturnToOverviewButton2 = pc.createScript('returnToOverviewButton2');

ReturnToOverviewButton2.attributes.add('buttonText', {
    type: 'string',
    default: '俯瞰に戻る',
    title: 'ボタンテキスト'
});

ReturnToOverviewButton2.attributes.add('normalColor', {
    type: 'string',
    default: '#2196F3',
    title: 'ノーマルカラー'
});

ReturnToOverviewButton2.attributes.add('hoverColor', {
    type: 'string', 
    default: '#1976D2',
    title: 'ホバーカラー'
});

ReturnToOverviewButton2.prototype.initialize = function() {
    this.entity.enabled = false;
    this.isProcessingClick = false;
    
    this.updateButtonText(this.buttonText);
    this.updateButtonColor(this.normalColor);
    
    this.entity.button.on('click', this.onClick, this);
    this.entity.button.on('mouseenter', this.onMouseEnter, this);
    this.entity.button.on('mouseleave', this.onMouseLeave, this);
    
    this.app.on('camera2:flydown:complete', this.showButton, this);
    this.app.on('camera2:reset', this.hideButton, this);

};

ReturnToOverviewButton2.prototype.onClick = function() {
    if (this.isProcessingClick) return;
    
    this.isProcessingClick = true;
    this.addClickFeedback();
    this.entity.enabled = false;
    
    setTimeout(() => {
        this.app.fire('camera2:reset');
        
        setTimeout(() => {
            this.isProcessingClick = false;
        }, 500);
    }, 100);
};

ReturnToOverviewButton2.prototype.showButton = function() {
    this.entity.enabled = true;
    
    this.isProcessingClick = false;
    
    this.fadeInAnimation();
};

ReturnToOverviewButton2.prototype.hideButton = function() {
    this.entity.enabled = false;
    
    this.isProcessingClick = false;
};

ReturnToOverviewButton2.prototype.onMouseEnter = function() {
    if (this.entity.enabled && this.entity.element && !this.isProcessingClick) {
        this.entity.element.color = new pc.Color().fromString(this.hoverColor);

        if (this.entity.element) {
            this.entity.element.scale = 1.05;
        }
    }
};

ReturnToOverviewButton2.prototype.onMouseLeave = function() {
    if (this.entity.enabled && this.entity.element && !this.isProcessingClick) {
        this.entity.element.color = new pc.Color().fromString(this.normalColor);
        
        if (this.entity.element) {
            this.entity.element.scale = 1.0;
        }
    }
};

// クリックフィードバック効果
ReturnToOverviewButton2.prototype.addClickFeedback = function() {
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
ReturnToOverviewButton2.prototype.fadeInAnimation = function() {
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

ReturnToOverviewButton2.prototype.updateButtonText = function(text) {
    if (this.entity.element) {
        this.entity.element.text = text;
    }
};

ReturnToOverviewButton2.prototype.updateButtonColor = function(color) {
    if (this.entity.element) {
        this.entity.element.color = new pc.Color().fromString(color);
    }
};

ReturnToOverviewButton2.prototype.destroy = function() {
    this.app.off('camera2:flydown:complete', this.showButton, this);
    this.app.off('camera2:reset', this.hideButton, this);
};