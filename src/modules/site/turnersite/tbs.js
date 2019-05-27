/**
 * @file    TBS Site for Spokapi
 * @author  James Grams
 */

const TurnerSite = require('../turnersite');

/**
 * @constant
 * @type {string}
 * @default
 */
const TBS_URL = "https://www.tbs.com/watchtbs";

/**
 * Class representing a TBS site.
 */
class Tbs extends TurnerSite {

    static get TBS_URL() { return TBS_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, TBS_URL, "TBS");
    }

};

module.exports = Tbs;

