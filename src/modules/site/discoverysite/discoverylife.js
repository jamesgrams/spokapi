/**
 * @file    Discovery Life Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const DISCOVERY_LIFE_URL = "https://www.discoverylife.com/watch/discovery-life";

/**
 * Class representing a Discovery Life site.
 */
class DiscoveryLife extends DiscoverySite {

    static get DISCOVERY_LIFE_URL() { return DISCOVERY_LIFE_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, DISCOVERY_LIFE_URL, "Discovery Life");
    }

};

module.exports = DiscoveryLife;

