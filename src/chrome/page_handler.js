//pipeline handler
function processPage(doc, callback){
    if(!doc){
        callback([]);
    }
    console.log("LOADING")
    try{
        let article = extractText(doc);
        console.log(article);
        if(article.split(" ").length > MINIMUM_WORDS_IN_TEXT){
            rake(
                article,
                STOPWORDS,
                MIN_KEYWORD_CHAR_LENGTH,
                MAX_NGRAM_KEYWORDS,
                MIN_KEYWORD_FREQUENCY
            ).then(function(rawTopics){
                console.log("THEN")
                console.log(rawTopics)
                filteredTopics = mapAndFilterTopics(rawTopics, KEYWORDS_TO_KEEP);
                console.log(filteredTopics);
                if(filteredTopics.length < 1){
                    throw "Article doesn't contain any topics";
                }
                topics = getTopicSentiments(article, filteredTopics);
                console.log(topics)
                for(var i = 0; i < topics.length; i+=1){
                    decorateTopic(topics[i])
                }
            });
        }
    }catch(err){
        console.log(err);
    }
}

// does the meat of the work, gets all the topics and their associated sentiments
const getTopicSentiments = function  (text, topicList) {
    var nlpText = nlp(text);
    var sentences = nlpText.sentences().out("array");
    var sentiment = new Sentimood();


    // get the most frequent n-grams and map so each has a sentiment of 0
    // saves us a check later on
    // also get the sentiment for each topic to normalize it
    // so that the sentiment of the topic itself doesn't effect the sentiment of the sentences
    // so for example a topic like negative prices will have a positive normalized score
    //declare all our vars
    var sentenceSentimentScore;
    var substrings;
    var occurrences;

    // we want to go sentence by sentence
    // so that we track whether each topic is good or bad
    for(var i = 0; i < sentences.length; i+=1){
        sentenceSentiment = sentiment.analyze(sentences[i]);
        sentenceSentimentScore = sentenceSentiment.score;
        if(sentenceSentimentScore == 0){
            continue;
        }
        // check if any of our topics are in this sentence
        // if they are, then record the sentiments associated with them in that sentence
        // vs the overall text ex. Joe is good. Bob is bad is two seperate sentiments
        // we want joe to have a positive sentiment, and bob a negative
        // not both to have a neutral sentiment
        for(var j = 0; j < topicList.length; j+=1){
            substrings = sentences[i].split(topicList[j].getTopicText());
            occurrences = substrings.length - 1;
            if(occurrences > 0){
                topicList[j].updateDocumentSentiment(sentenceSentimentScore)
            }
        }
    }
    return topicList;
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
    var articleLines = article.split("\n");
    article = "";
    // too many image descriptions or social mdeia stuff was getting scraped in
    // take care of that here by mandating that each P has at least 10 words
    articleLines.forEach(function(line){
        var words = line.split(" ");
        if(words.length > MIN_LINE_WORDS){
            article += line +" \n";
        }
    });

    return article;
}

// get our top topics from all the possible topics and their frequencies
// we only want to keep topics if they contain a noun
function mapAndFilterTopics(topics){
    // covert our raw topics to an Topic object
    // so [{key: score, key2:score} -> [Topic1, Topic2]
    var mappedTopics = Object.keys(topics).map(function (topic) {
        return new Topic(topic, topics[topic]);
    });
    var topicList = mappedTopics.filter(function(topic) {
        return topic.isValidTopic();
    });
    topicList.sort(function(t1, t2) {
        // sort in desc order of topic score
        return t2.getScore() - t1.getScore();
    });
    return topicList.slice(0, KEYWORDS_TO_KEEP);
}


// get rid of images srcs so our background page doesn"t try to load them
function removeImages(doc){
    var images = doc.getElementsByTagName("img");
    var i;
    for (i = 0; i < images.length; i+=1) {
        images[i].removeAttribute("src");
    }
}
