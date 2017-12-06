var wordThreshold = 100;
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
);
//pipeline handler
function processPage(doc){
    var article = extractText(doc.all[0].outerHTML);
    console.log(article);
    if( article.split(" ").length > wordThreshold){
        sentiments = getArticleTopicsAndSentiments(article);
        console.log(sentiments);
        addSite(document.URL, sentiments)
    }
}
// cleans the page and formats it for readability
function extractText(doc){
    // we want to create a dummy div so we can get rid of requests before they occur
    // if we add the content to a preexisting one the requests still happen
    // before we can remove them individual elements
    var page = document.createElement("div");
    page.innerHTML = doc;
    readability.cleanStyles(page);
    readability.removeScripts(page);
    removeImages(page);
    var article = readability.grabArticle(page);
    article = article.textContent || article.innerText;
    article = cleanText(article);
    return article;
}
// cleans all the text by getting rid of extra spaces, bad words
// also by lowercasing and stemming it so we have a standarized set of text
function cleanText(text){
    text = removeStopwords(text);
    var words = text.split(" ");
    var cleaned = "";
    var i;
    for(i = 0; i < words.length; i+=1){
        word = stemmer(words[i].toLowerCase());
        if(word.length > 1 || word == "a" || word == "i"){
            // don"t want any single char words that happen due to bad splitting
            // that aren"t actually words
            cleaned += " "+word;
        }
    }
    return cleaned;
}

// get rid of all images so our background page doesn"t try to load them
function removeImages(doc){
    var images = doc.getElementsByTagName("img");
    var i;
    for (i = 0; i < images.length; i+=1) {
        images[i].removeAttribute("src");
    }
}

// does the meat of the work, gets all the topics
// and their associated sentiments
function getArticleTopicsAndSentiments(text){
    var nlpText = nlp(text);
    var sentences = nlpText.sentences().out("array");

    // get the most frequent n-grams and map so each has a sentiment of 0
    // saves us a check later on
    var topicList = filterTopics(nlpText.ngrams().list, nlpText.nouns().out("array"));
    topicList.forEach(function(obj) { obj.sentiment = 0; });

    //declare all our vars
    var add;
    var sentenceSentiment;
    var substrings;
    var occurrences;
    var i;
    var j;
    var sentiment = new Sentimood();

    // we want to go sentence by sentence
    // so that we track whether each topic is good or bad
    for(i = 0; i < sentences.length; i+=1){
        sentenceSentiment = sentiment.analyze(sentences[i]);
        add = sentenceSentiment.score;
        if(add == 0){
            continue;
        }
        // check if any of our topics are in this sentence
        // if they are, then we need to record the sentiments
        // associated with them in that sentence
        // vs the overall text ex. Joe is good. Bob is bad is two seperate sentiments
        // we want joe to have a positive sentiment, and bob a negative
        // not both to have a neutral sentiment
        for(j = 0; j < topicList.length; j+=1){
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
// we only want to keep topics if they contain a noun
function filterTopics(topicList, nounList, keep = 5){
    var uniqueNounList = Array.from(new Set(nounList))
    var searchString;
    var i;
    var cleanedTopic;
    topicList = topicList.filter(function(item) {
        for(i = 0; i < uniqueNounList.length; i+=1){
            searchString = " "+uniqueNounList[i]+" ";
            cleanedTopic = " "+item.key+" "
            if(cleanedTopic.indexOf(searchString) != -1){
                return true;
            }
        }
        return false;
    });
    // Check that all our items have at least three occurrences
    // otherwise they"re not really keywords
    topicList = topicList.filter(item => item.count > 2);

    // Sort the array based on the counts
    topicList.sort(function(el1, el2) {
        // we want to discourage single word 
        return el2.key.split(" ").length^2 * el2.count - 
            el1.key.split(" ").length^2 *el1.count;
    });

    var sliced = topicList.slice(0, 10);
    return sliced;

}

// remove all the stopwords from a given text snippet
// these should never be one of our keywords but they occur frequently so we don"t want them
function removeStopwords(text){
    stopwords = ["i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you",
        "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she",
        "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs",
        "themselves", "what", "which", "who", "whom", "this", "that", "these", "those",
        "am", "is", "are", "was", "were", "bae", "been", "being", "have", "has", "had",
        "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if",
        "or", "because", "as", "until", "while", "of", "at", "by", "for", "with",
        "about", "against", "between", "into", "through", "during", "before", "after",
        "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over",
        "under", "again", "further", "then", "once", "here", "there", "when", "where",
        "why", "how", "all", "any", "both", "each", "few", "more", "most", "other",
        "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
        "very", "s", "t", "can", "will", "just", "don", "should", "now", "d", "ll", "m",
        "o", "re", "ve", "y", "ain", "aren", "couldn", "didn", "doesn", "hadn", "hasn",
        "haven", "isn", "ma", "mightn", "mustn", "needn", "shan", "shouldn", "wasn", "weren",
        "won", "wouldn"
    ]
    return text.replace(new RegExp("\\b("+stopwords.join("|")+")\\b", "g"), "");
}
