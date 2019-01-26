/**
 * @file    AHC (American History Channel) Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const AHC_URL = "https://www.ahctv.com/watch/ahc";

/**
 * Class representing a AHC site.
 */
class Ahc extends DiscoverySite {

    static get AHC_URL() { return AHC_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, AHC_URL);
    }

};

module.exports = Ahc;

