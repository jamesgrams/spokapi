/**
 * @file    National Geographic West Site for Spokapi
 * @author  James Grams
 */

const FoxSite = require('../foxsite');

/**
 * @constant
 * @type {string}
 * @default
 */
const NATIONAL_GEOGRAPHIC_WEST_URL = "https://www.fox.com/live/channel/NGCW/";

/**
 * Class representing a National Geographic West site.
 */
class NationalGeographicWest extends FoxSite {

    static get NATIONAL_GEOGRAPHIC_WEST_URL() { return NATIONAL_GEOGRAPHIC_WEST_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, NATIONAL_GEOGRAPHIC_WEST_URL, "National Geographic West");
    }

};

module.exports = NationalGeographicWest;