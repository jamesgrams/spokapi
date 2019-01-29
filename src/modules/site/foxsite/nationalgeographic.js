/**
 * @file    National Geographic Site for Spokapi
 * @author  James Grams
 */

const FoxSite = require('../foxsite');

/**
 * @constant
 * @type {string}
 * @default
 */
const NATIONAL_GEOGRAPHIC_URL = "https://www.fox.com/live/channel/NGC/";

/**
 * Class representing a National Geographic site.
 */
class NationalGeographic extends FoxSite {

    static get NATIONAL_GEOGRAPHIC_URL() { return NATIONAL_GEOGRAPHIC_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, NATIONAL_GEOGRAPHIC_URL, "National Geographic", "NGC");
    }

};

module.exports = NationalGeographic;