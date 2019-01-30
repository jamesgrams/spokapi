/**
* Verizon Fios Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing a Verizon Fios Provider.
 */
class VerizonFios extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("Verizon Fios", "#IDToken1", "#IDToken2", "#tvloginsignin");
    }

}

module.exports = VerizonFios;