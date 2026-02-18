var FlyDownButton = pc.createScript('flyDownButton');

FlyDownButton.prototype.initialize = function() {
    
    // カメラを切り替える
    this.isProcessingClick = false;
    
    // クリックイベントをバインドする
    this.entity.button.on('click', this.onClick, this);
    
    // 初期状態： 「急降下開始」と表示
    this.updateButtonText('急降下開始');
    this.updateButtonColor('#4CAF50');
    
    // カメラ切り替えイベントを検知する
    this.app.on('camera:flydown:complete', this.hideButton, this);
    this.app.on('camera:reset', this.showButton, this);
    
    // 初期表示（俯瞰視点）
    this.entity.enabled = true;
};

FlyDownButton.prototype.onClick = function() {
    if (this.isProcessingClick) {
        console.log('クリック処理中のため、スキップ');
        return;
    }

    this.isProcessingClick = true;

    const entitiesToHide = ['3DUIGraph', '3DUIGraph_temp'];
    entitiesToHide.forEach(entityName => {
        const entity = this.app.root.findByName(entityName);
        if (entity) {
            entity.enabled = false;
        }
    });
    const entitiesToOpen = ['ShowGraphButton', 'ShowGraphButton_temp'];
    entitiesToOpen.forEach(entityName => {
        const entity = this.app.root.findByName(entityName);
        if (entity) {
            entity.enabled = true;
        }
    });
    
    // 急降下イベントを発生させる
    this.app.fire('camera:flydown:start');
    
    // ボタンの状態を「視点リセット」に変更
    this.updateButtonText('視点リセット');
    this.updateButtonColor('#FF5722');
    
    // クリック挙動を変更
    this.entity.button.off('click', this.onClick, this);
    this.entity.button.on('click', this.onResetClick, this);
    
    // クリック状態をリセット
    setTimeout(() => {
        this.isProcessingClick = false;
    }, 1000);
};

FlyDownButton.prototype.onResetClick = function() {
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
        this.app.fire('camera:reset');
        
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
FlyDownButton.prototype.hideButton = function() {
    this.entity.enabled = false;
    this.isProcessingClick = false;
};

// ボタンを表示する（俯瞰視点に戻った時）
FlyDownButton.prototype.showButton = function() {
    this.resetButtonState();
    
    this.entity.enabled = true;
    this.isProcessingClick = false;
};

FlyDownButton.prototype.resetButtonState = function() {
    this.updateButtonText('急降下開始');
    
    this.updateButtonColor('#4CAF50');
    
    this.entity.button.off('click', this.onResetClick, this);
    this.entity.button.on('click', this.onClick, this);
    
    this.isProcessingClick = false;
};

FlyDownButton.prototype.updateButtonText = function(text) {
    if (this.entity.element) {
        this.entity.element.text = text;
    }
};

FlyDownButton.prototype.updateButtonColor = function(color) {
    if (this.entity.element) {
        this.entity.element.color = new pc.Color().fromString(color);
    }
};

FlyDownButton.prototype.destroy = function() {
    this.app.off('camera:flydown:complete', this.hideButton, this);
    this.app.off('camera:reset', this.showButton, this);
};