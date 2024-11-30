//const https = require('https');
const axios = require("axios");
const Sitemapper = require('sitemapper');
const async = require('async');
const _ = require('underscore');
const amqp = require('amqp-connection-manager');

var mongodb = require('./connector/dbConnector');

const ENTERPRISE_DATA_SOURCE = 'enterprise_data_sources';
const ENTERPRISE_DATA = 'enterprise_data';

const conObject = {
    protocol: 'amqp',
    hostname: process.env.RABBIT_HOST,
    port: process.env.RABBIT_PORT,
    username: process.env.RABBIT_USERNAME,
    password: process.env.RABBIT_PASSWORD,
    locale: 'en_US',
    frameMax: 0,
    heartbeat: 25,
    vhost: `/${process.env.RABBIT_VHOST}`,
};

async function publishToExchange(queueName, routingKey, queueMessage) {
    // Create a connection manager and connect to RabbitMQ (replace with your RabbitMQ URL if not localhost)
    const connection = amqp.connect([`amqp://${conObject.username}:${conObject.password}@${conObject.hostname}:${conObject.port}/${conObject.vhost}`], {
        reconnectTimeInSeconds: 1,
      });
    
    // Create a channel wrapper
    const channelWrapper = connection.createChannel({
        json: true,
        setup: (channel) => {
            const exchange = 'enterprise_data';
            // Declare the exchange
            return channel.assertExchange(exchange, 'direct', { durable: false })
                .then(() => {
                    // Declare a queue and bind it to the exchange with a routing key
                    return channel.assertQueue(queueName, { durable: false })
                        .then(() => {
                            return channel.bindQueue(queueName, exchange, routingKey);
                        });
                });
        }
    });

    // Send a message
    const exchange = 'enterprise_data';
    channelWrapper.publish(exchange, routingKey, queueMessage)
        .then(() => {
            console.log('queue published=>', queueMessage);
        })
        .catch(err => {
            console.error('Failed to send message:', err);
        });

    // Close the connection after sending the message
    setTimeout(() => {
        connection.close();
    }, 1000);
}

// async and optimized code - ToDo
/*
mongodb.connect(function(){
    mongodb.DBConn(ENTERPRISE_DATA_SOURCE, function (err, col_datasource) {
        if(!err){
            getParseQueue(col_datasource, "sitemap", function(queuedJob) {
                queuedJob.forEach(job => {
                    async.waterfall([
                        function(cb) {
                            mongodb.connect(function(){
                                mongodb.DBConn(ENTERPRISE_DATA, function (err, col) {
                                    if(err){
                                        cb(err);
                                    } else {
                                        cb(null, col);
                                    }
                                });
                            })
                        }, function(col, cb) {
                            getParseQueue(col, 'sitemap', function(queuedList) {
                                cb(queuedList);
                            });
                        }, function(queuedList, cb) {
                            queuedList.forEach(element => {
                                let urlArr = [];
                                getSiteMapURLs(element.url, function(urls) {                        
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
                                })

                            })
                        }
                    ], function(error, result) {
                        if(error) console.log(error);
                        else return callback(result);
                    })
                })
            })
        }
    })
})
*/


// working code - rough
mongodb.connect(function(){
    mongodb.DBConn(ENTERPRISE_DATA_SOURCE, function (err, col_datasource) {
        if(!err){
            getParseQueue(col_datasource, 'sitemap', function(queuedJob) {
                queuedJob.forEach(job => {
                    let urlArr = [];
                    col_datasource.updateOne({"_id": job._id}, {'$set': {'status': 'url_read', 'track.url_read': new Date()}});
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
                            console.log('finalURLArr=>', finalURLArr);
                            if(finalURLArr.length) {
                                mongodb.DBConn(ENTERPRISE_DATA, function (err, col_enterprisedata) {
                                    async.forEachOf(finalURLArr, (urlObj, key, callback) => {
                                        let insertData = {
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
                                        col_enterprisedata.insertOne(insertData);
                                        callback(null);
                                    }, function (err) {
                                        if (err) console.log(err);
                                        else {
                                            col_datasource.updateOne({"_id": job._id}, {'$set': {'status': 'queued', 'count.url_read': finalURLArr.length, 'track.queued': new Date()}});
                                            publishToExchange('enterprise_data_loading', 'loader', {"operation": "importer", "type": "sitemap", "task_id": job._id});
                                        }
                                    });
                                })
                            }
                        });
                    });                    
                });
            });
        } else {
            console.log('Database is not connected for ', ENTERPRISE_DATA, 'error: ', err);
        }
    });
});


const getParseQueue = async function(col_data_source, type, callback) {
    edsData = await col_data_source.find({status: "pending", type: type}, {}).toArray();
    return callback(edsData??[]);
}

const getSiteMapURLs = async function(sitemapUrl, callback) {
    const smapper = new Sitemapper({
      "url": sitemapUrl,
      "timeout": 5000,
      //"debug": true,
      "field": {
        "loc": true
      }
    });
  
    try {
      const { sites } = await smapper.fetch();
      return callback(sites??[]);
    } catch (error) {
        console.log(error);
        return callback([]);
    }
}

const validateURL = async function(urlArr, cb) {
    console.log('urlArr=>', urlArr)
    let finalURLArr = [];
    async.forEachOf(urlArr, (url, key, callback) => {
        axios.request({
            "url": url
        })
        .then((response) => {
            //console.log('response header=>', response.headers['content-type']);    
            if(_.contains([200, 201], response.status)) {
                //console.log('response header=>', response.headers['content-type']);
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