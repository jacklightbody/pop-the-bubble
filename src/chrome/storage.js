/*
* User Data is the JSON that we store across all the different browsers
* Format is 
bias-light-data: {   
    ignored {
        domains {
            "mail.google.com": 0,
            "myprivatesite.com": 0
        }
    }
}
*/
class Storage{
    STORAGE_KEY = "concious-bias-data";

    constructor() {
        var storageDefault = {}
        storageDefault[STORAGE_KEY] = {ignored:{domains:{}}};
    }

    // Simple wrapper for all our functionality to handle the of the data
    // to abstract away the chrome storage parts of it
    loadData(callback){
        // specify default values here so that if we haven't saved anything yet it doesn't fail
        chrome.storage.local.get(storageDefault, function(el){        
            var userData = el[STORAGE_KEY];
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

    ignoreDomain(siteUrl){
        loadData(function(userData){
            let url = new URL(siteUrl);
            domain = url.hostname;
            userData.ignored.domains[domain] = 1;
            saveData(userData);
        });        
    }

    async siteIsValid(url, callback){
        loadData(function(userData){
            try{
                var host = new URL(url).hostname;
                return !(host in userData.ignored.domains);
            }catch(err){
                return true;
            }
        });
    }

}