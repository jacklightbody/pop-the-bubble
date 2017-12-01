var wordThreshold = 100
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
    var page = document.createElement('div');
    page.innerHTML = doc;
    readability.cleanStyles(page);
    readability.removeScripts(page);
    removeImages(page)
    var article = readability.grabArticle(page);
    article = article.textContent || article.innerText;
    var wordCount =  article.split(" ").length;
    if(wordCount > wordThreshold){
        console.log(article);
        console.log(getArticleTopicsAndSentiments(article));
    }
}
function getArticleTopicsAndSentiments(text){
    var sentiment = new Sentimood();
    var articleSentiments = {};
    var sentences = nlp(text).sentences().out('array');
    var add, topic, sentenceSentiment, topics;
    console.log(sentences)
    for(var i = 0; i < sentences.length; i++){
        topics = nlp(sentences[i]).topics().data();
        sentenceSentiment = sentiment.analyze(sentences[i]);
        for(var j = 0; j < topics.length; j++){
            topic = topics[j].text
            add = sentenceSentiment.score;
            if(add == 0){
                continue;
            }
            if(topic in articleSentiments){
                articleSentiments[topic] = articleSentiments[topic] + add;
            }else{
                articleSentiments[topic] = add;
            }
        }
    }
    return articleSentiments;
}
function removeImages(doc){
    var images = doc.getElementsByTagName('img');
    for (var i = 0; i < images.length; i++) {
        images[i].removeAttribute('src');
    }
}