var OpenWebPage = pc.createScript('openWebPage');

OpenWebPage.attributes.add('htmlAsset', {
    type: 'asset',
    assetType: 'html'
});

OpenWebPage.attributes.add('chartAsset', {
    type: 'asset',
    assetType: 'script'
});

OpenWebPage.attributes.add('chartDataAsset', {
    type: 'asset',
    assetType: 'script'
});

OpenWebPage.attributes.add('chartZoomAsset', {
    type: 'asset',
    assetType: 'script'
});

OpenWebPage.attributes.add('tailwindAsset', {
    type: 'asset',
    assetType: 'css',
    title: 'Tailwind CSS'
});

OpenWebPage.attributes.add('mainAsset', {
    type: 'asset',
    assetType: 'script',
});

OpenWebPage.attributes.add('statisticsUtilsAsset', {
    type: 'asset',
    assetType: 'script',
});

OpenWebPage.attributes.add('supabaseAsset', {
    type: 'asset',
    assetType: 'script',
});

OpenWebPage.attributes.add('supabaseJS', {
    type: 'asset',
    assetType: 'script',
});


OpenWebPage.prototype.initialize = function () {
    this.entity.element.on('click', this.openPage, this);
};

OpenWebPage.prototype.openPage = function () {

    if (!this.htmlAsset || !this.chartAsset) {
        console.error("Missing asset");
        return;
    }

    const pageUrl = this.htmlAsset.getFileUrl();

    const chartUrl = this.chartAsset.getFileUrl();
    const en_chartUrl = encodeURIComponent(chartUrl);

    const tailwindUrl = this.tailwindAsset.getFileUrl();
    const en_tailwindUrl = encodeURIComponent(tailwindUrl);

    const mainUrl = this.mainAsset.getFileUrl();
    const en_mainUrl = encodeURIComponent(mainUrl);

    const statisticsUtilsUrl = this.statisticsUtilsAsset.getFileUrl();
    const en_statisticsUtilsUrl = encodeURIComponent(statisticsUtilsUrl);

    const supabaseUrl = this.supabaseAsset.getFileUrl();
    const en_supabaseUrl = encodeURIComponent(supabaseUrl);

    const chartDataUrl = this.chartDataAsset.getFileUrl();
    const dateAdapter = encodeURIComponent(chartDataUrl);

    const chartZoomUrl = this.chartZoomAsset.getFileUrl();
    const en_chartZoomUrl = encodeURIComponent(chartZoomUrl);

    const supabaseJSUrl = this.supabaseJS.getFileUrl();
    const en_supabaseJSUrl = encodeURIComponent(supabaseJSUrl);


    const separator = pageUrl.includes("?") ? "&" : "?";
    const finalUrl = pageUrl + separator + "main=" + en_mainUrl + "&statisticsUtils=" + en_statisticsUtilsUrl + "&supabase=" + en_supabaseUrl + "&chart=" + en_chartUrl + "&tailwind=" + en_tailwindUrl + "&dateAdapter=" + dateAdapter + "&chartZoom=" + en_chartZoomUrl + "&supabaseJS=" + en_supabaseJSUrl;

    window.open(finalUrl, '_blank');
};

