chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.changeIcon) {
            chrome.browserAction.setIcon({path:"alt.png"});
        }
    }
);
chrome.tabs.onActivated.addListener(
    function(activeInfo) {
        chrome.browserAction.setIcon({path:"icon.png"});
    }
)