class Topic{
    constructor(topic, score){
        this.text = cleanTopic(topic);
        // score refers to the importance of the topic in the document
        this.score = score
        var sentiment = new Sentimood();
        // inherent topic sentiment is whether the topic itself has some sentiment attached to it
        // e.g. the topic "bad guys" will have an intrinsic negative sentiment which we don't want to track
        this.inherentTopicSentiment = 0 | sentiment.analyze(topic).score;
        this.overallSentiment = 0;
    }

    getScore(){
        return this.score;
    }

    getSentiment(){
        return this.overallSentiment;
    }

    getTopicText(){
        return this.text;
    }
    // topic identifier will be used in css/html, get a unique representation of the string
    getTopicID(){
        return this.text.replace(/\s+/g,"");
    }

    // used when we are processing a document and updating the sentiment based on new text
    updateDocumentSentiment(sentiment){
        this.overallSentiment += (-1 * this.inherentTopicSentiment) + sentiment;
    }

    // just normalize the text a bit, stripping out quote marks and the like
    cleanTopic(topic){
        return topic.replace(/[^\w ']/g, '');
    }
    isValidTopic(){
        // first filter to make sure that our topics have a high enough score
        if(this.getScore() < MIN_KEYWORD_SCORE || this.getTopicText().length < MIN_KEYWORD_LENGTH){
            return false;
        }
        var val = false;
        var pos;

        // then make sure that each topic has a noun or gerund somewhere in it
        var item = nlp(this.text).list[0];
        for(var i = 0; i < item.terms.length; i+=1){
            pos = this.getPartOfSpeech(item.terms[i]);
            if(pos == "noun" || (pos == "verb" && this.text.endsWith("ing"))){
                return true
            }
        }
        return false;
    }

    getPartOfSpeech(word){
        var tags = word.tags
        if(tags.Noun || tags.Value || tags.NounPhrase || tags.Acronym || tags.Currency){
            return "noun";
        }else if(tags.Verb || tags.VerbPhrase){
            return "verb";
        }else if(tags.Adjective){
            return "adj";
        }else if(tags.Adverb){
            return "adv";
        }else if(tags.TitleCase || Object.keys(tags).length === 0){
            // catch nouns that we might not know
            return "noun";
        }else{
            return false;
        }
    }
}
