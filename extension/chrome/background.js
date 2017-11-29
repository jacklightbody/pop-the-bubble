chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.pageLoaded) {
            processPage(request.doc);
            chrome.browserAction.setIcon({path:"alt.png"});
        }
    }
);
chrome.tabs.onActivated.addListener(
    function(activeInfo) {
        chrome.browserAction.setIcon({path:"icon.png"});
    }
)
function processPage(doc){
    page = document.createElement('div');
    page.innerHTML = doc;
    readability.cleanStyles(page);
    readability.removeScripts(page);
    var article = readability.grabArticle(page);
    article = article.textContent || article.innerText;
    console.log(article);
}