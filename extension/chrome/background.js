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
//pipeline handler
function processPage(doc){
    var article = cleanArticle(doc)
    if( article.split(" ").length > wordThreshold){
        sentiments = getArticleTopicsAndSentiments(article);
    }
}
// cleans the page and formats it for readability
function cleanArticle(doc){
    // we want to create a dummy div so we can get rid of requests before they occur
    // if we add the content to a preexisting one the requests still happen 
    // before we can remove them individual elements
    var page = document.createElement('div');
    page.innerHTML = doc;
    readability.cleanStyles(page);
    readability.removeScripts(page);
    removeImages(page)
    var article = readability.grabArticle(page);
    return article.textContent || article.innerText;
}

// get rid of all images so our background page doesn't try to load them
function removeImages(doc){
    var images = doc.getElementsByTagName('img');
    for (var i = 0; i < images.length; i++) {
        images[i].removeAttribute('src');
    }
}

// does the meat of the work, gets all the topics
// and their associated sentiments
function getArticleTopicsAndSentiments(text){
    // clean up the text
    text = removeStopwords(text);
    var sentences = nlp(text).sentences().out('array');

    // get the most frequent n-grams and map so each has a sentiment of 0
    // saves us a check later on
    var topicList = filterTopics(nlp(text).ngrams().list);
    topicList.forEach(function(obj) { obj.sentiment = 0; });

    //declare all our vars
    var add, sentenceSentiment, substrings, occurrences;
    var sentiment = new Sentimood();

    // we want to go sentence by sentence so that we track whether 
    for(var i = 0; i < sentences.length; i++){
        sentenceSentiment = sentiment.analyze(sentences[i]);
        add = sentenceSentiment.score;
        if(add == 0){
            continue;
        }
        // check if any of our topics are in this sentence
        // if they are, then we need to record the sentiments associated with them in that sentence
        // vs the overall text ex. Joe is good. Bob is bad is two seperate sentiments
        // we want joe to have a positive sentiment, and bob a negative
        // not both to have a neutral sentiment
        for(var j = 0; j < topicList.length; j++){
            substrings = sentences[i].split(topicList[j].key);
            occurrences = substrings.length - 1;
            if(occurrences > 0){
                topicList[topicList[j].key] = add;
            }
        }
    }
    return topicList;
}

// get our top topics from all the possible topics and their frequencies
function filterTopics(topicList, keep = 5){
    // Sort the array based on the counts
    topicList.sort(function(el1, el2) {
        return el2.count - el1.count;
    }); 

    // Check that all our items have at least three occurrences
    // otherwise they're not really keywords
    var sliced = topicList.slice(0, 5);
    return sliced.filter(item => item.count > 2);

}

// remove all the stopwords from a given text snippet
// these should never be one of our keywords but they occur frequently so we don't want them
function removeStopwords(text){
    stopwords = ['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
        'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she',
        'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
        'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 
        'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 
        'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 
        'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 
        'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 
        'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 
        'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 
        'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 
        'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 
        'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'd', 'll', 'm',
        'o', 're', 've', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 
        'haven', 'isn', 'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren',
        'won', 'wouldn'
    ]
    return text.replace(new RegExp('\\b('+stopwords.join('|')+')\\b', 'g'), '');

}
