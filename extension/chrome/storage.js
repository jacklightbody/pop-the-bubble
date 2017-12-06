/*
* User Data is the JSON that we store across all the different browsers
* Format is 
{   
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
}
*/
function jsonifyData(userData, url, sentiments){
    userData = JSON.parse(userData)
    if(url in userData.sites){
        userData.sites[url].timestamp = Date.now();
    }else{
        topicList = Object.keys(sentiments).map(function(key) {
            return [key, sentiments[key]];
        });
        updateTopicSentiments(userData, topicList)
        userData.sites[url] = {topics: topicList, timestamp = Date.now()};
    }
    return JSON.stringify(userData);
}
function cleanOldData(userData, daysBack = 14){
    userData = JSON.parse(userData)
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
    return JSON.stringify(userData);
}
function updateTopicSentiments(userData, sentiments, add=true){
    var mult = add | 0;
    sentiments.forEach(function(el){
        userData.topics[el[0]] += mult * el[1];
    });
}