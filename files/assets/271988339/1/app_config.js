var AppConfig = {
    // 趙先生のデータベース
    SUPABASE1: {
        URL: 'https://duejkerigbppdrpoiumy.supabase.co',
        API_KEY: 'sb_publishable_eGzS0YHJ5-nBCqdvGZCHzg_nNJlaevX',
        TABLE_NAME: 'database'
    },

    // 松尾先生のデータベース
    SUPABASE2: {
        URL: 'https://wvkrhkfrineapeazuhxg.supabase.co',
        API_KEY: 'sb_publishable_xwHFt6XIkkhJHTEOHChZ_w_6bRbxXL7',
        TABLE_NAME: 'iot_data'
    }
};

if (typeof window !== 'undefined') {
    window.AppConfig = AppConfig;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}