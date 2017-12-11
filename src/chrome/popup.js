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
    var messageDiv = document.getElementById("pop-the-bubble-message");

    if(request.action == "notarticle"){
        messageDiv.innerHTML = "This Page is not an Article";
    }else if(request.action == "sentiments"){
        var extremeTopic = request.mostExtremeTopic;
        var extremeSentiment = request.mostExtremeSentiment;
        var partialMessage = "You've read ";
        var adj;
        var positiveSentiment = extremeSentiment > 0;
        if(Math.abs(extremeSentiment) < 20){
            adj = "a good "
            if(Math.abs(extremeSentiment) < 10){
                adj = "an excellent "
            }
            partialMessage += adj +"balance of articles about "+extremeTopic+". Way to go!";
        }else if(Math.abs(extremeSentiment) < 50){
            adj = "mostly ";
            if(positiveSentiment){
                adj += "positive ";

            }else{
                adj += "negative ";
            }
            partialMessage += adj +" articles about "+extremeTopic+"."
            partialMessage += " Maybe try searching for terms like "+getSearchLink(extremeTopic, positiveSentiment);
        }else {
            adj = "almost exclusively ";
            if(positiveSentiment){
                adj += "positive ";

            }else{
                adj += "negative ";
            }
            partialMessage += adj +" articles about "+extremeTopic+"."
            partialMessage += " You're definitely in an echo chamber, if you want to escape";
            partialMessage +=  "then try searching for things like "+getSearchLink(extremeTopic, positiveSentiment);
            partialMessage += ". You just might learn something new";
        }
        messageDiv.innerHTML = partialMessage;
    }
});
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