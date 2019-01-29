/**
 * @file    Fox News Site for Spokapi
 * @author  James Grams
 */

const FoxSite = require('../foxsite');

/**
 * @constant
 * @type {string}
 * @default
 */
const FOX_NEWS_URL = "https://www.fox.com/live/channel/FNC/";

/**
 * Class representing a Fox News site.
 */
class FoxNews extends FoxSite {

    static get FOX_NEWS_URL() { return FOX_NEWS_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, FOX_NEWS_URL, "Fox News");
    }

};

module.exports = FoxNews;