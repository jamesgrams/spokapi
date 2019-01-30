/**
* DIRECTV Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing a DIRECTV Provider.
 */
class DirecTv extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("DIRECTV", "#usernameInputId", ".inputFieldPass", "#loginSubmitId");
    }

}

module.exports = DirecTv;