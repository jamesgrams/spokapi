/**
 * @file    Index for the Spokapi application
 * @author  James Grams
 */

const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const ip = require("ip");
const Site 	= require('./modules/site');
const Espn 	= require('./modules/site/espn');

// We need to use Chrome instead of Chromium here, since Chromium does not support video playback
// https://github.com/GoogleChrome/puppeteer/issues/291
/**
 * @constant
 * @type {string}
 */
const PATH_TO_CHROME = process.env.SPOKAPI_CHROME_PATH;
/**
 * @constant
 * @type {number}
 * @default
 */
const PORT           = 8080;

var watchBrowser;
const app = express();
const dir = 'public';

// Middleware to serve static public directory
app.use( '/static/', express.static(dir) );

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
</body>
</html>
`;

    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end(page);
});

// Endpoint to get a list of games
app.get('/games', async function(request, response) {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: PATH_TO_CHROME
    });
    let page = await browser.newPage();
    
    let espn = new Espn(page);
    let espnGames = await espn.generateGames();

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify(espnGames));

    browser.close();
});

// Endpoint to watch a game
app.get('/watch', async function(request, response) {
    if( !watchBrowser ) {
        await openBrowser();
    }
    // The url to watch the game on
    let url = decodeURIComponent(request.query.url);
    let pages = await watchBrowser.pages();
    let page = pages[0];

    await page.goto(url, {timeout: 0});

    let network = request.query.network;
    // Use the right code to watch the game
    switch(network) {
        case "espn":
            let espn = new Espn(page);
            await espn.watch();
            break;
        default:
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end(JSON.stringify({"status":"failure", "message":"Invalid Network"}));
            return;
    }
    
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
});

// Endpoint to watch a game
app.get('/stop', async function(request, response) {
    if( !watchBrowser ) {
        await openBrowser();
    }
    let pages = await watchBrowser.pages();
    let page = pages[0];
    let site = new Site(page);
    await site.stop();
});

app.listen(PORT);

/**
 * Launch the watch browser.
 */
async function openBrowser() {
    watchBrowser = await puppeteer.launch({
        headless: false,
        executablePath: PATH_TO_CHROME,
        args: ['--start-fullscreen', '--disable-infobars']
    });
    watchBrowser.on("disconnected", function() {
        watchBrowser = null;
    });
    let pages = await watchBrowser.pages();
    let page = pages[0];
    // This makes the viewport correct
    // https://github.com/GoogleChrome/puppeteer/issues/1183#issuecomment-383722137
    await page._client.send('Emulation.clearDeviceMetricsOverride');
}
