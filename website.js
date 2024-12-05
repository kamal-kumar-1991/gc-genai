const axios = require("axios");
const async = require('async');
const _ = require('underscore');
const cheerio = require('cheerio');
const urlModule = require('url');

const {urlLoader} =  require("./urlLoader")




const websiteImporter = async function (website_url) {


    getLinksFromWebsite(website_url, function (urlArr) {
        if (urlArr.length) {
            validateURL(urlArr, function (finalURLArr) {
                if (finalURLArr.length) {
                    async.forEachOf(finalURLArr, async (urlObj, key) => {
                        await urlLoader(urlObj.url) ;
                    })
                }
            })
        }
        });


}

const getLinksFromWebsite = async function (webURL, cb) {
    try {
        // Fetch the HTML content of the page
        let parsedOrigin = urlModule.parse(webURL);
        console.log(webURL);
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
                if (parsedOrigin.hostname == parsedChild.hostname) {
                    validateMetaAttr(link, function (isValid) {
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
        }, function (err) {
            if (err) console.error(err.message);
            return cb(links);
        });

    } catch (error) {
        console.error('Error fetching the website:', error);
        // return callback([]);
    }
}

const validateURL = async function (urlArr, cb) {
    let finalURLArr = [];
    async.forEachOf(urlArr, (url, key, callback) => {
        axios.request({
            "url": url
        })
            .then((response) => {
                if (_.contains([200, 201], response.status)) {
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
    }, function (err) {
        return cb(finalURLArr);
    });
}

const validateMetaAttr = async function (childURL, callback) {
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




websiteImporter("https://www.healthtrip.com/")