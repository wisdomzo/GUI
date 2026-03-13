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
    },

    // 吉村先生のデータベース
    SUPABASE3: {
        URL: 'https://wvkrhkfrineapeazuhxg.supabase.co',
        API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2a3Joa2ZyaW5lYXBlYXp1aHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTIxNDcsImV4cCI6MjA4MzkyODE0N30.hSeH5Onii9aVLdx794vz5js2TlMfpExGq47PkYNBszw',
        TABLE_NAME: 'rain_data'
    }
};

if (typeof window !== 'undefined') {
    window.AppConfig = AppConfig;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}