/**
* AT&T U-verse Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing an AT&T U-verse Provider.
 */
class AttUverse extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("AT&T U-verse", "#nameBox", "#pwdBox", "#submitLogin");
    }

}

module.exports = AttUverse;