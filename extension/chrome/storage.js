/*
* User Data is the JSON that we store across all the different browsers
* Format is 
pop-the-bubble-data: {   
    sites: {
        "http://nytimes/an/article": {
            topics: [
                ["article topic 1": 1], 
                ["topic 2": -4]... where 1 and 4 are sentiments
            ]
            timestamp: 121231231231
        }
        "http://nytimes/another/article": {
            topics: [
                ["another topic": 3], 
                ["topic 2": 1]... 
            ]
            timestamp: 1238239864982
        }
    },
    topics: {
        "article topic 1": 1,
        "topic 2": -3,
        "another topic": 3
    }
    lastCleaned: 121231231230
}
*/
var storageKey = "pop-the-bubble-data";
function addSite(url, sentiments){
    // specify default values here so that if we haven't saved anything yet it doesn't fail
    var baseDS = {sites: {}, topics: {}, lastCleaned: Date.now()};
    chrome.storage.local.get({storageKey: baseDS}, function(items){
        items.forEach(function(el){
            // if it is our data then it has to have the topics dict set
            if("topics" in el){
                // first clean out the old data if needed
                if(el.lastCleaned < Date.now() - 24 * 60 * 60){
                    cleanOldData(userData);
                    userData.lastCleaned = Date.now();
                }
                // update the data and set it again
                var userData = updateUserData(el, url, sentiments);
                chrome.storage.local.set({ storageKey: userData}, function(){
                    console.log("saved successfully");
                });
            }
        });
    });
}
function updateUserData(userData, url, sentiments){
    if(url in userData.sites){
        userData.sites[url].timestamp = Date.now();
    }else{
        topicList = Object.keys(sentiments).map(function(key) {
            return [key, sentiments[key]];
        });
        updateTopicSentiments(userData, topicList)
        userData.sites[url] = {topics: topicList, timestamp = Date.now()};
    }
    return userData;
}
function cleanOldData(userData, daysBack = 14){
    var oldTimestamp = Date.now() - (daysBack * 24 * 60 * 60);
    for(var i = userData.sites.length - 1; i >= 0; i--){
        if(userData.sites[i].timestamp < oldTimestamp){
            // the site was visited more than days back ago
            // so we want to remove it from the record
            // first reverse the sentiments
            updateTopicSentiments(userData, userData.sites[i].topics, false)
            // and then remove the site from our record
            userData.sites.splice(i, 1);
        }
    }
    return userData
}
function updateTopicSentiments(userData, sentiments, add=true){
    var mult = add | 0;
    sentiments.forEach(function(el){
        userData.topics[el[0]] += mult * el[1];
    });
}