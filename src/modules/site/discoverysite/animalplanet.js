/**
 * @file    Animal Planet Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const ANIMAL_PLANET_URL = "https://www.animalplanet.com/watch/animal-planet";

/**
 * Class representing an Animal Planet site.
 */
class AnimalPlanet extends DiscoverySite {

    static get ANIMAL_PLANET_URL() { return ANIMAL_PLANET_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, ANIMAL_PLANET_URL);
    }

};

module.exports = AnimalPlanet;

