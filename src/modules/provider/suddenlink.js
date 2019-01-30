/**
* Suddenlink Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing a Suddenlink Provider.
 */
class Suddenlink extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("Suddenlink", "#username", "#password", "#login");
    }

}

module.exports = Suddenlink;