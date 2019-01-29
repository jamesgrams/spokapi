/**
 * @file    FXX West Site for Spokapi
 * @author  James Grams
 */

const FoxSite = require('../foxsite');

/**
 * @constant
 * @type {string}
 * @default
 */
const FXX_WEST_URL = "https://www.fox.com/live/channel/FXXW/";

/**
 * Class representing a FXX West site.
 */
class FxxWest extends FoxSite {

    static get FXX_WEST_URL() { return FXX_WEST_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, FXX_WEST_URL, "FXX West");
    }

};

module.exports = FxxWest;