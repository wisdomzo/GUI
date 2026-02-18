var ArrowMotion1 = pc.createScript('arrowMotion1');

ArrowMotion1.attributes.add('bounceHeight', {
    type: 'number',
    default: 1,
    title: '上下移動の高さ'
});

ArrowMotion1.attributes.add('bounceSpeed', {
    type: 'number',
    default: 2.0,
    title: '上下移動の速度'
});

ArrowMotion1.prototype.initialize = function() {
    // 初期位置を保存
    this.originalPosition = this.entity.getLocalPosition().clone();
    this.time = 0;
};

ArrowMotion1.prototype.update = function(dt) {
    // 時間更新
    this.time += dt;
    
    // 1. 上下にバウンス（サイン波を使用）
    var bounceOffset = Math.sin(this.time * this.bounceSpeed) * this.bounceHeight;
    
    // 位置と回転を適用
    this.entity.setLocalPosition(
        this.originalPosition.x,
        this.originalPosition.y + bounceOffset,
        this.originalPosition.z
    );
};

// アニメーションをリセットするメソッド（必要に応じて）
ArrowMotion1.prototype.reset = function() {
    this.time = 0;
    this.entity.setLocalPosition(this.originalPosition);
};