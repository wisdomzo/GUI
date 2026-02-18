var GetTimeTools = {
    getTime: function(promptText = '開始時間を入力してください', defaultToCurrentTime = false) {
        return new Promise((resolve, reject) => {
            // 1. マスク（オーバーレイ）とダイアログを含むコンテナを作成する
            const modalContainer = document.createElement('div');
            modalContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                display: flex;
                justify-content: center;
                align-items: center;
                box-sizing: border-box;
            `;
            
            // 2. Mask
            const backdrop = document.createElement('div');
            backdrop.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                box-sizing: border-box;
            `;
            
            // 3. ダイアログ
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: relative;
                background: white;
                padding: 25px;
                border-radius: 8px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                min-width: 280px;
                max-width: 90vw;
                max-height: 90vh;
                overflow: auto;
                box-sizing: border-box;
            `;

            // 日本語のプロンプト – 受け取ったプロンプトテキストを使用する
            const label = document.createElement('div');
            label.textContent = promptText;
            label.style.cssText = `
                margin-bottom: 15px;
                font-weight: bold;
                font-size: 16px;
                color: #333;
                box-sizing: border-box;
            `;
            dialog.appendChild(label);
            
            const input = document.createElement('input');
            input.type = 'datetime-local';
            input.id = 'japan-time-input';
            
            // デフォルトの日本時間を設定する
            const now = new Date();
            const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
            const japanTime = new Date(utcTime + (9 * 3600000));

            // パラメータに応じてデフォルトの時間を調整する
            if (!defaultToCurrentTime) {
                // デフォルトを1時間前に設定する（開始時間に適用）
                japanTime.setHours(japanTime.getHours() - 1);
            }
            // defaultToCurrentTime が true の場合、現在の時刻を使用する（終了時間に適用）
            
            const japanTimeStr = 
                japanTime.getFullYear() + '-' +
                String(japanTime.getMonth() + 1).padStart(2, '0') + '-' +
                String(japanTime.getDate()).padStart(2, '0') + 'T' +
                String(japanTime.getHours()).padStart(2, '0') + ':' +
                String(japanTime.getMinutes()).padStart(2, '0');
            
            input.value = japanTimeStr;
            input.style.cssText = `
                width: 50%;
                min-width: 200px; 
                padding: 10px;
                margin: 0 auto 20px;
                display: block;
                box-sizing: border-box;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 14px;
                text-align: center;
            `;
            dialog.appendChild(input);
            
            // ボタンコンテナ
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
                box-sizing: border-box;
            `;
            
            // キャンセルボタン
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'キャンセル';
            cancelBtn.style.cssText = `
                flex: 1;
                padding: 10px;
                background: #e0e0e0;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                box-sizing: border-box;
                transition: background 0.2s;
            `;
            
            // 確定ボタン
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '確定';
            confirmBtn.style.cssText = `
                flex: 1;
                padding: 10px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                box-sizing: border-box;
                transition: background 0.2s;
            `;
            
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            dialog.appendChild(buttonContainer);
            
            // 4. 組み立て
            modalContainer.appendChild(backdrop);
            modalContainer.appendChild(dialog);
            document.body.appendChild(modalContainer);
            
            input.focus();
            input.select();
            
            // 5. 背景のスクロールを無効化する
            const originalBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            
            // 6. 重要：コンテナがすべてのクリックイベントを（キャプチャフェーズで）捕捉する
            const stopAllEvents = (e) => {

                if (e.target === confirmBtn) {
                    if (e.type === 'click' || e.type === 'touchend') {
                        return;
                    }
                }
                if (e.target === cancelBtn) {
                    if (e.type === 'click' || e.type === 'touchend') {
                        return;
                    }
                }
                if (e.target === input) {
                    if (e.type === 'click' || e.type === 'touchend') {
                        return;
                    }
                }
                if (e.target === input || 
                    e.target.parentNode === input ||
                    input.contains(e.target)) {
                    if (e.type === 'click' || 
                        e.type === 'mousedown' || 
                        e.type === 'mouseup' ||
                        e.type === 'touchstart' ||
                        e.type === 'touchend' ||
                        e.type === 'focus' ||
                        e.type === 'blur' ||
                        e.type === 'input' ||
                        e.type === 'change') {
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
            
            modalContainer.addEventListener('click', stopAllEvents, true);
            modalContainer.addEventListener('mousedown', stopAllEvents, true);
            modalContainer.addEventListener('mouseup', stopAllEvents, true);
            modalContainer.addEventListener('touchstart', stopAllEvents, true);
            modalContainer.addEventListener('touchend', stopAllEvents, true);




            

            const allowDialogEvents = (e) => {
                e.stopPropagation();
            };
            
            dialog.addEventListener('click', allowDialogEvents);
            input.addEventListener('click', allowDialogEvents);
            cancelBtn.addEventListener('click', allowDialogEvents);
            confirmBtn.addEventListener('click', allowDialogEvents);
            
            const cleanup = () => {
                modalContainer.removeEventListener('click', stopAllEvents, true);
                modalContainer.removeEventListener('mousedown', stopAllEvents, true);
                modalContainer.removeEventListener('mouseup', stopAllEvents, true);
                modalContainer.removeEventListener('touchstart', stopAllEvents, true);
                modalContainer.removeEventListener('touchend', stopAllEvents, true);
                
                dialog.removeEventListener('click', allowDialogEvents);
                input.removeEventListener('click', allowDialogEvents);
                cancelBtn.removeEventListener('click', allowDialogEvents);
                confirmBtn.removeEventListener('click', allowDialogEvents);
                
                document.body.style.overflow = originalBodyOverflow;
                
                if (modalContainer.parentNode) {
                    document.body.removeChild(modalContainer);
                }
            };
            
            const handleConfirm = () => {
                const selectedTime = input.value;
                
                // 日本時間の Date オブジェクトに解析する
                const selectedDate = this.parseToJapanDate(selectedTime);
                
                cleanup();
                resolve(selectedDate);
            };
            
            const handleCancel = () => {
                cleanup();
                reject(new Error('ユーザーがキャンセルしました'));
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            
            backdrop.addEventListener('click', (e) => {
                e.stopPropagation();
                handleCancel();
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    handleConfirm();
                }
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    handleCancel();
                }
            });
            
            cancelBtn.onmouseover = () => cancelBtn.style.background = '#d0d0d0';
            cancelBtn.onmouseout = () => cancelBtn.style.background = '#e0e0e0';
            confirmBtn.onmouseover = () => confirmBtn.style.background = '#0056b3';
            confirmBtn.onmouseout = () => confirmBtn.style.background = '#007bff';

            setTimeout(() => {
                if (document.body.contains(modalContainer)) {
                    cleanup();
                    reject(new Error('タイムアウト'));
                }
            }, 30000);
        });
    },

    parseToJapanDate: function(dateTimeString) {
        const [datePart, timePart] = dateTimeString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // 日本時間は UTC+9 なので、UTC 時間を得るには 9 時間引く
        const utcDate = new Date(Date.UTC(year, month - 1, day, hours - 9, minutes));
        
        // Date オブジェクトを返す
        return new Date(utcDate);
    }
};