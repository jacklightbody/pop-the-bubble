var wordThreshold = 100;
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.pageLoaded) {
            console.log("2")
            processPage(request.doc, request.loc);
        }
        if (request.action == "getSentiments"){
            console.log("1")
            processPage(false, request.url);
        }
    }
);
chrome.tabs.onActivated.addListener(
    function(activeInfo) {
        chrome.tabs.get(activeInfo.tabId, function(tab) {
            processPage(false, tab.url);
        });
    }
);
//pipeline handler
function processPage(doc, url){
    getSite(url, function(sentiments){
        if(sentiments){
            console.log("Already Visted Article");
            updateExtensionInfo(sentiments);
        }else{
            console.log("New URL");
            if(!doc){
                console.log(doc);
                invalidArticle();
                return;
            }
            try{
                var article = extractText(doc);
            }catch(err){
                console.log(err);
                invalidArticle();
                return;
            }
            console.log(article);
            if(article.split(" ").length > wordThreshold){
                sentiments = getArticleTopicsAndSentiments(article);
                console.log(sentiments);
                updateSiteSentiments(url, sentiments, function(sentiments){
                    console.log(sentiments);
                    updateExtensionInfo(sentiments);
                });
            }
        }
    });
}
function invalidArticle(){
    console.log("Not an Article");
    updateIcon(0);
    chrome.runtime.sendMessage({action: "notarticle"});
}

function updateExtensionInfo(sentiments){
    var sentiment = getMostExtremeSentiment(sentiments);
    var sentimentTopic = sentiment[0];
    sentiment = sentiment[1];
        chrome.runtime.sendMessage({
        action: "sentiments", 
        sentiments: sentiments,
        mostExtremeTopic: sentimentTopic,
        mostExtremeSentiment: sentiment
    });
    updateIcon(sentiment);
}

function updateIcon(sentiment){
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("2d"); 
    ctx.clearRect(0, 0, canvas.width, canvas.height);  

    //draw triangle
    ctx.beginPath();
    ctx.moveTo(50, 52.5);
    ctx.lineTo(25, 100);
    ctx.lineTo(75, 100);
    ctx.fill();

    //draw balance line- has to pass through 50, 50
    var postiveY = 50 - (sentiment/2)
    var negativeY = 50 + (sentiment/2)
    ctx.beginPath();
    ctx.moveTo(100, negativeY);
    ctx.lineTo(0, postiveY);
    ctx.lineWidth=5;
    ctx.stroke();
    chrome.browserAction.setIcon({imageData:ctx.getImageData(0, 0, canvas.width,canvas.height)});
}
function getMostExtremeSentiment(sentiments){
    console.log(sentiments)
    maxSentiment = 0;
    maxSentimentTopic = "";
    sentiments.forEach(function(topicSentiment){
        if(Math.abs(topicSentiment[1]) > Math.abs(maxSentiment)){
            maxSentiment = topicSentiment[1];
            maxSentimentTopic = topicSentiment[0];
        }
    });
    return [maxSentimentTopic, maxSentiment]
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
    var unescaped = document.createElement("div");
    article = _.unescape(article);
    unescaped.innerHTML = article
    article = unescaped.textContent || unescaped.innerText || article;
    article = cleanText(article);
    return article;
}

// cleans all the text by getting rid of extra spaces, bad words
// also by lowercasing and lemmatizing it so we have a standarized set of text
function cleanText(text){
    text = removeStopwords(text);
    text = text.replace(/[^\w.?!\s]|_/g, "")
         .replace(/\s+/g, " ");
    // get rid of non alphanumeric/sentence delimiting characters

    var nlpText = nlp(text);
    var cleaned = "";
    var i;
    var j;
    var pos;
    var lemmatizedWord;
    var lemmatizer = new Lemmatizer();

    for(j = 0; j < nlpText.list.length; j+=1){
        for(i = 0; i < nlpText.list[j].terms.length; i+=1){
            // conver words to lower case and lemmatize if we can
            // we need P.O.S. for better lemmatization so get those too
            word = nlpText.list[j].terms[i].normal.toLowerCase();
            pos = getPartOfSpeech(nlpText.list[j].terms[i]);
            if(pos){
                lemmatizedWord = lemmatizer.only_lemmas(word, pos)[0];  
                if(lemmatizedWord){
                    word = lemmatizedWord;
                }
            }
            cleaned += " "+word;
        }
        cleaned += "."
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
    var topicList = filterTopics(nlpText.ngrams().list);
    var topicSentiments = {}
    topicList.forEach(function(sentiment){
        topicSentiments[sentiment.key] = 0;
    });
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
                topicSentiments[topicList[j].key] += add;
                // just set an artificial cap on it so one article doesn't skew too much
                if(topicSentiments[topicList[j].key] > 20){
                    topicSentiments[topicList[j].key] = 20;
                }else if(topicSentiments[topicList[j].key] < -20){
                    topicSentiments[topicList[j].key] = -20;
                }
            }
        }
    }
    return topicSentiments;
}

// get our top topics from all the possible topics and their frequencies
// we only want to keep topics if they contain a noun
function filterTopics(topicList, keep = 5){
    var searchString;
    var i;
    var cleanedTopic;
    topicList = topicList.filter(function(item) {
        for(i = 0; i < item.terms.length; i+=1){
            if(getPartOfSpeech(item.terms[i]) == "noun"){
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

    var sliced = topicList.slice(0, 3);
    return sliced;

}
function getPartOfSpeech(word){
    var tags = word.tags
    if(tags.Noun || tags.Value || tags.NounPhrase || tags.Acronym || tags.Currency){
        return "noun";
    }else if(tags.Verb || tags.VerbPhrase){
        return "verb";
    }else if(tags.Adjective){
        return "adj";
    }else if(tags.Adverb){
        return "adv";
    }else if(tags.TitleCase || Object.keys(tags).length === 0){
        // catch nouns that we might not know
        return "noun";
    }else{
        return false;
    }
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
