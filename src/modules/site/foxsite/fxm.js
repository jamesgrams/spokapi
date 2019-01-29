/**
 * @file    FXM (Fox Movie Channel) Site for Spokapi
 * @author  James Grams
 */

const FoxSite = require('../foxsite');

/**
 * @constant
 * @type {string}
 * @default
 */
const FXM_URL = "https://www.fox.com/live/channel/FXM/";

/**
 * Class representing a FXM site.
 */
class Fxm extends FoxSite {

    static get FXM_URL() { return FXM_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, FXM_URL, "FXM", "FXM");
    }

};

module.exports = Fxm;