var processedReport = arguments[0] || {};

function showLogo(processedReport)
{
    var accountModel = require('session').getAccount();
    
    $.icon.width  = processedReport.getLogoWidth() || 16;
    $.icon.height = processedReport.getLogoHeight() || 16;
    $.icon.left   = OS_ANDROID ? '10dp' : 10;
    $.icon.image  = accountModel.getBasePath() + processedReport.getLogo();
    $.icon.show();
}

if (processedReport) {
    $.title.text = processedReport.getTitle();
    $.value.text = processedReport.getValue();

    if (processedReport.hasLogo()) {
        showLogo(processedReport);
    }
} 