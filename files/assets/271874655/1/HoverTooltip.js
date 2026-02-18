var HoverTooltip = pc.createScript('hoverTooltip');

HoverTooltip.attributes.add('text', {
    type: 'string',
    default: 'ツールチップ',
    title: 'ヒント文',
    description: 'ホバー時に表示される文字'
});

HoverTooltip.attributes.add('delay', {
    type: 'number',
    default: 0,
    title: '遅延時間(ms)',
    description: 'ホバー後に表示されるまでの遅延時間（0の場合は即時表示）'
});

HoverTooltip.attributes.add('position', {
    type: 'string',
    default: 'bottom',
    title: '表示位置',
    description: 'マウス位置に対するヒントの表示位置',
    enum: [
        { 'top': '上' },
        { 'bottom': '下' },
        { 'left': '左' },
        { 'right': '右' },
        { 'center': '中央' }
    ]
});

HoverTooltip.attributes.add('fontSize', {
    type: 'number',
    default: 8,
    title: '字体サイズ(px)',
    description: 'ヒント文の字体サイズ'
});

HoverTooltip.prototype.initialize = function() {
    
    this.hasInteraction = this.entity.button || this.entity.element;
    
    if (!this.hasInteraction) {
        console.warn('HoverTooltip は、Button または Element コンポーネントを持つエンティティにアタッチする必要があります。');
        return;
    }
    
    this.bindEvents();
};

HoverTooltip.prototype.bindEvents = function() {
    const interaction = this.entity.button || this.entity.element;
    
    if (!interaction) return;
    
    // マウスエンターイベント
    interaction.on('mouseenter', (event) => {
        if (this.delay > 0) {
            this.startDelayTimer(event);
        } else {
            this.showTooltip(event);
        }
    }, this);
    
    // マウスムーブイベント
    interaction.on('mousemove', (event) => {
        if (this.tooltip && this.tooltip.style.opacity === '1') {
            this.updateTooltipPosition(event);
        }
    }, this);
    
    // マウスリーブイベント
    interaction.on('mouseleave', () => {
        this.hideTooltip();
    }, this);
};

// 遅延タイマーを起動する
HoverTooltip.prototype.startDelayTimer = function(event) {
    this.cancelDelayTimer();
    
    this.delayTimer = setTimeout(() => {
        this.showTooltip(event);
    }, this.delay);
};

// 遅延タイマーをキャンセルする
HoverTooltip.prototype.cancelDelayTimer = function() {
    if (this.delayTimer) {
        clearTimeout(this.delayTimer);
        this.delayTimer = null;
    }
};

// ヒントを表示する
HoverTooltip.prototype.showTooltip = function(event) {
    if (this.isTooltipVisible) return;
    
    // ヒント要素を作成する
    this.createTooltipElement();
    
    // 初期位置を設定する
    this.updateTooltipPosition(event || { x: 0, y: 0 });
    
    // フェードイン表示
    setTimeout(() => {
        if (this.tooltip) {
            this.tooltip.style.opacity = '1';
            this.isTooltipVisible = true;
        }
    }, 10);
};

// ヒント要素を生成する
HoverTooltip.prototype.createTooltipElement = function() {
    if (this.tooltip) {
        // 既存のヒントのテキストを更新する
        this.tooltip.textContent = this.text;
        this.tooltip.style.fontSize = this.fontSize + 'px';
        return;
    }
    
    // 新しいヒント要素を作成する
    this.tooltip = document.createElement('div');
    this.tooltip.textContent = this.text;
    
    // 基本スタイル
    this.tooltip.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        pointer-events: none;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.2s ease;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        max-width: 300px;
        word-wrap: break-word;
        text-align: center;
    `;
    
    // カスタムフォントサイズを適用する
    this.tooltip.style.fontSize = this.fontSize + 'px';
    
    document.body.appendChild(this.tooltip);
};

// ヒントの位置を更新する
HoverTooltip.prototype.updateTooltipPosition = function(event) {
    if (!this.tooltip) return;
    
    const offset = 10; // マウスからのオフセット距離
    
    switch (this.position) {
        case 'top':
            this.tooltip.style.left = (event.x) + 'px';
            this.tooltip.style.top = (event.y - this.tooltip.offsetHeight - offset) + 'px';
            this.tooltip.style.transform = 'translateX(-50%)';
            break;
            
        case 'bottom':
            this.tooltip.style.left = (event.x) + 'px';
            this.tooltip.style.top = (event.y + offset) + 'px';
            this.tooltip.style.transform = 'translateX(-50%)';
            break;
            
        case 'left':
            this.tooltip.style.left = (event.x - this.tooltip.offsetWidth - offset) + 'px';
            this.tooltip.style.top = (event.y) + 'px';
            this.tooltip.style.transform = 'translateY(-50%)';
            break;
            
        case 'right':
            this.tooltip.style.left = (event.x + offset) + 'px';
            this.tooltip.style.top = (event.y) + 'px';
            this.tooltip.style.transform = 'translateY(-50%)';
            break;
            
        case 'center':
            this.tooltip.style.left = '50%';
            this.tooltip.style.top = 'calc(50% + 100px)';
            this.tooltip.style.transform = 'translateX(-50%)';
            break;
            
        default:
            this.tooltip.style.left = (event.x) + 'px';
            this.tooltip.style.top = (event.y + offset) + 'px';
            this.tooltip.style.transform = 'translateX(-50%)';
    }
};

// ヒントを非表示にする
HoverTooltip.prototype.hideTooltip = function() {
    this.cancelDelayTimer();
    
    if (this.tooltip) {
        this.tooltip.style.opacity = '0';
        this.isTooltipVisible = false;
        
        // オプション：要素を完全に削除する（メモリ節約）
        // setTimeout(() => {
        //     if (this.tooltip && this.tooltip.parentNode) {
        //         document.body.removeChild(this.tooltip);
        //         this.tooltip = null;
        //     }
        // }, 200);
    }
};

// ヒントのテキストを動的に更新する
HoverTooltip.prototype.setText = function(newText) {
    this.text = newText;
    
    if (this.tooltip) {
        this.tooltip.textContent = newText;
    }
};

// 遅延時間を動的に更新する
HoverTooltip.prototype.setDelay = function(newDelay) {
    this.delay = newDelay;
};

// 位置を動的に更新する
HoverTooltip.prototype.setPosition = function(newPosition) {
    this.position = newPosition;
};

// リソースを解放する
HoverTooltip.prototype.onDestroy = function() {
    this.hideTooltip();
    
    if (this.tooltip && this.tooltip.parentNode) {
        document.body.removeChild(this.tooltip);
    }
    
    // イベントリスナーを解除する
    const interaction = this.entity.button || this.entity.element;
    if (interaction) {
        interaction.off('mouseenter', this.startDelayTimer, this);
        interaction.off('mousemove', this.updateTooltipPosition, this);
        interaction.off('mouseleave', this.hideTooltip, this);
    }
};