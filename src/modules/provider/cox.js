/**
* Cox Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing a Cox Provider.
 */
class Cox extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("Cox", "input[name='username']", "input[name='password']", "input[alt='Sign In']");
    }

}

module.exports = Cox;