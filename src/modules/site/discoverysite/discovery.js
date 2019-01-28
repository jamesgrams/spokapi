/**
 * @file    Discovery Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const DISCOVERY_URL = "https://www.discovery.com/watch/discovery";

/**
 * Class representing a Discovery Site.
 */
class Discovery extends DiscoverySite {

    static get DISCOVERY_URL() { return DISCOVERY_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, DISCOVERY_URL, "Discovery");
    }

};

module.exports = Discovery;
