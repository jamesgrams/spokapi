/**
 * @file    Wi-Fi network for Spokapi (Chrome OS)
 * @author  James Grams
 */

const execSync = require('child_process').execSync;

/**
 * @constant
 * @type {string}
 * @default
 */
const WPA_USER_PREFIX = "sudo -H -u wpa /bin/sh -c ";

/**
 * Class representing a Wi-Fi network
 * A bluetooth interface for the endpoints that Spokapi advertises
 * is why this class is useful.
 */
class WiFi {

    /**
    * Constructor.
    * @param {string} ssid - The SSID of the WiFi Network.
    * @param {string} password - The password of the WiFi Network.
    * @param {string} identity - The username of the WiFi Network.
    * @param {string} bssid - The bssid of the WiFi Network.
    * @param {string} frequency - The frequency of the WiFi Network.
    * @param {string} signal - The signal of the WiFi Network
    * @param {string} flags - The flags for the WiFi Network
    * @param {string} id - The ID of the WiFi Network (when connected)
    */
	constructor(ssid, password, identity, bssid, frequency, signal, flags, id) {
        this.ssid = ssid;
        this.password = password;
        this.identity = identity;
        this.bssid = bssid;
        this.frequency = frequency;
        this.signal = signal;
        this.flags = flags;
        this.id = id;
    }

    /**
     * Add a network to the list of networks 
     */
    add() {
        // Create a network
        let buffer = execSync( WPA_USER_PREFIX + '"wpa_cli add_network"' );
        this.id = buffer.toString("utf-8").split("\n")[1];

        // Enter the ssid
        execSync( WPA_USER_PREFIX + '"wpa_cli set_network ' + this.id + ' ssid \'\\\"' + this.ssid + '\\\"\'"' );
        // Enter the password if there is one
        if( password ) {
            execSync( WPA_USER_PREFIX + '"wpa_cli set_network ' + this.id + ' psk \'\\\"' + this.password + '\\\"\'"' );
            // Enter the identity if there is one
            if( identity ) {
                execSync( WPA_USER_PREFIX + '"wpa_cli set_network ' + this.id + ' identity \'\\\"' + this.identity + '\\\"\'"' );
            }
        }
        else {
            // If there is no password, we have to explicity say we have no security
            execSync( WPA_USER_PREFIX + '"wpa_cli set_network ' + this.id + ' key_mgmt NONE' );
        }
    }

    /**
     * Connect to a network
     */
    connect() {
        // Enable the network
        execSync( WPA_USER_PREFIX + '"wpa_cli enable_network ' + this.id + '"' );
        // Select the network
        execSync( WPA_USER_PREFIX + '"wpa_cli select_network ' + this.id + '"' );
    }

    /**
     * Disconnect from a network (This will remove the network from the list of networks)
     */
    diconnect() {
        // Delete the network
        execSync( WPA_USER_PREFIX + '"wpa_cli remove_network ' + this.id + '"' );
    }

    /**
     * Save the current WiFi configuration
     */
    save() {
        // Save the configuration
        execSync( WPA_USER_PREFIX + '"wpa_cli save_config"' );
    }

    /////// Static methods ////////
    // These are mostly to help in dealing with lists of or multiple networks

    /**
     * List Wifi networks available to connect to.
     * @returns {Promise<Array>}
     */
    static async availableNetworks() {
        // Scan for networks
        execSync( WPA_USER_PREFIX + '"wpa_cli scan"' );
        await WiFi.sleep(5000);
        // Now, see the results
        let resultsBuffer = execSync( WPA_USER_PREFIX + '"wpa_cli scan_results"' );
        let results = resultsBuffer.toString("utf-8");
        
        // Parse the results
        let networks = [];
        let rows = results.split("\n").filter(function(el) {return el.length != 0});
        // We don't need the first two rows
        for( let i=2; i<rows.length; i++ ) {
            let row = rows[i];
            let columns = row.split(/\s/).filter(function(el) {return el.length != 0});
            let network = new WiFi(
                columns[4],
                null,
                null,
                columns[0],
                columns[1],
                columns[2],
                columns[3],
                null
            );
            networks.push(network);
        }

        return Promise.resolve(networks);
    }

    /**
     * List Wifi networks that are already connected to.
     * @returns {Array<WiFi>}
     */
    static connectedNetworks() {
        let connectedBuffer = execSync( WPA_USER_PREFIX + '"wpa_cli list_networks"' );
        let connected = connectedBuffer.toString("utf-8");

        // Parse the results
        let networks = [];
        let rows = connected.split("\n").filter(function(el) {return el.length != 0});
        // We don't need the first two rows
        for( let i=2; i<rows.length; i++ ) {
            let row = rows[i];
            let columns = row.split(/\s/).filter(function(el) {return el.length != 0});
            let network = new WiFi(
                columns[1],
                null,
                null,
                columns[2],
                null,
                null,
                columns[3],
                columns[0]
            );
            networks.push(network);
        }

        return networks;
    }

    /**
     * Disconnect from a network by ssid
     * @param {string} ssid - The network name to disconnect from
     */
    static disconnect(ssid) {
        let networks = WiFi.connectedNetworks();

        for( let network of networks ) {
            if( network.ssid == ssid ) {
                network.disconnect();
                network.save();
            }
        }
    }

    /**
     * Connect to a network by ssid, password, and identity
     * @param ssi
     */
    static connect(ssid, password, identity) {
        // See if we are already connected
        let connectedNetworks = WiFi.connectedNetworks();

        let networkId;
        // See if we already have a connection
        for ( let connectedNetwork of connectedNetworks ) {
            if( connectedNetwork.ssid == ssid ) {
                networkId = connectedNetwork.id;
            }
        }

        let network = new WiFi( ssid, password, identity, null, null, null, null, networkId );

        // We need to add a network connection
        // If you had the password wrong, you will have to delete the network and then re-add it (like getting the ssid wrong)
        if( !network.id ) {
            network.add();
        }

        network.connect();
        network.save();
    }

    /**
     * Helper function to sleep
     * @param {number} n - The number of seconds to sleep
     */
    static sleep(n) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
    }

};

module.exports = WiFi;