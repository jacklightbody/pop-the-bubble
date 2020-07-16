// cleans the page and formats it for readability
function extractText(doc){

    // we want to create a dummy div so we can get rid of requests before they occur
    // if we add the content to a preexisting one the requests still happen
    // before we can remove them individual elements
    var page = document.createElement("div");
    page.innerHTML = doc;
    readability.cleanStyles(page);
    readability.removeScripts(page);
    removeImages(page);
    var article = readability.grabArticle(page);
    article = article.textContent || article.innerText;
    var unescaped = document.createElement("div");
    article = _.unescape(article);
    unescaped.innerHTML = article
    article = unescaped.textContent || unescaped.innerText || article;
    var articleLines = article.split("\n");
    article = "";
    // too many image descriptions or social mdeia stuff was getting scraped in
    // take care of that here by mandating that each P has at least 10 words
    articleLines.forEach(function(line){
        var words = line.split(" ");
        if(words.length > MIN_LINE_WORDS){
            article += line +" \n";
        }
    });

    return article;
}


// get rid of all images so our background page doesn"t try to load them
function removeImages(doc){
    var images = doc.getElementsByTagName("img");
    var i;
    for (i = 0; i < images.length; i+=1) {
        images[i].removeAttribute("src");
    }
}
