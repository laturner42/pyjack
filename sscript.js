var data = "";
var ws;

var players = [];

var hostCode = "";

var MSG_NEW_PLAYER = 11;
var MSG_PLAYER_CARDS = 12;
var MSG_PLAYER_BUST = 13;
var MSG_PLAYER_HIT = 14;
var MSG_NEW_TURN = 15;
var MSG_WINNER = 16;
var MSG_DISCONNECT = 17;
var MSG_HOSTING = 10;

var MSG_LOGIN = 10;

$(document).ready(function() {
    connect();
});

function connect() {

    setupMessages();

    var onopen = function() {
        $("#myHostCode").text("Waiting on host code...");
        var packet = newPacket(MSG_LOGIN);
        packet.write("0000");
        packet.send();
        /*
        writeMsgID(10);
        writeChars("0000", 4);
        */
        setInterval(gameLoop, 15);
    }

    var onclose = function() {
        alert("Lost connection.");
    }

    wsconnect("ws://localhost:8886", onopen, onclose);
}

function setupMessages() {
    var m1 = createMsgStruct(MSG_NEW_PLAYER, false);
    m1.addChars(2);
    m1.addString();

    var m2 = createMsgStruct(MSG_PLAYER_CARDS, false);
    m2.addChars(2);
    m2.addChars(2);
    m2.addChars(2);

    var m3 = createMsgStruct(MSG_PLAYER_BUST, false);
    m3.addChars(2);

    var m4 = createMsgStruct(MSG_PLAYER_HIT, false);
    m4.addChars(2);
    m4.addChars(2);

    var m5 = createMsgStruct(MSG_NEW_TURN, false);
    m5.addChars(2);
    
    var m6 = createMsgStruct(MSG_WINNER, false);
    m6.addChars(2);

    var m7 = createMsgStruct(MSG_DISCONNECT, false);
    m7.addChars(2);

    var m10 = createMsgStruct(MSG_HOSTING, false);
    m10.addChars(4);

    var o10 = createMsgStruct(MSG_LOGIN, true);
    o10.addChars(4);
}

function handleNetwork() {
    if (!canHandleMsg()) {
        return;
    }
    var packet = readPacket();
    msgID = packet.msgID;
    if (msgID === MSG_NEW_PLAYER) {
        var pID = packet.readInt(); //parseInt(readChars(2));
        var name = packet.read(); //readString();
        for (var i=0; i<players.length; i++) {
            if (players[i].pID == pID) {
                players[i].connected = true;
                players[i].label.css("color", "#AAA");
                renderCards();
                return
            }
        }
        var newPlayer = {};
        newPlayer.pID = pID;
        newPlayer.cards = [];
        newPlayer.myTurn = false;
        newPlayer.name = name;
        newPlayer.connected = true;
        lbl = $("<li>Player "+String(pID)+"</li>");
        lbl.css("color", "#AAA");
        newPlayer.label = lbl;
        $("#players").append(lbl);
        players.push(newPlayer);
        renderCards();
    } else if (msgID === MSG_PLAYER_CARDS) {
        var pID = packet.readInt(); //parseInt(readChars(2));
        var player = findPlayer(pID);
        player.cards = [];
        player.cards.push(packet.read()); //readChars(2));
        player.cards.push(packet.read()); //readChars(2));
        renderCards();
        player.label.css("color", "#999");
    } else if (msgID == MSG_PLAYER_HIT) {
        var pID = packet.readInt(); //parseInt(readChars(2));
        var player = findPlayer(pID);
        player.cards.push(packet.read()); //readChars(2));
        renderCards();
    } else if (msgID == MSG_PLAYER_BUST) {
        var pID = packet.readInt(); //parseInt(readChars(2));
        var player = findPlayer(pID);
        renderCards();
        player.myTurn = false;
        player.label.css("color", "red");
    } else if (msgID == MSG_NEW_TURN) {
        var pID = packet.readInt(); //parseInt(readChars(2));
        var player = findPlayer(pID);
        for (var i=0; i<players.length; i++) {
            if (players[i].myTurn) {
                players[i].label.css("color", "white");
                players[i].myTurn = false;
                break;
            }
        }
        player.label.css("color", "cyan");
        player.myTurn = true;
    } else if (msgID === MSG_WINNER) {
        for (var i=0; i<players.length; i++) {
            if (players[i].myTurn) {
                players[i].label.css("color", "white");
                players[i].myTurn = false;
                break;
            }
        }
        var pID = packet.readInt(); //parseInt(readChars(2));
        findPlayer(pID).label.css("color", "lime");
        renderCards(true);
    } else if (msgID === MSG_DISCONNECT) {
        var pID = packet.readInt(); //parseInt(readChars(2));
        for (var i=0; i<players.length; i++) {
            if (players[i].pID === pID) {
                players[i].connected = false;
                players[i].label.text(players[i].name+" disconnected.");
                players[i].label.css("color", "yellow");
                players[i].myTurn = false;
                players[i].cards = [];
            }
        }
    } else if (msgID === MSG_HOSTING) {
        hostCode = packet.read(); //readChars(4);
        $("#myHostCode").text("Host code: "+hostCode);
    }
}

function renderCards(show) {
    for (var p=0; p<players.length; p++) {
        var player = players[p];
        if (!player.connected) {
            continue;
        }
        var t = "<li>"+player.name;
        if (player.cards.length > 0) {
            t += " :  ";
            for (var c=0; c<player.cards.length; c++) {
                if (c > 0 || show) {
                    var card = player.cards[c];
                    var val = card.substring(0,1);
                    if (val === '0') {
                        val = '10'
                    }
                    var suit = card.substring(1,2);
                    if (suit === 'H') {
                        suit = "&#9829;";
                    } else if (suit === "S") {
                        suit = "&#9824;";
                    } else if (suit === "C") {
                        suit = "&#9827;";
                    } else {
                        suit = "&#9830;";
                    }
                    t += val + suit + "  ";
                } else {
                    t += "??  ";
                }
            }
        }
        t += "</li>";
        player.label.html(t);
    }
}

function findPlayer(pID) {
    for (var i=0; i<players.length; i++) {
        if (players[i].pID === pID) {
            return players[i];
        }
    }
    return null;
}

function addCard(card) {
    val = card.substring(0,1);
    suit = card.substring(1,2);
    name = "";
    if (val == "0") {
        name += "10";
    } else if (val == "J") {
        name += "Jack";
    } else if (val == "Q") {
        name += "Queen";
    } else if (val == "K") {
        name += "King";
    } else if (val == "A") {
        name += "Ace";
    } else {
        name += String(val);
    }
    name += " of ";
    if (suit == "H") {
        name += "Hearts";
    } else if (suit == "S") {
        name += "Spades";
    } else if (suit == "C") {
        name += "Clubs";
    } else if (suit == "D") {
        name += "Diamonds";
    }
    $("#cards").append($("<li>"+name+"</li>"));
    cards.push(card);
}

function gameLoop() {
    handleNetwork();
}

function httpGet(url, callback, carryout) {
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", url, true);
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4) {
			if (xmlHttp.status == 200) {
				alert(xmlHttp.responseText);
			}
		}
	}
	xmlHttp.send();
}
