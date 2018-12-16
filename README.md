# Spokapi Application

Spokapi is an application that simplifies watching sports online (using sites such as WatchESPN) by providing an interface as simple as a TV remote that can be accessed on your smartphone.

## Usage Overview
1. Connect a computer to your TV and the internet.
2. Install and run Spokapi on that computer.
3. Get the IP of your computer
4. Access Spokapi with any device with a web browser by going to your computer's **local** IP address and port 8080 (e.g. 10.0.0.120:8080).

## Installation
1. Clone this repository.
2. `cd` to this repository.
3. Make sure you have node and npm installed.
4. Make sure you have Google Chrome downloaded and know the path to it.
5. `npm install`
7. `export SPOKAPI_USERNAME=<Your Cable Provider Username/Email>`
8. `export SPOKAPI_PASSWORD=<Your Cable Provider Username/Password>`
9. `export SPOKAPI_PROVIDER=<Your Cable Provider>` (See the list of Supported Cable Providers)
11. `export SPOKAPI_CHROME_PATH=<Path to Google Chrome on your Computer>` (Recommended Version: 68 [This saves your flash settings])
12. `npm start`
13. Some games use flash. Unfortunately, Spokapi can't allow flash automatically. You can set up the Chrome Profile that Spokapi uses to save your flash settings, provided you are not using Chrome above version 68. To do this, do the following:
    1. `<Path to Google Chrome on your Computer> --user-data-dir=<Path to Spokapi Directory>/userDataDir` (Run this from the Spokapi directory)
    2. Once the browser starts, go to `chrome://flags/`
    3. Set the `Enable Ephemeral Flash Permissions` permission to Disabled.
    4. Restart Chrome.
    5. When you go to watch a game on Spokapi that needs flash installed, Spokapi will fail to start the game, because Flash is disabled. When this happens, manually click to "Allow Flash" (There may be a link to "Update Flash Player" that you must click). Chrome should now have saved your preference to allow Flash for that site, and you should be able to use Spokapi worry-free now.
14. You should be all set! Note: You might want to make sure that the computer running the Spokapi server has a static local IP address in your router settings. In addition, adding the Spokapi client's URL to the homesreen of your device should provide easy access!

## Current Support
- Providers
    - Spectrum
- Channels
    - ESPN

## Endpoints
- `/games/`
    - This will return an array of objects containing a list of available games to watch
- `/watch/`
    - This allows you to control the browser
- `/`
    - This will return the Spokapi Client