/**
 * @file    FOX Site for Spokapi
 * @author  James Grams
 */

const FoxSite = require('../foxsite');

/**
 * @constant
 * @type {string}
 * @default
 */
const FOX_URL = "https://www.fox.com/live/";

/**
 * Class representing a FOX site.
 */
class Fox extends FoxSite {

    static get FOX_URL() { return FOX_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, FOX_URL, "FOX");
    }

};

module.exports = Fox;