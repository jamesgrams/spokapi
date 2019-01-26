/**
 * @file    TLC Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const TLC_URL = "https://www.tlc.com/watch/tlc";

/**
 * Class representing an TLC site.
 */
class Tlc extends DiscoverySite {

    static get TLC_URL() { return TLC_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, TLC_URL);
    }

};

module.exports = Tlc;

