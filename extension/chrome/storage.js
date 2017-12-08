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
var baseDS = {sites: {}, topics: {}, lastCleaned: Date.now()};

function getSite(url, callback){
        console.log("test")

    chrome.storage.local.get({storageKey: baseDS}, function(el){
        console.log("tffest")

        callback(getSiteSentiments(el.storageKey, url));
    });
}
function updateSiteSentiments(url, sentiments, callback=false){
    // specify default values here so that if we haven't saved anything yet it doesn't fail
    chrome.storage.local.get({storageKey: baseDS}, function(el){
        el = el.storageKey;
        console.log(el);

        // first clean out the old data if needed
        if(el.lastCleaned < Date.now() - 24 * 60 * 60 * 1000){
            cleanOldData(userData);
            userData.lastCleaned = Date.now();
        }
        // update the data and set it again
        var userData = updateUserData(el, url, sentiments);
        if(callback){
            callback(getSiteSentiments(userData, url));
        }
        chrome.storage.local.set({storageKey: userData}, function(){
            console.log("Data Saved Successfully");
        });
    });
}

function getSiteSentiments(userData, url){
    if(url in userData.sites){
        var result = [];
        userData.sites[url].topics.forEach(function(topic){
            result.push([
                userData.topics[topic[0]],
                userData.topics[topic[1]]
            ]);
        });
        return result;
    }
    return false;
}
function updateUserData(userData, url, sentiments){
    if(url in userData.sites){
        userData.sites[url].timestamp = Date.now();
    }else{
        var topicList = Object.keys(sentiments).map(function(key) {
            return [key, sentiments[key]];
        });
        userData = updateTopicSentiments(userData, topicList);
        userData.sites[url] = {topics: topicList, timestamp: Date.now()};
    }
    return userData;
}
function cleanOldData(userData, daysBack = 14){
    var oldTimestamp = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    for(var i = userData.sites.length - 1; i >= 0; i--){
        if(userData.sites[i].timestamp < oldTimestamp){
            // the site was visited more than days back ago
            // so we want to remove it from the record
            // first reverse the sentiments
            userData = updateTopicSentiments(userData, userData.sites[i].topics, false)
            // and then remove the site from our record
            userData.sites.splice(i, 1);
        }
    }
    return userData
}
function updateTopicSentiments(userData, sentiments, add=true){
    var mult = add ? 1 : -1;
    var add;
    var topicName;
    sentiments.forEach(function(el){
        add = mult * el[1];
        topicName = el[0]
        if(topicName in userData.topics){
            userData.topics[topicName] += add;
            // Set a cap on how extreme these views can really be
            // at a certain point it doesn't actually do much
            if(userData.topics[topicName] > 100){
                userData.topics[topicName] = 100;
            }else if(userData.topics[topicName] < -100){
                userData.topics[topicName] = -100;
            }
        }else{
            userData.topics[topicName] = add;
        }
    });
    return userData;
}