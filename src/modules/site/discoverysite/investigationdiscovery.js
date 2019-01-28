/**
 * @file    Investigation Discovery Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const INVESITGATION_DISCOVERY_URL = "https://www.investigationdiscovery.com/watch/investigation-discovery";

/**
 * Class representing an Investigation Discovery site.
 */
class InvestigationDiscovery extends DiscoverySite {

    static get INVESITGATION_DISCOVERY_URL() { return INVESITGATION_DISCOVERY_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, INVESITGATION_DISCOVERY_URL, "Investigation Discovery");
    }

};

module.exports = InvestigationDiscovery;

