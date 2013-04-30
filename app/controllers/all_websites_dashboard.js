function L(key)
{
    return require('L')(key);
}

if (OS_IOS) {
    $.pullToRefresh.init($.websitesTable);
}

var accountsCollection = Alloy.Collections.appAccounts;
var accountModel       = accountsCollection.lastUsedAccount();

var args     = arguments[0] || {};
var autoOpen = true;
if ('undefined' !== (typeof args.openWebsiteAutomaticallyIfOnlyOneWebsiteIsAvailable) &&
    null !== args.openWebsiteAutomaticallyIfOnlyOneWebsiteIsAvailable) {
    autoOpen = args.openWebsiteAutomaticallyIfOnlyOneWebsiteIsAvailable;
}

var lastUsedWebsite = null;

function websiteChosen(siteModel) 
{
    $.trigger('websiteChosen', {site: siteModel, account: accountModel});
}

function doChooseAccount()
{
    var accounts = Alloy.createController('accounts_selector');
    accounts.on('accountChosen', onAccountChosen);
    accounts.open();
}

function onAccountChosen(account)
{
    showLoadingMessage();

    accountModel            = account;
    var entrySiteCollection = Alloy.createCollection('piwikWebsites');
    entrySiteCollection.fetch({
        params: {limit: 2},
        account: accountModel,
        success: function (entrySiteCollection) {

            if (autoOpen && 1 == entrySiteCollection.length) {
                websiteChosen(entrySiteCollection.first());
            } else if (!entrySiteCollection.length) {
                // TODO no access to any account
                console.error('no access to any website');
            } else {
                fetchListOfAvailableWebsites(entrySiteCollection.first());
            }
        }
    });
}

function doSelectWebsite(event)
{
    if (!event || !event.rowData || null === event.rowData.modelid) {
        console.log('ModelID not defined, cannot select website');
        return;
    }

    var id      = event.rowData.modelid;
    var website = $.piwikProcessedReport.get(id);

    if (!website) {
        console.log('websiteModel not found in collection, cannot select website');
        return;
    }

    var siteModel = Alloy.createModel('PiwikWebsites', {idsite: website.get('reportMetadata').idsite,
                                                        name: website.get('label')});
    websiteChosen(siteModel);
}

var reportRowsCtrl = null;
function onStatisticsFetched(statisticsCollection)
{
    showReportContent();

    if ($.reportGraphCtrl) {
        $.reportGraphCtrl.update(statisticsCollection, accountModel);
    }
}

function showReportContent()
{
    if (OS_IOS) {
        $.pullToRefresh.refreshDone();
    } 

    $.loading.hide();
}

function showLoadingMessage()
{
    if (OS_IOS) {
        $.pullToRefresh.refresh();
    }
    
    $.loading.show();
}

function doCancelSearchWebsite() 
{
    if (!$.searchBar) {

        return;
    }
    
    $.searchBar.value = '';
    $.searchBar.blur();

    doRefresh();
}

function doSearchWebsite(event) 
{
    showLoadingMessage();

    $.piwikProcessedReport.fetchProcessedReports('nb_visits', {
        account: accountModel,
        params: {
            period: 'day',
            date: 'today',
            enhanced: 1,
            idSite: lastUsedWebsite.id,
            apiModule: "MultiSites",
            apiAction: "getAll",
            pattern: $.searchBar.value,
            filter_limit: Alloy.CFG.numDisplayedWebsitesInDashboard
        },
        error: function () {
            $.piwikProcessedReport.trigger('error', {type: 'loadingProcessedReport'});
        },
        success: onStatisticsFetched
    });

    $.searchBar.blur();
}

function doRefresh()
{
    if (lastUsedWebsite) {
        fetchListOfAvailableWebsites(lastUsedWebsite);
    }
}

function fetchListOfAvailableWebsites(site) 
{
    lastUsedWebsite = site;
    showLoadingMessage();

    var reportDate = require('session').getReportDate();

    $.piwikProcessedReport.fetchProcessedReports("nb_visits", {
        account: accountModel,
        params: {
            period: reportDate.getPeriodQueryString(), 
            date: reportDate.getDateQueryString(), 
            idSite: site.id,
            apiModule: "MultiSites",
            apiAction: "getAll",
            filter_limit: Alloy.CFG.numDisplayedWebsitesInDashboard
        },
        error: function () {
            $.piwikProcessedReport.trigger('error', {type: 'loadingProcessedReport'});
        },
        success: onStatisticsFetched
    });
}

function isNegativeEvolution(evolution)
{
    return (evolution && '-' == (evolution+'').substr(0, 1));
}

function formatWebsite(model)
{
    var evolution = model.get('visits_evolution');

    if (isNegativeEvolution(evolution)) {
        model.set('evolution_color', '#800000');
    } else {
        model.set('evolution_color', '#008000');
    }

    return model;
}

$.piwikProcessedReport.on('error', function () {
    // TODO what should we do in this case?
    showReportContent();
});

exports.close = function () {
    require('layout').close($.index);
    $.destroy();
};

exports.open = function (alreadyOpened) {
    showLoadingMessage();

    onAccountChosen(accountModel);

    require('layout').open($.index);
};