from flask import Flask, request, render_template,jsonify
from goose import Goose
import nltk
import unidecode
import operator
import gensim
from textblob import TextBlob

app = Flask(__name__)
top_features = 10
sim_threshold = top_features/3
# each article is a dict of tupels k(v1,v2), k being the url
# and where the v1 is the top features
# and v2 is the overall sentiment of the article
articles = {}
token_dict = {}
f = open("stopwords.txt")
stopwords = [w for w in f]

@app.route('/')
@app.route('/index')
def index():
    return "Hello!"



def tokenize(tokens):
    stemmer = nltk.stem.porter.PorterStemmer()
    tokens = nltk.word_tokenize(text)
    for item in tokens:
        stemmed.append(stemmer.stem(item))
    return stemmed

def clean_text(text):
    filtered = [w for w in text if not w in stopwords]
    lowers = filtered.lower()
    no_punctuation = lowers.translate(None, string.punctuation)
    token_dict[file] = no_punctuation


tfidf_model = gensim.models.TfidfModel.load('tfidf.model')

@app.route('/extract')
def extract():
    url = request.args.get('url')
    if url in articles:
        return str(0)
    g = Goose()
    article = g.extract(url=url)
    title = []
    headers = {'Content-type': 'application/json', 'Accept': 'application/json'}
    if len(article.title) > 5 and len(article.cleaned_text) > 200:
        blob = TextBlob(article.cleaned_text)
        topic_score = blob.sentiment.polarity
        print("POLARITY")
        print(topic_score)
        ids = {}
        doc_words = clean_text(text)
        query_doc_bow = dictionary.doc2bow(doc_words)
        query_doc_tf_idf = tf_idf[query_doc_bow]
        sims = sims[query_doc_tf_idf]
        sorted_annotations = sorted(ids.items(), key=operator.itemgetter(1), reverse=True)[:top_features]
        annotations_set = set([a[0] for a in sorted_annotations])
        for article in articles:
            sim = 0
            for annotation in annotations_set:
                # each annotation is a frequent word 
                # check if this other article has the word in its top features
                # if it does then they are at least somewhat similar
                if annotation in article[1]:
                    sim += 1
            # if we're similar enough
            # then add the articles sentiment to our score
            if sim > sim_threshold:
                topic_score += article[2]
        #finally add the current article to our set of articles
        articles[url] = (annotations_set, blob.sentiment.polarity)
        print(articles)
        print("TOPIC_SCORE")
        print(topic_score)
        return str(topic_score)
 
if __name__ == "__main__":
    app.run(debug=True)