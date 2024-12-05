const axios = require("axios");
const Sitemapper = require('sitemapper');
const async = require('async');
const _ = require('underscore');
const { ObjectId } = require('mongodb');

const dialoges = require("../controllers/dialogeController");
const publish = require("../publish");  

const sitemapImporter = async function(task_id) {
    const job = await dialoges.fetchEnterpriseSource({ "_id":  new ObjectId(task_id), "status": "pending", "type": "sitemap"});
    if(job) {
        let urlArr = [];
        dialoges.updateEnterpriseSource({"_id": job._id}, {"status": "url_read", "track.url_read": new Date()});
        getSiteMapURLs(job.url, function(urls) {                        
            urls.forEach(url => {
                var extension = url.split('.').pop();
                if(extension === 'xml') {
                    getSiteMapURLs(url, function(surls) {
                        surls.forEach(surl => {
                            var extension = surl.split('.').pop();
                            if(extension !== 'xml') {
                                urlArr.push(surl);
                            }
                        });
                    });
                } else {
                    urlArr.push(url);
                }
            });
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
                        if (err) console.log('Error:: sitemapImporter', err);
                        else {
                            dialoges.updateEnterpriseSource({"_id": job._id}, {"status": "queued", "count.url_read": finalURLArr.length, "track.queued": new Date()});
                        }
                    });
                }
            });
        });
    }        
}

const getSiteMapURLs = async function(sitemapUrl, callback) {
    try {
        const smapper = new Sitemapper({
            "url": sitemapUrl,
            "timeout": 10000,
            //"debug": true,
            "field": {
                "loc": true
            }
        });

        const { sites } = await smapper.fetch();
        return callback(sites??[]);
    } catch (error) {
        console.log('Error:: getSiteMapURLs: ', error);
        return callback([]);
    }
}

const validateURL = async function(urlArr, cb) {
    let finalURLArr = [];
    async.forEachOf(urlArr, (url, key, callback) => {
        if(!finalURLArr.includes(url)) {
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
                        //console.log(`The URL points to a resource with Content-Type: ${contentType}`);
                        callback(null);
                    }          
                }       
            })
            .catch((error) => {
                console.log(error);
                callback(null);
            });
        }
    }, function(err) {
        return cb(finalURLArr);
    });
}

const insertEnterpriseData = async function (insertObj) {
    const insertId = await dialoges.insertEnterpriseData(insertObj);
    if(insertId) {
        publish.publishMessage({"operation": "loader", "type": "url", "task_id": insertId});
    }
}

module.exports = { sitemapImporter }