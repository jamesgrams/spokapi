// JavaScript File to run the Spokapi Client
var games = {};
var xhttp;
window.addEventListener('load', function() {
    loadGames();
});
function clearWatchedGames() {
    var gameElements = document.querySelectorAll(".game");
    for(var i=0; i<gameElements.length; i++) {
        gameElements[i].className = "game";
    }
}
function watchGame(gameElement) {
    if(!gameElement.className.includes("watching")) {
        clearWatchedGames();
        var link = gameElement.getAttribute('data-link');
        // clear any existing requests
        if( xhttp ) {
            xhttp.abort;
        }
        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                gameElement.className = "game watching";
            }
        };
        xhttp.open("GET", link, true);
        xhttp.send();
    }
    // Turn off the game
    else {
        if( xhttp ) {
            xhttp.abort;
        }
        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                gameElement.className = "game";
            }
        };
        xhttp.open("GET", "/stop", true);
        xhttp.send();
    }
}
function loadGames() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            document.getElementById("games").innerHTML = "";
            games = JSON.parse(this.responseText);
            sortGames();
            generateGames();
        }
    };
    xhttp.open("GET", "/games", true);
    xhttp.send();
}
function sortGames() {
    games.sort( function(a, b) {
        if( a.sport < b.sport ) { return -1 };
        if( b.sport < a.sport ) { return 1 };
        if( a.subsport < b.subsport ) { return -1 };
        if( b.subsport < a.subsport ) { return 1 };
        if( a.name < b.name ) { return -1 };
        if( b.name < a.name ) { return 1 };
        return 0;
    } );
}
function generateGames() {
    var prevGameSport = "";
    var prevGameSubsport = "";
    for(var i=0; i<games.length; i++) {
        var game = games[i];
        // Add headings for sports
        if(game.sport && game.sport != prevGameSport) {
            document.getElementById("games").innerHTML += "<h2>" + game.sport + "</h2>";
            prevGameSport = game.sport;
        }
        // Add headings for subsports
        if(game.subsport && game.subsport != prevGameSubsport) {
            document.getElementById("games").innerHTML += "<h3>" + game.subsport + "</h3>";
            prevGameSubsport = game.subsport;
        }
        game = generateGame(game);
        document.getElementById("games").innerHTML += game;
    }
}
function generateGame(game) {
    var html = "<div class='game' onclick='watchGame(this)' data-link='"+game.link+"'>" +
        "<div class='game-title'>" + game.name + "</div>" +
        "<div class='game-network'>" + game.network + " (" + game.subnetwork + ")" + "</div>" +
        "<div class='game-time'>" + game.time + "</div>" +
        "<div class='game-seperator'></div>"
        "</div>";
    return html;
}