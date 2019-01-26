/**
 * @file    HGTV Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const HGTV_URL = "https://watch.hgtv.com/watch/hgtv";

/**
 * Class representing an HGTV site.
 */
class Hgtv extends DiscoverySite {

    static get HGTV_URL() { return HGTV_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, HGTV_URL);
    }

};

module.exports = Hgtv;

