/**
 * @file    FX Site for Spokapi
 * @author  James Grams
 */

const FoxSite = require('../foxsite');

/**
 * @constant
 * @type {string}
 * @default
 */
const FX_URL = "https://www.fox.com/live/channel/FX/";

/**
 * Class representing a FX site.
 */
class Fx extends FoxSite {

    static get FX_URL() { return FX_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, FX_URL, "FX", "FX");
    }

};

module.exports = Fx;