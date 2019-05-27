/**
 * @file    TNT Site for Spokapi
 * @author  James Grams
 */

const TurnerSite = require('../turnersite');

/**
 * @constant
 * @type {string}
 * @default
 */
const TNT_URL = "https://www.tntdrama.com/watchtnt";

/**
 * Class representing a TNT site.
 */
class Tnt extends TurnerSite {

    static get TNT_URL() { return TNT_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, TNT_URL, "TNT");
    }

};

module.exports = Tnt;

