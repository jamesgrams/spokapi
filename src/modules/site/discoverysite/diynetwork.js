/**
 * @file    DIY Network Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const DIY_NETWORK_URL = "https://watch.diynetwork.com/watch/diy";

/**
 * Class representing a DIY Network site.
 */
class DiyNetwork extends DiscoverySite {

    static get DIY_NETWORK_URL() { return DIY_NETWORK_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, DIY_NETWORK_URL, "DIY Network");
    }

};

module.exports = DiyNetwork;

