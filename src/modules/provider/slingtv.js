/**
* Sling TV Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing a Sling TV Provider.
 */
class SlingTv extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("Sling TV", "#username", "#password", "#login");
    }

}

module.exports = SlingTv;