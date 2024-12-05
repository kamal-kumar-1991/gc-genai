const axios = require("axios");
const async = require('async');
const _ = require('underscore');
const cheerio = require('cheerio');
const urlModule = require('url');
const { ObjectId } = require('mongodb');

const dialoges = require("../controllers/dialogeController");
const publish = require("../publish");  

const websiteImporter = async function(task_id) {
    const job = await dialoges.fetchEnterpriseSource({ "_id":  new ObjectId(task_id), "status": "pending", "type": "website"});
    
    if(job) {
        dialoges.updateEnterpriseSource({"_id": job._id}, {"status": "url_read", "track.url_read": new Date()});
        getLinksFromWebsite(job.url, function(urlArr) {
            if(urlArr.length) {
                validateURL(urlArr, function(finalURLArr) {
                    if(finalURLArr.length) {                           
                        async.forEachOf(finalURLArr, (urlObj, key, callback) => {
                            let insertObj = {
                                "parent": {
                                    "job_id": job._id,
                                    "job_type": job.type
                                },
                                "botId": job.botId,
                                "type": 'url',
                                "url": {
                                    "loader": urlObj.url_type,
                                    "url": urlObj.url
                                },                                    
                                "status": "queued",
                                "track": {
                                    "added": new Date(),
                                    "queued": new Date()
                                }
                            }
                            insertEnterpriseData(insertObj);
                            
                            callback(null);
                        }, function (err) {
                            if (err) console.log('Error:: websiteImporter', err);
                            else {
                                dialoges.updateEnterpriseSource({"_id": job._id}, {"status": "queued", "count.url_read": finalURLArr.length, "track.queued": new Date()});
                            }
                        });
                    }
                });
            }
        });
       
    }
}

const getLinksFromWebsite = async function(webURL, cb) {
    try {
        // Fetch the HTML content of the page
        let parsedOrigin = urlModule.parse(webURL);
        const response = await axios.get(webURL);
        
        // Load the HTML into cheerio
        const $ = cheerio.load(response.data);
        
        // Find all the anchor tags and get the href attributes
        let links = [];
        async.forEachOf($('a'), (element, index, callback) => {
            let link = $(element).attr('href');
            if (link && !(links.includes(link))) {
                // Resolve the URL to handle relative links
                link = urlModule.resolve(webURL, link);
                let parsedChild = urlModule.parse(link);
                if(parsedOrigin.hostname == parsedChild.hostname) {
                    validateMetaAttr(link, function(isValid) {
                        if (!isValid) {
                            console.log(`Eliminating URL: ${link}`);
                            callback(null);
                        } else {
                            links.push(link);
                            callback(null);
                        }
                    });  
                } else {
                    callback(null);
                }
            } else {
                callback(null);
            }
        }, function(err) {
            if (err) console.error(err.message);
            return cb(links);
        });
        
    } catch (error) {
        console.error('Error fetching the website:', error);
        return callback([]);
    }
}

const validateURL = async function(urlArr, cb) {
    let finalURLArr = [];
    async.forEachOf(urlArr, (url, key, callback) => {
        axios.request({
            "url": url
        })
        .then((response) => {
            if(_.contains([200, 201], response.status)) {
                let contentType = response.headers['content-type'];
                let urlObj = {
                    'url': url
                }
                if (contentType.includes('text/html')) {
                    urlObj.url_type = 'html';
                    finalURLArr.push(urlObj);
                    callback(null);
                } else if (contentType.includes('application/pdf')) {
                    urlObj.url_type = 'pdf';
                    finalURLArr.push(urlObj);
                    callback(null);
                } else if (contentType.includes('application/msword') || contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
                    urlObj.url_type = 'doc';
                    finalURLArr.push(urlObj);
                    callback(null);
                } else {
                    console.log(`The URL points to a resource with Content-Type: ${contentType}`);
                    callback(null);
                }          
            }       
        })
        .catch((error) => {
            console.log(error);
            callback(null);
        });
    }, function(err) {
        return cb(finalURLArr);
    });
}

const validateMetaAttr = async function(childURL, callback) {
    try {
        // Fetch the page
        const { data } = await axios.get(childURL);

        // Load the HTML into cheerio
        const $ = cheerio.load(data);

        // Check if the robots meta tag has "noindex" or "nofollow"
        const robotsMetaTag = $('meta[name="robots"]').attr('content');
        if (robotsMetaTag && robotsMetaTag.includes('noindex') && robotsMetaTag.includes('nofollow')) {
            return callback(false);  // The URL has noindex, nofollow
        }

        return callback(true);  // The URL doesn't have noindex, nofollow
    } catch (error) {
        console.error(`Error fetching ${childURL}:`, error);
        return callback(false);
    }
}

const insertEnterpriseData = async function (insertObj) {
    const insertId = await dialoges.insertEnterpriseData(insertObj);
    if(insertId) {
        publish.publishMessage({"operation": "loader", "type": "url", "task_id": insertId});
    }
}

module.exports = { websiteImporter }