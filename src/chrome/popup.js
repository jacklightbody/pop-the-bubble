chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    // ...and send a request for the DOM info...
    tabs.forEach(function(tab){
        if(tab.active){
            chrome.runtime.sendMessage({action: "getSentiments", url: tab.url});
            return;
        }
    });
});

chrome.extension.onMessage.addListener(function(request, messageSender, sendResponse) {
    var messageDiv = document.getElementById("tos-message");
    var processing = document.getElementById("tos-default");
    messageDiv.style.display = "block";
    processing.style.display = "none";
    if(request.action == "notarticle"){
        messageDiv.innerHTML = "This page is not an article or has no topics";
    }else if(request.action == "sentiments"){
        var intro = document.getElementById("tos-intro");
        var detailed = document.getElementById("tos-detailed");
        var extremeTopic = request.mostExtremeTopic;
        var extremeSentiment = request.mostExtremeSentiment;
        intro.innerHTML = getMainMessage(extremeTopic, extremeSentiment);
        detailed.innerHTML = getBreakdown(request.sentiments)
    }
});
function getMainMessage(topic, sentiment){
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
    console.log(sentiments);

    var topic;
    var sentiment;
    var outHtml = "";
    sentiments.forEach(function(item){
        console.log(item);
        topic = item[0];
        sentiment = item[1];
        outHtml+=getSentimentDetail(topic, sentiment);
    });
    return outHtml;
}
function getSentimentDetail(topic, sentiment){
    var resultHtml = "<b>Topic: "+topic+"</b>";
    resultHtml += "<div class='slidecontainer clearfix'>"
    resultHtml +="<input type='range' min='-100' max='100' value='"+sentiment+"'' disabled='true' class='slider'>";
    resultHtml +="<div class='slider-neg-extreme'>-100</div>";
    resultHtml +="<div class='slider-middle'>0</div>";
    resultHtml +="<div class='slider-pos-extreme'>100</div>";
    resultHtml +="</div><br/><hr/>";
    return resultHtml;
}
function getSearchLink(topic, positiveSentiment){
    if(positiveSentiment){
        topic += " advantages";
    }else{
        topic += " disadvantages";
    }
    var safeTopic = encodeURIComponent(topic);
    var result = "<a href='https://www.google.com/search?q="+safeTopic+"'>\""+topic+"\"</a>";
    return result;
}