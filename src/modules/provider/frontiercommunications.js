/**
* Frontier Communications Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing a Frontier Communications Provider.
 */
class FrontierCommunications extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("Frontier Communications", "#username", "#password", "#submit");
    }

}

module.exports = FrontierCommunications;