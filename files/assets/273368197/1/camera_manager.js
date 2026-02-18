var CameraManager = pc.createScript('cameraManager');

// initialize code called once per entity
CameraManager.prototype.initialize = function() {

    this.overviewCamera = this.app.root.findByName('OverviewCamera');
    this.mainCamera = this.app.root.findByName('Camera');
    
    if (!this.overviewCamera || !this.mainCamera) {
        console.error('カメラエンティティが見つかりません！');
        return;
    }

    // アニメーションの重複を防ぐフラグ
    this.isProcessingReset = false;

    // 初期状態
    this.overviewCamera.enabled = true;
    this.mainCamera.enabled = false;

    // 元の位置を保存する
    this.overviewOriginalPos = this.overviewCamera.getLocalPosition().clone();
    this.overviewOriginalRot = this.overviewCamera.getLocalEulerAngles().clone();
    this.overviewOriginalFov = this.overviewCamera.camera ? this.overviewCamera.camera.fov : 45;

    this.mainCameraOriginalPos = this.mainCamera.getLocalPosition().clone();
    this.mainCameraOriginalRot = this.mainCamera.getLocalEulerAngles().clone();
    this.mainCameraOriginalFov = this.mainCamera.camera ? this.mainCamera.camera.fov : 45;

    // 軌跡の特徴を分析する
    this.analyzeTrajectory();
    
    // アニメーション状態
    this.isAnimating = false;
    this.currentTween = null;
    this.lastUpdateTime = 0;
    this.updateInterval = 16;

    // イベントをバインドする
    this.app.on('camera:flydown:start', this.startFlyDown, this);
    this.app.on('camera:reset', this.resetToOverview, this);
};

// 軌跡特徴を分析する
CameraManager.prototype.analyzeTrajectory = function() {
    const start = this.overviewOriginalPos;
    const end = this.mainCameraOriginalPos;
    const startRot = this.overviewOriginalRot;
    const endRot = this.mainCameraOriginalRot;
    
    // 移動量を計算する
    this.moveX = end.x - start.x;
    this.moveY = end.y - start.y;
    this.moveZ = end.z - start.z;
    
    // 距離を計算する
    this.horizontalDistance = Math.sqrt(this.moveX * this.moveX + this.moveZ * this.moveZ);
    this.totalDistance = Math.sqrt(this.horizontalDistance * this.horizontalDistance + this.moveY * this.moveY);
    this.verticalDistance = Math.abs(this.moveY);
    
    // 俯角（度）を計算する
    this.diveAngle = Math.atan2(Math.abs(this.moveY), this.horizontalDistance) * (180 / Math.PI);
    
    // 主要な移動方向を分析する
    const absX = Math.abs(this.moveX);
    const absZ = Math.abs(this.moveZ);
    this.mainAxis = absZ > absX ? 'Z' : 'X';
    this.isMovingBackward = this.moveZ < 0;
    
    // 回転変化を分析する
    this.rotChangeX = endRot.x - startRot.x;
    this.rotChangeY = endRot.y - startRot.y;
    this.rotChangeZ = endRot.z - startRot.z;
    
    // 回転角度を補正する（360°のジャンプを処理）
    this.normalizedRotChangeX = this.normalizeAngle(this.rotChangeX);
    this.normalizedRotChangeY = this.normalizeAngle(this.rotChangeY);
    this.normalizedRotChangeZ = this.normalizeAngle(this.rotChangeZ);
    
    // 最適な軌跡タイプを自動選択する
    this.selectOptimalTrajectory();
};

// 角度を正規化する（360°のジャンプを処理）
CameraManager.prototype.normalizeAngle = function(angle) {
    // 角度を -180°～180° の範囲に正規化する
    angle = angle % 360;
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;
    return angle;
};

// 最適な軌跡を自動選択する
CameraManager.prototype.selectOptimalTrajectory = function() {
    // データに基づいて推奨する
    if (this.diveAngle > 45 && this.horizontalDistance > 300) {
        // 急勾配の長距離俯角：放物線を使用
        this.trajectoryType = 'parabola';
        this.trajectoryHeight = this.verticalDistance * 0.4;
        console.log('推奨軌跡: 放物線（急勾配長距離ダイブ）');
    } else if (Math.abs(this.normalizedRotChangeZ) > 90) {
        // Z軸回転が大きい場合：スムーズスプラインを使用
        this.trajectoryType = 'spline';
        console.log('推奨軌跡: スプライン曲線（大角度回転）');
    } else if (this.horizontalDistance > 500) {
        // 長距離水平移動：ベジェ曲線を使用
        this.trajectoryType = 'bezier';
        console.log('推奨軌跡: ベジェ曲線（長距離水平移動）');
    } else {
        // デフォルト: 物理軌跡
        this.trajectoryType = 'physics';
        console.log('推奨軌跡: 物理軌跡（バランス効果）');
    }
};

// 軌跡タイプに応じて位置を計算する
CameraManager.prototype.calculatePosition = function(t) {
    const start = this.overviewOriginalPos;
    const end = this.mainCameraOriginalPos;
    
    switch(this.trajectoryType) {
        case 'parabola':
            return this.calculateParabolaPosition(start, end, t);
        case 'bezier':
            return this.calculateBezierPosition(start, end, t);
        case 'spline':
            return this.calculateSplinePosition(start, end, t);
        case 'physics':
        default:
            return this.calculatePhysicsPosition(start, end, t);
    }
};

// 放物線軌跡（急勾配ダイブ向け）
CameraManager.prototype.calculateParabolaPosition = function(start, end, t) {
    const x = start.x + this.moveX * t;
    const z = start.z + this.moveZ * t;
    
    // 放物線公式: y = start.y + moveY * t + 高さ * (4 * t * (1 - t))
    const height = this.trajectoryHeight || this.verticalDistance * 0.3;
    const y = start.y + this.moveY * t + height * 4 * t * (1 - t);
    
    return new pc.Vec3(x, y, z);
};

// ベジェ曲線（アーク移動向け）
CameraManager.prototype.calculateBezierPosition = function(start, end, t) {
    // 制御点は中央で、やや上方向
    const control = new pc.Vec3();
    control.lerp(start, end, 0.5);
    control.y += this.verticalDistance * 0.3;
    
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    
    return new pc.Vec3(
        uu * start.x + 2 * u * t * control.x + tt * end.x,
        uu * start.y + 2 * u * t * control.y + tt * end.y,
        uu * start.z + 2 * u * t * control.z + tt * end.z
    );
};

// スプライン曲線（スムーズな回転向け）
CameraManager.prototype.calculateSplinePosition = function(start, end, t) {
    // 線形補間
    const position = new pc.Vec3();
    position.lerp(start, end, t);
    
    // 回転をよりスムーズにするために、わずかな正弦波を加える
    const wave = Math.sin(t * Math.PI) * this.horizontalDistance * 0.1;
    if (this.mainAxis === 'Z') {
        position.x += wave * (1 - t);
    } else {
        position.z += wave * (1 - t);
    }
    
    return position;
};

// 物理軌跡（総合的に考慮）
CameraManager.prototype.calculatePhysicsPosition = function(start, end, t) {
    // イージングで速度を制御する
    let physicsT;
    if (t < 0.3) {
        // 加速を開始する
        physicsT = Math.pow(t / 0.3, 0.7) * 0.3;
    } else if (t < 0.7) {
        // 中間は等速
        physicsT = 0.3 + (t - 0.3) / 0.4 * 0.4;
    } else {
        // 減速を終了する
        physicsT = 0.7 + (1 - Math.pow(1 - (t - 0.7) / 0.3, 2)) * 0.3;
    }
    
    const position = new pc.Vec3();
    position.lerp(start, end, physicsT);
    
    // ダイブ角度に応じて Y 軸を調整する
    if (this.diveAngle > 30) {
        const gravityEffect = Math.sin(physicsT * Math.PI) * this.verticalDistance * 0.1;
        position.y -= gravityEffect * (1 - physicsT);
    }
    
    return position;
};

// 回転を計算する（大角度ジャンプを処理）
CameraManager.prototype.calculateRotation = function(t) {
    const startRot = this.overviewOriginalRot;
    
    // 正規化済み角度変化を用いて補間する
    const rotX = startRot.x + this.normalizedRotChangeX * t;
    const rotY = startRot.y + this.normalizedRotChangeY * t;
    const rotZ = startRot.z + this.normalizedRotChangeZ * t;
    
    return new pc.Vec3(rotX, rotY, rotZ);
};

// ダイブアニメーションを開始する
CameraManager.prototype.startFlyDown = function() {
    if (this.isAnimating) {
        return;
    }
    
    this.isAnimating = true;
    
    // 俯瞰カメラを有効にする
    this.overviewCamera.enabled = true;
    this.mainCamera.enabled = false;
    
    // カメラをリセットする
    this.overviewCamera.setLocalPosition(this.overviewOriginalPos);
    this.overviewCamera.setLocalEulerAngles(this.overviewOriginalRot);
    if (this.overviewCamera.camera) {
        this.overviewCamera.camera.fov = this.overviewOriginalFov;
    }
    
    // Tween をクリアする
    TWEEN.removeAll();
    
    // アニメーション状態
    const animState = {
        progress: 0,
        fov: this.overviewOriginalFov,
        extraFov: 0
    };
    
    const targetState = {
        progress: 1,
        fov: this.mainCameraOriginalFov,
        extraFov: 0
    };
    
    // 距離に応じて所要時間を調整する（長距離はより長く）
    const baseDuration = 1500;
    const adjustedDuration = baseDuration * Math.min(2, this.totalDistance / 300);
    
    // Tween を作成する
    this.currentTween = new TWEEN.Tween(animState)
        .to(targetState, adjustedDuration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onStart(() => {
            this.animationStartTime = Date.now();
            this.lastProgressLog = 0;
        })
        .onUpdate(() => {
            const t = animState.progress;
            
            const position = this.calculatePosition(t);
            this.overviewCamera.setLocalPosition(position);
            
            const rotation = this.calculateRotation(t);
            this.overviewCamera.setLocalEulerAngles(rotation);
            
            if (this.overviewCamera.camera) {
                let fovEffect = 0;
                if (this.trajectoryType === 'parabola') {
                    fovEffect = Math.sin(t * Math.PI) * 20;
                } else if (this.trajectoryType === 'physics') {
                    fovEffect = Math.sin(t * Math.PI) * 15 * (1 - t);
                }
                
                this.overviewCamera.camera.fov = animState.fov + fovEffect + animState.extraFov;
            }
            
            const progressPercent = Math.round(animState.progress * 100);
            if (progressPercent >= this.lastProgressLog + 25 || progressPercent === 100) {
                const height = position.y.toFixed(1);
                const speed = this.totalDistance / adjustedDuration * 1000;
                this.lastProgressLog = progressPercent;
            }
        })
        .onComplete(() => {
            this.onFlyDownComplete();
        })
        .start(Date.now());
    
    this.lastUpdateTime = Date.now();
    this.app.on('update', this.updateTweens, this);
};

CameraManager.prototype.updateTweens = function(dt) {
    if (!this.isAnimating || !this.currentTween) return;
    
    const currentTime = Date.now();
    
    if (currentTime - this.lastUpdateTime < this.updateInterval) {
        return;
    }
    
    this.lastUpdateTime = currentTime;
    
    if (this.currentTween && this.currentTween.isPlaying()) {
        TWEEN.update(currentTime);
    }
};

// ダイブ完了
CameraManager.prototype.onFlyDownComplete = function() {
    
    // 位置が一致していることを確認する
    this.overviewCamera.setLocalPosition(this.mainCameraOriginalPos);
    this.overviewCamera.setLocalEulerAngles(this.mainCameraOriginalRot);
    if (this.overviewCamera.camera) {
        this.overviewCamera.camera.fov = this.mainCameraOriginalFov;
    }
    
    // カメラを切り替える
    this.overviewCamera.enabled = false;
    this.mainCamera.enabled = true;
    
    this.isAnimating = false;
    this.currentTween = null;
    
    // 完了イベントをトリガーする - ボタン切り替えを通知
    this.app.fire('camera:flydown:complete');
    
    // クリンニング
    this.app.off('update', this.updateTweens, this);
    TWEEN.removeAll();
};

// リセット
CameraManager.prototype.resetToOverview = function() {
    // 重複処理を防ぐ
    if (this.isProcessingReset) {
        // console.log('リセット操作が進行中のため、スキップ');
        return;
    }
    
    // console.log('俯瞰視点にリセットする');
    this.isProcessingReset = true;
    
    // 現在のアニメーションを停止する
    if (this.currentTween) {
        this.currentTween.stop();
        this.currentTween = null;
    }
    
    this.isAnimating = false;
    
    // カメラをリセットする
    this.overviewCamera.setLocalPosition(this.overviewOriginalPos);
    this.overviewCamera.setLocalEulerAngles(this.overviewOriginalRot);
    if (this.overviewCamera.camera) {
        this.overviewCamera.camera.fov = this.overviewOriginalFov;
    }
    
    // カメラを切り替える
    this.mainCamera.enabled = false;
    this.overviewCamera.enabled = true;
    
    TWEEN.removeAll();
    this.app.off('update', this.updateTweens, this);
    
    this.app.fire('camera:reset');
    
    setTimeout(() => {
        this.isProcessingReset = false;
    }, 300);
};

CameraManager.prototype.destroy = function() {
    this.isAnimating = false;
    
    if (this.currentTween) {
        this.currentTween.stop();
        this.currentTween = null;
    }
    
    TWEEN.removeAll();
    
    this.app.off('update', this.updateTweens, this);
    this.app.off('camera:flydown:start', this.startFlyDown, this);
    this.app.off('camera:reset', this.resetToOverview, this);
};