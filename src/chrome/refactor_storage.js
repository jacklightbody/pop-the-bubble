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
    },
    ignored {
        topics {
            "ignored topic 1": 0,
            "ignored topic 2": 0 
        }, 
        domains {
            "mail.google.com": 0,
            "myprivatesite.com": 0
        }
    }
    lastCleaned: 121231231230
}
*/
class Storage{
    STORAGE_KEY = "pop-the-bubble-data";

    constructor() {
        var storageDefault = {}
        storageDefault[STORAGE_KEY] = {sites: {}, topics: {}, ignored:{topics:{}, domains:{}}, lastCleaned: Date.now()};
    }

    // Simple wrapper for all our functionality to handle the of the data
    // to abstract away the chrome storage parts of it
    loadData(callback){
        // specify default values here so that if we haven't saved anything yet it doesn't fail
        chrome.storage.local.get(storageDefault, function(el){        
            var userData = el[STORAGE_KEY];
            // first clean out the old data if needed
            // TODO: Should change to a half life time decay scoring fn- can store 2 values, score and time updates
            // and then get new score from that data
            if(userData.lastCleaned < Date.now() - 24 * 60 * 60 * 1000){
                userData = cleanOldData(userData);
                userData.lastCleaned = Date.now();
            }
            callback(userData);
        });    
    }

    // Wrapper for saving data so other utilities don't have to touch it
    saveData(userData){
        var setData = {}
        setData[STORAGE_KEY] = userData;
        chrome.storage.local.set(setData, function(){
            console.log("Data Saved Successfully");
            console.log(userData);
        });
    }

    // Finally a wrapper to load the data, process it based on some passed in value, and then save it
    loadProcessUpdate(dataKey, process_fn){
        loadData(function(userData){
            userData = process_fn(userData, dataKey);
            saveData(userData);
        });
    }
    
    getSite(url, callback){
        loadData(function(userData){
            callback(getSiteSentiments(userData, url));
        });
    }

    // does the meat of the updating topic sentiments in the right flow
    updateSiteSentiments(url, sentiments, callback=false){
        loadData(function(userData){
            // update the data and set it again
            if(!siteShouldBeIgnored(userData, url)){
                userData = updateSiteSentiments(userData, url, sentiments);
            }
            saveData(userData);

            if(callback){
                // updates to userData will now have no effect so we can safely share it with the callback
                // but they can use it to update our icon graphics etc.
                callback(getSiteSentiments(userData, url));
            }
        });
    }
    
    updateSiteSentiments(userData, url, sentiments){
        if(url in userData.sites){
            // overwrite if we have to
            // easiest way to do so is just to get rid of what we already have
            userData = removeSite(userData, url)
        }
        var topicList = Object.keys(sentiments).map(function(key) {
            return [key, sentiments[key]];
        });
        userData = updateTopicSentiments(userData, topicList);
        userData.sites[url] = {topics: topicList, timestamp: Date.now()};
        return userData;
    }

    getSiteSentiments(userData, url){
        if(siteShouldBeIgnored(userData, url)){
            return null;
        }
        if(url in userData.sites){
            // any time we get a site sentiment we're visiting it
            // update the timestamp associated with it
            userData.sites[url].timestamp = Date.now();
            var result = [];
            userData.sites[url].topics.forEach(function(topic){
                result.push([
                    topic[0],
                    userData.topics[topic[0]],
                    topic[1] // we want to return the site score as well as overall to allow for editing
                ]);
            });
            return result;
        }
        return false;
    }
    removeSite(userData, url){
        // first reverse the sentiments
        userData = updateTopicSentiments(userData, userData.sites[url].topics, false)
        // and then remove the site from our record
        delete userData.sites[url];
        return userData;
    }
    cleanOldData(userData, daysBack = 14){
        var oldTimestamp = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
        Object.keys(userData.sites).forEach(function(url) {
            if(userData.sites[url].timestamp < oldTimestamp){
                // the site was visited more than days back ago
                // so we want to remove it from the record
                userData = removeSite(userData, url);
            }
        });
        return userData
    }

    ignoreDomain(userData, domain){
        try{
            let url = new URL(domain);
            domain = url.hostname;
        } finally {
            Object.keys(userData.sites).forEach(function(url) {
                if(new URL(url).hostname == domain){
                    // the user just told us ignore all data from this domain
                    // so we need to remove it 
                   userData = removeSite(userData, url)
                }
            });
            userData.ignored.domains[domain] = 0;
            return userData;
        }
    }

    ignoreTopic(userData, ignoreTopic){
        Object.keys(userData.sites).forEach(function(url) {
            userData.sites[url].topics.forEach(function(topic, index, object) {
                if(topic[0].valueOf() == ignoreTopic.valueOf()){
                    object.splice(index, 1);
                }
            });
        });
        Object.keys(userData.topics).forEach(function(topic) {
            if(topic == ignoreTopic){
                delete userData.topics[topic];
            }
        });
        userData.ignored.topics[ignoreTopic] = 0;
        return userData;
    }

    // Set overall score for a topic to 0 to reset
    resetTopic(userData, resetTopic){
        Object.keys(userData.topics).forEach(function(topic) {
            if(topic == resetTopic){
                userData.topics[topic] = 0;
            }
        });
        return userData;
    }

    siteShouldBeIgnored(userData, url){
        try{
            var host = new URL(url).hostname;
            return (host in userData.ignored.domains);
        }catch(err){
            return false;
        }
    }
    topicShouldBeIgnored(userData, topic){
        return (topic in userData.ignored.topics);
    }

    updateTopicSentiments(userData, sentiments, add=true){
        var mult = add ? 1 : -1;
        var add;
        var topicName;
        sentiments.forEach(function(el){
            add = mult * el[1];
            topicName = el[0]
            if(topicName in userData.topics){
                userData.topics[topicName] = capSentiment(userData.topics[topicName] + add)
            }else{
                userData.topics[topicName] = add;
            }
        });
        return userData;
    }

}