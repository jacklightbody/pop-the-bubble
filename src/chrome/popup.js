loadPopup();
function loadPopup(){
    getCurrentUrl(function(url){
        chrome.runtime.sendMessage({action: "getSentiments", url: url});   
        return;
    });
}
function getCurrentUrl(callback){
    chrome.tabs.query({
        active: true,
        currentWindow: true
      }, function (tabs) {
        // ...and send a request for the DOM info...
        tabs.forEach(function(tab){
            if(tab.active){
                callback(tab.url);                
            }
        });
    });
}
chrome.extension.onMessage.addListener(function(request, messageSender, sendResponse) {
    generateHtml(request);
    attachListeners(request);
});
function generateHtml(request){
    var messageDiv = document.getElementById("tos-message");
    var processing = document.getElementById("tos-default");
    if(request.action == "notarticle"){
        messageDiv.innerHTML = "This page is not an article or has no non-ignored topics";
    }else if(request.action == "sentiments"){
        var intro = document.getElementById("tos-intro");
        var detailed = document.getElementById("tos-detailed");
        var extremeTopic = request.mostExtremeTopic;
        var extremeSentiment = request.mostExtremeSentiment;
        intro.innerHTML = getMainMessage(extremeTopic, extremeSentiment);
        if(request.sentiments.length > 0){
            detailed.innerHTML = getBreakdown(request.sentiments);
        }else{
            detailed.innerHTML = "There are no non-ignored topics on this page."
        }
    }
    messageDiv.style.display = "block";
    processing.style.display = "none";
}
function attachListeners(request){
    var ignores = document.getElementsByClassName("ignore-button");
    for(var i = 0; i < ignores.length; i++) {
        var button = ignores[i];
        button.addEventListener('click', function() {
            ignoreTopic(button.dataset.topic);
            loadPopup()
        });
    }
    var more = document.getElementById("more");
    if(more == null){
        return;
    }
    more.addEventListener('click', function() {
        document.getElementById("advanced-settings").style.display = "block";
        more.style.display = "none";
        var ignore = document.getElementById("ignore-domain");
        ignore.addEventListener('click', function() {
            getCurrentUrl(function(url){
                url = new URL(url);
                console.log(url.hostname)
                ignoreDomain(url.hostname);
                loadPopup();
            });
        });
    });
}

function getMainMessage(topic, sentiment){
    if(sentiment == 0){
        return "There are no divisive topics on this page"
    }
    var partialMessage = "You've read ";
    var adj;
    var positiveSentiment = sentiment > 0;
    if(Math.abs(sentiment) < 20){
        adj = "a good "
        if(Math.abs(sentiment) < 10){
            adj = "an excellent "
        }
        partialMessage += adj +"balance of articles about "+topic+". Way to go!";
    }else if(Math.abs(sentiment) < 50){
        adj = "mostly ";
        if(positiveSentiment){
            adj += "positive ";

        }else{
            adj += "negative ";
        }
        partialMessage += adj +" articles about "+topic+"."
        partialMessage += " Maybe try searching for terms like "+getSearchLink(topic, positiveSentiment);
    }else {
        adj = "almost exclusively ";
        if(positiveSentiment){
            adj += "positive ";

        }else{
            adj += "negative ";
        }
        partialMessage += adj +" articles about "+topic+"."
        partialMessage += " You're definitely in an echo chamber, if you want to escape";
        partialMessage +=  "then try searching for things like "+getSearchLink(topic, positiveSentiment);
        partialMessage += ". You just might learn something new";
    }
    return partialMessage;
}
function getBreakdown(sentiments){
    var topic;
    var sentiment;
    var outHtml = "";
    var outCss = "<style type='text/css'>";
    sentiments.forEach(function(item){
        topic = item[0];
        sentiment = item[1];
        outHtml+=getSentimentDetail(topic, sentiment);
        outCss+=getSentimentCss(sentiment);
    });
    outCss+="</style>";
    outHtml=outCss+outHtml;
    return outHtml;
}

function getSentimentDetail(topic, sentiment){
    var resultHtml = "<div class='topic-breakdown clearfix'>";
    resultHtml +="<b>Topic: "+topic+"</b><br/>";
    resultHtml +="<span>Score: "+sentiment+"</span><br/>";
    resultHtml += "<div class='slider-container'>"
    resultHtml +="<input type='range' min='-100' max='100' value='"+sentiment+"' disabled='true' class='slider sentiment"+Math.abs(sentiment)+"'>";
    resultHtml +="<div class='slider-neg-extreme'>-100</div>";
    resultHtml +="<div class='slider-middle'>0</div>";
    resultHtml +="<div class='slider-pos-extreme'>100</div>";
    resultHtml +="</div><div class='utilities'><button class='ignore-button' data-topic='"+topic+"'>Ignore Topic</button></div></div>";
    return resultHtml;
}

function getSentimentCss(score){
    score = Math.abs(score);
    h =  Math.floor((100 - score) * 120 / 100);
    return ".sentiment"+score+"::-webkit-slider-thumb  { background: hsl("+h+", 100%, 40%)}\n";
}

function getSearchLink(topic, positiveSentiment){
    if(positiveSentiment){
        topic += " disadvantages";
    }else{
        topic += " advantages";
    }
    var safeTopic = encodeURIComponent(topic);
    var result = "<a href='https://www.google.com/search?q="+safeTopic+"'>\""+topic+"\"</a>";
    return result;
}