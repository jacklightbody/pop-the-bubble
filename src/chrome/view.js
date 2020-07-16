COLOR_PALETTES = {
    light:{
        start: [255,247,194],
        end: [255,21,16]
    }
};

function decorateTopic(topic) {
    var elements = [...document.body.getElementsByTagName('*')];
    var regex = new RegExp(topic.getTopicText(), "gi");
    var tag, elementColor, currentColor, args, offset, newTextNode;
    elements.forEach(parent =>{
        parent.childNodes.forEach(child =>{
            if(child.nodeType === 3){
                var previousSplit = 0;
                child.data.replace(regex, function(all) {
                    var args = [].slice.call(arguments),
                    offset = args[args.length - 2],
                    newTextNode = child.splitText(offset+previousSplit), tag;
                    previousSplit -= child.data.length + all.length;
                    newTextNode.data = newTextNode.data.substr(all.length);
                    tag = createTopicTag(parent, args[0], topic)
                    child.parentNode.insertBefore(tag, newTextNode);
                    child = newTextNode;
                });
                regex.lastIndex = 0;
            }
        });
    });
}

function createTopicTag(parentEl, matchedText, topic){
    var relativeScore = Math.abs(topic.getSentiment())/MAX_OVERALL_TOPIC_SENTIMENT;
    var fullTopicID = 'tos_ext-t-'+topic.getTopicID()

    tag = document.createElement("span");
    tag.className = fullTopicID + " tos_ext-topic"
    tag.textContent = matchedText;
    currentColor = getComputedStyle(parentEl).color
    palette = chooseColorPallette(currentColor)
    elementColor = getRGBColorOnGradient(palette.start, palette.end, relativeScore);
    tag.style.borderColor = elementColor;
    return tag;
}

function chooseColorPallette(currentRgbString){
    currentRgbString = currentRgbString.split("(")[1];
    currentRgbString = currentRgbString.split(")")[0];
    var rgbArr = currentRgbString.split(",");
    rgbArr = rgbArr.map(x => parseFloat(x.trim()));
    bestMatch = COLOR_PALETTES.light;
    bestMatchDistance = 1000;

    for (const [, palette] of Object.entries(COLOR_PALETTES)) {
        colorDistance = deltaE(rgbArr, palette.start)
        if (colorDistance < bestMatchDistance){
            bestMatchDistance = colorDistance;
            bestMatch = palette
        }
    }
    return bestMatch
}

function getRGBColorOnGradient(start, end, score) {
    var w = score * 2 - 1;
    var w1 = (w/1+1) / 2;
    var w2 = 1 - w1;
    var rgb = [Math.round(end[0] * w1 + start[0] * w2),
        Math.round(end[1] * w1 + start[1] * w2),
        Math.round(end[2] * w1 + start[2] * w2)];

    return 'rgb('+rgb.join()+')';
}


// maybe use https://markjs.io/configurator.html
// browserify https://github.com/michaeldelorenzo/keyword-extractor or https://www.npmjs.com/package/keyword-extractor
processPage(document.all[0].outerHTML, document.URL, function(results){
    console.log(results);
    var r;
    for(var i = 0; i < results.length; i+=1){
        decorateTopic(results[i]);
    }
});


function deltaE(rgbA, rgbB) {
    let labA = rgb2lab(rgbA);
    let labB = rgb2lab(rgbB);
    let deltaL = labA[0] - labB[0];
    let deltaA = labA[1] - labB[1];
    let deltaB = labA[2] - labB[2];
    let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
    let deltaC = c1 - c2;
    let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
    let sc = 1.0 + 0.045 * c1;
    let sh = 1.0 + 0.015 * c1;
    let deltaLKlsl = deltaL / (1.0);
    let deltaCkcsc = deltaC / (sc);
    let deltaHkhsh = deltaH / (sh);
    let i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
    return i < 0 ? 0 : Math.sqrt(i);
  }

  function rgb2lab(rgb){
    let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, x, y, z;
    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
  }
