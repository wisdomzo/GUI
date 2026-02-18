var FlyDownButton2 = pc.createScript('flyDownButton2');

// initialize code called once per entity
FlyDownButton2.prototype.initialize = function() {
    this.isProcessingClick = false;
    
    this.entity.button.on('click', this.onClick, this);
    
    this.updateButtonText('急降下開始');
    this.updateButtonColor('#4CAF50');
    
    this.app.on('camera2:flydown:complete', this.hideButton, this);
    this.app.on('camera2:reset', this.showButton, this);
    
    this.entity.enabled = true;
};

FlyDownButton2.prototype.onClick = function() {
    if (this.isProcessingClick) return;
    
    this.isProcessingClick = true;
    
    this.app.fire('camera2:flydown:start');
    
    this.updateButtonText('視点リセット');
    this.updateButtonColor('#FF5722');

    this.entity.button.off('click', this.onClick, this);
    this.entity.button.on('click', this.onResetClick, this);
    
    setTimeout(() => {
        this.isProcessingClick = false;
    }, 1000);
};

FlyDownButton2.prototype.onResetClick = function() {
    if (this.isProcessingClick) {
        console.log('クリック処理中のため、スキップ');
        return;
    }
    
    console.log('リセットボタンがクリックされました');
    this.isProcessingClick = true;
    
    // ボタンの重複クリック防止のため、即座に無効化
    this.entity.enabled = false;
    
    // リセットイベントを遅延実行
    setTimeout(() => {
        // リセットイベントを発火させる
        this.app.fire('camera2:reset');
        
        // ボタンの状態を「急降下開始」に戻す
        this.updateButtonText('急降下開始');
        this.updateButtonColor('#4CAF50');
        
        // クリック挙動を復元
        this.entity.button.off('click', this.onResetClick, this);
        this.entity.button.on('click', this.onClick, this);
        
        // クリック状態をリセット
        setTimeout(() => {
            this.isProcessingClick = false;
        }, 500);
    }, 100);
};

// ボタンを非表示にする（メイン視点への切り替え時）
FlyDownButton2.prototype.hideButton = function() {
    this.entity.enabled = false;
    this.isProcessingClick = false;
};

// ボタンを表示する（俯瞰視点に戻った時）
FlyDownButton2.prototype.showButton = function() {
    this.resetButtonState();
    
    this.entity.enabled = true;
    this.isProcessingClick = false;
};

FlyDownButton2.prototype.resetButtonState = function() {
    this.updateButtonText('急降下開始');
    
    this.updateButtonColor('#4CAF50');
    
    this.entity.button.off('click', this.onResetClick, this);
    this.entity.button.on('click', this.onClick, this);
    
    this.isProcessingClick = false;
};

FlyDownButton2.prototype.updateButtonText = function(text) {
    if (this.entity.element) {
        this.entity.element.text = text;
    }
};

FlyDownButton2.prototype.updateButtonColor = function(color) {
    if (this.entity.element) {
        this.entity.element.color = new pc.Color().fromString(color);
    }
};

FlyDownButton2.prototype.destroy = function() {
    this.app.off('camera2:flydown:complete', this.hideButton, this);
    this.app.off('camera2:reset', this.showButton, this);
};