/**
 * @file    FX West Site for Spokapi
 * @author  James Grams
 */

const FoxSite = require('../foxsite');

/**
 * @constant
 * @type {string}
 * @default
 */
const FX_WEST_URL = "https://www.fox.com/live/channel/FXW/";

/**
 * Class representing a FX West site.
 */
class FxWest extends FoxSite {

    static get FX_WEST_URL() { return FX_WEST_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, FX_WEST_URL, "FX West", "FXW");
    }

};

module.exports = FxWest;