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
var storageKey = "pop-the-bubble-data";
var baseDS = {sites: {}, topics: {}, ignored:{topics:{}, domains:{}}, lastCleaned: Date.now()};
var storageDefault = {}
storageDefault[storageKey] = baseDS

// simple wrapper for all our functionality to handle the of the data
// to abstract away the chrome storage parts of it
function loadData(callback){
    // specify default values here so that if we haven't saved anything yet it doesn't fail
    chrome.storage.local.get(storageDefault, function(el){        
        var userData = el[storageKey];
        // first clean out the old data if needed
        if(userData.lastCleaned < Date.now() - 24 * 60 * 60 * 1000){
            userData = cleanOldData(userData);
            userData.lastCleaned = Date.now();
        }
        callback(userData);
    });    
}
// same thing as above but for saving data
function saveData(userData){
    var setData = {}
    setData[storageKey] = userData;
    chrome.storage.local.set(setData, function(){
        console.log("Data Saved Successfully");
        console.log(userData)
    });
}
function getSite(url, callback){
    loadData(function(userData){
        callback(getSiteSentiments(userData, url));
    });
}
function getIgnored(callback){
    loadData(function(userData){
        callback(userData.ignored);
    });
}

// does the meat of the updating topic sentiments in the right flow
// lets loadData interact with chrome
function updateSiteSentiments(url, sentiments, callback=false){
    loadData(function(userData){
        // update the data and set it again
        if(!siteShouldBeIgnored(userData, url)){
            userData = updateUserData(userData, url, sentiments);
        }

        if(callback){
            // at this stage we don't let anything modify our userData
            // but they can use it to update our icon graphics etc.
            callback(getSiteSentiments(userData, url));
        }
        saveData(userData);
    });
}

// lets the user bulk specify topics and domains to ignore
function bulkIgnore(sites, topics, callback=false){
    loadData(function(userData){
        // first off just reset all the previous ignores
        userData.ignored = {topics:{}, domains:{}}
        topics.forEach(function(topic){
            topic = topic.trim()
            if(!topicShouldBeIgnored(userData, topic)){
                // the topic isn't already getting ignored
                userData = ignoreTopic(userData, topic);
            }
        });
        sites.forEach(function(site){
            site = site.trim()
            if(!siteShouldBeIgnored(userData, site)){
                // the site isn't already getting ignored
                userData = ignoreDomain(userData, site);
            }
        });
        saveData(userData);
    });
}

function getSiteSentiments(userData, url){
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
function updateUserData(userData, url, sentiments){
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
function removeSite(userData, url){
    // first reverse the sentiments
    userData = updateTopicSentiments(userData, userData.sites[url].topics, false)
    // and then remove the site from our record
    delete userData.sites[url];
    return userData;
}
function cleanOldData(userData, daysBack = 14){
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
// These next few functions are sisters, in that they are triggered when the user ignores an domain or topic
// and we need to go over all our old information and see if any of it needs to be cleaned out
// to reflect this new preference
function ignoreDomainWrapper(site){
    loadData(function(userData){
        userData = ignoreDomain(userData, site);
        saveData(userData);
    });
}
function ignoreDomain(userData, domain){
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
// remove all scores for a topic and add it to the ignored list
// so that we don't keep tracking these topics
function ignoreTopicWrapper(topic){
    loadData(function(userData){
        userData = ignoreTopic(userData, topic);
        saveData(userData);
    });
}
function ignoreTopic(userData, ignoreTopic){
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
function resetTopic(resetTopic){
    loadData(function(userData){
        Object.keys(userData.topics).forEach(function(topic) {
            if(topic == resetTopic){
                userData.topics[topic] = 0;
            }
        });
        saveData(userData);
    });
}

function siteShouldBeIgnored(userData, url){
    try{
        var host = new URL(url).hostname;
        return (host in userData.ignored.domains);
    }catch(err){
        return false;
    }
}
function topicShouldBeIgnored(userData, topic){
    return (topic in userData.ignored.topics);
}

function updateTopicSentiments(userData, sentiments, add=true){
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
