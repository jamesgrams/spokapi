/**
 * @file    Game for Spokapi
 * @author  James Grams
 */

 /**
 * Class representing an Game that can be watched.
 */
class Game {

	/**
    * Constructor.
    * @param {string} name - The name of the game.
    * @param {string} link - The link to watch the game (this will be converted to a link within the Spokapi application)
    * @param {string} time - The time of the game.
    * @param {string} sport - The name of the sport (e.g. Football).
    * @param {string} network - The name of the network this game is on (e.g. espn).
    * @param {string} subsport - A more specific description of the sport (e.g. NCAA Men's Basketball)
    * @param {string} subnetwork - The name of the subnetwork this game is on (e.g. espn3)
	*/
	constructor(name, link, time, sport, network, subsport, subnetwork) {
		this.name 		= name;
        this.link	    = link;
        this.time       = time;
        this.sport		= sport;
        this.network    = network;
        this.subsport   = subsport;
        this.subnetwork = subnetwork;
        this.generateLink();
    }
    
    /**
    * Alter the link so that it points to a watch endpoint of the application.
    */
    generateLink() {
        this.link = "/watch?url=" + encodeURIComponent(this.link) + "&network=" + this.network;
    }
	
};

module.exports = Game;