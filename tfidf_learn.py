import nltk
import os
import re
import gensim
def main(input_file='textc.txt', output_file='tfidf.model'):
    with open(input_file) as file:
        doc = file.read()
        doc = re.sub('[^A-Za-z .-]+', ' ', doc)
        doc.replace('@', '')
        gen_docs = [[w.lower() for w in nltk.word_tokenize(doc)]]
        dictionary = gensim.corpora.Dictionary(gen_docs)
        print(dictionary)
        corpus = [dictionary.doc2bow(gen_doc) for gen_doc in gen_docs]
        tf_idf = gensim.models.TfidfModel(corpus)
        tf_idf.save(output_file)    

if __name__ == '__main__':
    download_dir = os.getcwd()+'/nltk_data/'
    nltk.data.path.append(download_dir)
    nltk.download('punkt', download_dir=download_dir)
    main()