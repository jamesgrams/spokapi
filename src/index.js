/**
 * @file    Index for the Spokapi application
 * @author  James Grams
 */

// -------------------- Setup --------------------

const puppeteer = require('puppeteer');
const express = require('express');
const ip = require("ip");
const bodyParser = require('body-parser');
const fs = require('fs');

const Site 	= require('./modules/site');
const Espn 	= require('./modules/site/espn');
const NbcSports 	= require('./modules/site/nbcsports');
const FoxSports 	= require('./modules/site/foxsports');

/**
 * @constant
 * @type {number}
 * @default
 */
const PORT = 8080;
/**
 * @constant
 * @type {number}
 * @default
 */
const FETCH_GAMES_INTERVAL = 240000;
/**
 * @constant
 * @type {number}
 * @default
 */
let MAX_SIMULTANEOUS_FETCHES = 1;
/**
 * @constant
 * @type {Array.<Object>}
 * @default
 */
const NETWORKS = { "espn": Espn, "nbcsports": NbcSports, "foxsports": FoxSports };
/**
 * @constant
 * @type {string}
 * @default
 */
const DIR = 'public';
/**
 * @constant
 * @type {string}
 * @default
 */
const LOGIN_INFO_FILE = 'login-info.txt';

Site.totalNetworks = Object.keys(NETWORKS).length;

var watchBrowser;
var gamesCache;
var fetchGamesLocked = false;
var fetchInterval;

const app = express();

// -------------------- Endpoints --------------------

// Allow parsing of the body of json requests
app.use( bodyParser.json() );

// Middleware to serve static public directory
app.use( '/static/', express.static(DIR) );

// Middleware to allow cors from any origin
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Endpoint to serve the basic HTML needed to run this app
app.get("/", async function(request, response) {
    let ipAddress = ip.address();
    let page = `<html>
<head>
<title>Spokapi</title>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="/static/index.js"></script>
<link rel="stylesheet" type="text/css" href="/static/index.css">
<link href="https://fonts.googleapis.com/css?family=Noto+Sans+JP" rel="stylesheet"> 
</head>
<body>
    <h1><img src="/static/spokapi.png"/>Spokapi</h1>
    <div id="games">
        Loading...
    </div>
    <div id="login-wrapper">
        <div class="login-row"><label for="username"><div class="login-label-title">Username/Email: </div><input id="username" type="text"/></label></div>
        <div class="login-row"><label for="password"><div class="login-label-title">Password: </div><input id="password" type="password"/></label></div>
        <div class="login-row"><label for="provider"><div class="login-label-title">Provider: </div>
            <select id="provider">
                <option value="Spectrum">Spectrum</option>
            </select>
        </label></div>
        <button id="update-info">Update Information</button>
    </div>
    <div id="break-cache-wrapper">
        <button id="start-fetching">Start Fetching</button>
        <button id="stop-fetching">Stop Fetching</button>
        <button id="break-cache">Break Cache</button>
    </div>
    <div id="channels-wrapper">
        <div id="block-channels">
            <div class="block-channels-row"><label for="channel"><div class="block-channels-title">Channel: </div><input id="channel" type="text"/></label></div>
            <button id="block-channel">Block Channel</button>
        </div>
        <div id="blocked-channels"></div>
    </div>
</body>
</html>
`;

    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end(page);
});

// Endpoint to get a list of games
app.get('/games', async function(request, response) {

    // There is no cache yet
    if( !gamesCache ) {
        // If we are currently fetching games, wait until that is done
        if( fetchGamesLocked ) {
            while( fetchGamesLocked ) {
                await sleep(1000);
            }
        }
        // Otherwise, go ahead and fetch games
        else {
            await fetchGames();
        }
    }

    // Check to see if the user is currently watching any of the games and indicate so accordingly
    let page;
    if ( Site.PATH_TO_CHROME ) {
        if( watchBrowser ) {
            let pages = await watchBrowser.pages();
            page = pages[0];
        }
    }
    else {
        page = Site.connectedTabs[0];
    }

    // Deep clone the games cache, so we can edit it before responding
    let gamesResponse = JSON.parse(JSON.stringify(gamesCache));
    if( page ) {
        let url = await page.url();
        for( let game of gamesResponse ) {
            let gameUrl = decodeURIComponent( game.link.replace( "/watch?url=", "" ).replace( /&network=.*/, "" ) );
            if( gameUrl == url ) {
                game.watching = true;
            }
        }
    }

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({ status: "success", games: gamesResponse }));
});

// Endpoint to watch a game
app.get('/watch', async function(request, response) {
    if( !watchBrowser ) {
        await openBrowser();
    }
    // The url to watch the game on
    let url = decodeURIComponent(request.query.url);

    let page;
    if ( Site.PATH_TO_CHROME ) {
        let pages = await watchBrowser.pages();
        page = pages[0];
    }
    else {
        page = Site.connectedTabs[0];
    }

    // Ensure the page is focused
    page.bringToFront();

    // We don't wait for watching to be done
    // Browsers can start retrying requests that don't complete - we don't want this
    watch(page, url, request);

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
});

// Endpoint to stop a game
app.get('/stop', async function(request, response) {
    if( !watchBrowser ) {
        await openBrowser();
    }

    let page;
    if ( Site.PATH_TO_CHROME ) {
        let pages = await watchBrowser.pages();
        page = pages[0];
    }
    else {
        page = Site.connectedTabs[0];
    }
    let site = new Site(page);
    await site.stop();

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
});

// Endpoint to break the cache
app.get( '/break', async function(request, response) {
    gamesCache = null;

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to set cable information
app.post( '/info', async function(request, response) {
    let username = request.body.username;
    let password = request.body.password;
    let provider = request.body.provider;

    if( username ) {
        Site.username = username;
    }
    if( password ) {
        Site.password = password;
    }
    if( provider ) {
        Site.provider = provider;
    }

    // Save the info for future use
    fs.writeFileSync( LOGIN_INFO_FILE, JSON.stringify(request.body) );

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to remove/add channels from the list of those disallowed
app.post( '/channel', async function(request, response) {
    let channel = request.body.channel;
    let type = request.body.type;

    Site.unsupportedChannels = { "channel": channel, "type": type };

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to find what channels are currently disallowed
app.get( '/channel', async function(request, response) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success", "channels":Site.unsupportedChannels}));
} );

// Endpoint to start the regularly occuring process of refetching games
app.get( '/start-interval', async function(request, response) {
    if( !fetchInterval ) {
        fetchInterval = setInterval(fetchGames, FETCH_GAMES_INTERVAL); // Fetch every few minutes from this point on
    }

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to stop the regularly occuring process of refetching games
app.get( '/stop-interval', async function(request, response) {
    clearInterval(fetchInterval);
    fetchInterval = null;

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to get available wifi networks

// Endpoint to connect to a wifi network (always close tab afterwards!)
app.post( '/connect', async function(request, response) {
    // We'll connect using Chrome
    if( !watchBrowser ) {
        await openBrowser();
    }
    
    // The page to return to after connection
    let returnPage;
    if ( Site.PATH_TO_CHROME ) {
        let pages = await watchBrowser.pages();
        returnPage = pages[0];
    }
    else {
        returnPage = Site.connectedTabs[0];
    }

    // Get the wifi credentials
    let ssid = request.body.ssid;
    let username = request.body.username;
    let password = request.body.password;
    // Valid types are "None", "WEP-PSK", "WPA-PSK", and "WPA-EAP"
    let type = request.body.type;

    // Open a new page
    let page = await watchBrowser.newPage();
    await page.goto("chrome://settings");
    await page.waitForSelector("settings-ui");
    // Get the root of most internet settings
    let internetSettingsRoot = await this.page.evaluateHandle(
        () => document.querySelector('settings-ui').shadowRoot.querySelector('settings-main').shadowRoot.querySelector('settings-basic-page').shadowRoot.querySelector('settings-internet-page').shadowRoot
    );
    // Click new connection
    let addConnectionButton = await internetSettingsRoot.$("settings-section[section='internet'] .settings-box");
    await addConnectionButton.click();
    await page.waitFor(100);
    // Click new wifi connection
    let wifiButton = await internetSettingsRoot.$(".icon-add-wifi button");
    await wifiButton.click;
    await page.waitFor(250);

    // Get all the new fields
    let popupRoot  = await this.page.evaluateHandle(
        (element) => element.querySelector('internet-config').shadowRoot.querySelector("network-config").shadowRoot,
        internetSettingsRoot
    );
    let ssidRoot = await this.page.evaluateHandle(
        (element) => element.querySelector('#networkConfig').shadowRoot.querySelector("#ssid").shadowRoot,
        popupRoot
    );
    let selectRoot = await this.page.evaluateHandle(
        (element) => element.querySelector('network-config-select').shadowRoot,
        popupRoot
    );
    
    // Type the correct ssid
    let ssidInput = await ssidRoot.$("#input");
    await ssidInput.click();
    await ssidInput.focus();
    await page.keyboard.type( ssid );

    // Click the correct security
    let networkConfigSelect = await selectRoot.$("select");
    await networkConfigSelect.click();
    let networkConfigOption = await selectRoot.$("network-config-select option[value='" + type + "']");
    await networkConfigOption.click();
    await page.waitFor(100);

    // Type the password if necessary
    if( type != "None" ) {
        let passwordRoot = await this.page.evaluateHandle(
            (element) => element.querySelector('network-password-input').shadowRoot.querySelector("#input").shadowRoot,
            popupRoot
        );
        let passwordInput = await passwordRoot.$("#input");
        
        await passwordInput.click();
        await passwordInput.focus();
        await page.keyboard.type( password );
    }
    await page.waitFor(250);

    // Click connect
    let connectButton = await popupRoot.$("internet-config .layout paper-button:nth-child(2)");
    await connectButton.click();

    // Close settings
    await page.close();
    await returnPage.bringToFront();

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// -------------------- Main Program --------------------

// Read file for login data
if ( fs.existsSync(LOGIN_INFO_FILE) ) { 
    let contents = fs.readFileSync(LOGIN_INFO_FILE, 'utf8');
    try {
        let loginInfo = JSON.parse(contents);
        if( loginInfo.username ) {
            Site.username = loginInfo.username;
        }
        if( loginInfo.password ) {
            Site.password = loginInfo.password;
        }
        if( loginInfo.provider ) {
            Site.provider = loginInfo.provider;
        }
    }
    catch(e) {
        console.log(e);
    }
}

app.listen(PORT); // Listen for requests

// -------------------- Helper Functions --------------------

/**
 * Launch the watch browser.
 */
async function openBrowser() {
    // If there is a Chrome path, we will try to launch chrome
    if ( Site.PATH_TO_CHROME ) {
        watchBrowser = await puppeteer.launch({
            headless: false,
            executablePath: Site.PATH_TO_CHROME,
            args: ['--disable-infobars','--start-maximized'],
            userDataDir: './userDataDir'
        });
        let pages = await watchBrowser.pages();
        let page = pages[0];
        // This makes the viewport correct
        // https://github.com/GoogleChrome/puppeteer/issues/1183#issuecomment-383722137
        await page._client.send('Emulation.clearDeviceMetricsOverride');
    }
    // If not, we'll try to connect to an existing instance (ChromeOS)
    else {
        watchBrowser = await Site.connectToChrome();
    }
    watchBrowser.on("disconnected", function() {
        watchBrowser = null;
    });
    return Promise.resolve(1);
}

/**
 * Asynchronously start watching
 */
async function watch(page, url, request) {
    await page.goto(url, {timeout: Site.STANDARD_TIMEOUT});

    let networkName = request.query.network;

    let Network = NETWORKS[networkName];
    if( Network ) {
        let network = new Network(page);
        await network.watch();
    }

    return Promise.resolve(1);
}

/**
 * Fetch games and cache the result
 * @returns Promise - true if games where fetched, false if not (the method is locked)
 */
async function fetchGames() {
    // Only fetch games if we are not already fetching them and we know we can
    if( fetchGamesLocked ) {
        return Promise.resolve(false);
    }
    fetchGamesLocked = true;

    let networks = [];
    if( !Site.PATH_TO_CHROME ) {
        await Site.connectToChrome();
        // Create an instance of each network class
        let index = 1;
        for( let Network of Object.keys(NETWORKS).map( v => NETWORKS[v] ) ) {
            if( Site.unsupportedChannels.indexOf(Network.name.toLowerCase()) === -1 ) {
                networks.push(new Network(Site.connectedTabs[index]));
            }
            index++; // We still want to maintain one tab per network
        }
    }
    else {
        // Create an instance of each network class
        for( let Network of Object.keys(NETWORKS).map( v => NETWORKS[v] ) ) {
            if( Site.unsupportedChannels.indexOf(Network.name.toLowerCase()) === -1 ) {
                networks.push(new Network());
            }
        }
    }

    // Generate all the games
    let values = [];
    for( let i=0; i < networks.length; i += MAX_SIMULTANEOUS_FETCHES ) {
        let currentNetworks = [];
        for ( let j=0; j<MAX_SIMULTANEOUS_FETCHES; j++ ) {
            if( i+j < networks.length ) {
                currentNetworks.push(networks[i+j]);
            }
        }
        values = values.concat(
            await Promise.all(
                currentNetworks.map( network => network.generateGames() )
            )
        );
    }

    // Concatenate all the values
    let joinedValues = [];
    for (let value of values) {
        joinedValues = joinedValues.concat(value);
    }

    // Update the cache
    gamesCache = joinedValues;

    // Cleanup
    if( Site.PATH_TO_CHROME ) {
        networks.map( network => network.browser.close() )
    }
    else {
        networks.map( network => network.stop() )
    }

    fetchGamesLocked = false;
    return Promise.resolve(true);
}

// Sleep helper function
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}