/**
 * @file    Cooking Channel Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const COOKING_CHANNEL_URL = "https://watch.cookingchanneltv.com/watch/cooking-channel";

/**
 * Class representing a Cooking Channel site.
 */
class CookingChannel extends DiscoverySite {

    static get COOKING_CHANNEL_URL() { return COOKING_CHANNEL_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, COOKING_CHANNEL_URL);
    }

};

module.exports = CookingChannel;

