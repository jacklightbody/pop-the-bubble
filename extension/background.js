chrome.tabs.query({
    'active': true,
    'windowId': chrome.windows.WINDOW_ID_CURRENT
}, function (tabs) {
    chrome.browserAction.setIcon({path: 'alt.png'}); 
    console.log(tabs[0].url);
});