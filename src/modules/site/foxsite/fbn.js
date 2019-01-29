/**
 * @file    FBN (Fox Business Network) Site for Spokapi
 * @author  James Grams
 */

const FoxSite = require('../foxsite');

/**
 * @constant
 * @type {string}
 * @default
 */
const FBN_URL = "https://www.fox.com/live/channel/FBN/";

/**
 * Class representing a FBN site.
 */
class Fbn extends FoxSite {

    static get FBN_URL() { return FBN_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, FBN_URL, "FBN", "FBN");
    }

};

module.exports = Fbn;