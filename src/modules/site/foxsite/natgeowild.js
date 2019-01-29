/**
 * @file    Nat Geo WILD Site for Spokapi
 * @author  James Grams
 */

const FoxSite = require('../foxsite');

/**
 * @constant
 * @type {string}
 * @default
 */
const NAT_GEO_WILD_URL = "https://www.fox.com/live/channel/NGEOWILD/";

/**
 * Class representing a Nat Geo WILD site.
 */
class NatGeoWild extends FoxSite {

    static get NAT_GEO_WILD_URL() { return NAT_GEO_WILD_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, NAT_GEO_WILD_URL, "Nat Geo WILD");
    }

};

module.exports = NatGeoWild;