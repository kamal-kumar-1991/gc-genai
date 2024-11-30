const axios = require("axios");
const async = require('async');
const _ = require('underscore');
const amqp = require('amqp-connection-manager');
const cheerio = require('cheerio');
const urlModule = require('url');

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

// Function to get all links from a website

mongodb.connect(function(){
    mongodb.DBConn(ENTERPRISE_DATA_SOURCE, function (err, col_datasource) {
        if(!err){
            getParseQueue(col_datasource, 'website', function(queuedJob) {
                queuedJob.forEach(job => {
                    col_datasource.updateOne({"_id": job._id}, {'$set': {'status': 'url_read', 'track.url_read': new Date()}});
                    getLinksFromWebsite(job.url, function(urlArr) {
                        if(urlArr.length) {
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
                                                publishToExchange('enterprise_data_loading', 'loader', {"operation": "importer", "type": "website", "task_id": job._id});
                                            }
                                        });
                                    })
                                }
                            });
                        }
                    });
                })
            })
        } else {
            console.log('Database is not connected for ', ENTERPRISE_DATA, 'error: ', err);
        }
    })
})
    
const getParseQueue = async function(col_data_source, type, callback) {
    edsData = await col_data_source.find({status: "pending", type: type}, {}).toArray();
    return callback(edsData??[]);
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
            if (link) {
                // Resolve the URL to handle relative links
                link = urlModule.resolve(webURL, link);
                let parsedChild = urlModule.parse(link);
                if(parsedOrigin.hostname == parsedChild.hostname) {
                    validateMetaAttr(link, function(isValid) {
                        if (!isValid) {
                            console.log(`Eliminating URL: ${link}`);
                            callback(null);
                        } else {
                            console.log(`Valid URL: ${link}`);
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
            // configs is now a map of JSON data
            console.log(links);
            return cb(links);
        });
        
    } catch (error) {
        console.error('Error fetching the website:', error);
        return callback([]);
    }
}

async function validateMetaAttr(childURL, callback) {
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
        console.error(`Error fetching ${url}:`, error);
        return callback(false);
    }
}