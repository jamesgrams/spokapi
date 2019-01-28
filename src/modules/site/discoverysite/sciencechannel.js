/**
 * @file    Science Channel Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const SCIENCE_CHANNEL_URL = "https://www.sciencechannel.com/watch/science";

/**
 * Class representing a Science Channel site.
 */
class ScienceChannel extends DiscoverySite {

    static get SCIENCE_CHANNEL_URL() { return SCIENCE_CHANNEL_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, SCIENCE_CHANNEL_URL, "Science Channel");
    }

};

module.exports = ScienceChannel;

