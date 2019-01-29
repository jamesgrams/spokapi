/**
 * @file    FXX Site for Spokapi
 * @author  James Grams
 */

const FoxSite = require('../foxsite');

/**
 * @constant
 * @type {string}
 * @default
 */
const FXX_URL = "https://www.fox.com/live/channel/FXX/";

/**
 * Class representing a FXX site.
 */
class Fxx extends FoxSite {

    static get FXX_URL() { return FXX_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, FXX_URL, "FXX", "FXX");
    }

};

module.exports = Fxx;