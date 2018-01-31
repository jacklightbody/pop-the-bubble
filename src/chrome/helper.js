// Simple helper functions that we need in the frontend (popup.js) and backend (background.js)

// simple helper to limit the impact of any one article
// by capping all sentiments from that one article to the range -cap to cap
function capSentiments(sentiments, cap = 20){
    Object.keys(sentiments).forEach(function(key) {
        // just set an artificial cap on it so one article doesn't skew too much
        sentiments[key] = capSentiment(sentiments[key], cap)
    });
    return sentiments
}
// just normalize the topics a bit, stripping out quote marks and the like
function cleanTopic(topic){
    return topic.replace(/[^\w ']/g, '');
}
// Set a cap on how extreme these views can really be
// at a certain point it doesn't actually do much to read one more article
function capSentiment(score, cap){
    return score <= -1 * cap ? -1*min  : score >= cap ? cap : score;
}