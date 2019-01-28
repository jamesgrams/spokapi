/**
 * @file    Program for Spokapi
 * @author  James Grams
 */

 /**
 * Class representing a Program that can be watched.
 */
class Program {

	/**
    * Constructor.
    * @param {string} title                 - The title of the program.
    * @param {string} link                  - The link to watch the program (this will be converted to a link within the Spokapi application).
    * @param {Date} startTime               - The time of the program.
    * @param {number} runTime               - The runtime of the program (milliseconds).
    * @param {string} network               - The network the program is on. (General: e.g. ESPN)
    * @param {string} channel               - The channel the program is on. (Specific: e.g. ESPN2)
    * @param {string} description           - The description of the program.
    * @param {number} season                - The season number the program is in.
    * @param {number} episode               - The episode number.
    * @param {string} episodeTitle          - The title of the episode.
    * @param {string} episodeThumbnailUrl   - The thumbnail of the episode    
	*/
	constructor(title, link, startTime, runTime, network, channel, description, season, episode, episodeTitle, episodeThumbnailUrl) {
		this.title 		           = title ? title : "";
        this.link	               = link ? link : "";
        this.startTime             = startTime ? startTime : new Date();
        this.runTime		       = runTime ? runTime : 0;
        this.network                = network ? network : "";
        this.channel               = channel ? channel : "";
        this.description           = description ? description : "";
        this.season                = season ? season : 0;
        this.episode               = episode ? episode : 0;
        this.episodeTitle          = episodeTitle ? episodeTitle : "";
        this.episodeThumbnailUrl   = episodeThumbnailUrl ? episodeThumbnailUrl : "";
        this.generateLink();
    }
    
    /**
    * Alter the link so that it points to a watch endpoint of the application.
    */
    generateLink() {
        this.link = "/watch?url=" + encodeURIComponent(this.link) + "&network=" + this.network;
    }
	
};

module.exports = Program;