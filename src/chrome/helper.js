// Simple helper functions that we need in the frontend (popup.js) and backend (background.js)
// just normalize the topics a bit, stripping out quote marks and the like
function cleanTopic(topic){
    return topic.replace(/[^\w ']/g, '');
}
// Set a cap on how extreme these views can really be
// at a certain point it doesn't actually do much to read one more article
function capSentiment(score, cap){
    return score <= -1 * cap ? -1*cap  : score >= cap ? cap : score;
}