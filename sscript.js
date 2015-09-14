var data = "";
var ws;

var players = [];

var hostCode = "";

$(document).ready(function() {
    connect();
});

function connect() {

    setupMessages();

    var onopen = function() {
        $("#myHostCode").text("Waiting on host code...");
        var packet = newPacket(10);
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

    wsconnect("ws://preston.room409.xyz:8886", onopen, onclose);
}

function setupMessages() {
    var m1 = createMsgStruct(1, false);
    m1.addChars(2);
    m1.addString();

    var m2 = createMsgStruct(2, false);
    m2.addChars(2);
    m2.addChars(2);
    m2.addChars(2);

    var m3 = createMsgStruct(3, false);
    m3.addChars(2);

    var m4 = createMsgStruct(4, false);
    m4.addChars(2);
    m4.addChars(2);

    var m5 = createMsgStruct(5, false);
    m5.addChars(2);
    
    var m6 = createMsgStruct(6, false);
    m6.addChars(2);

    var m7 = createMsgStruct(7, false);
    m7.addChars(2);

    var m10 = createMsgStruct(10, false);
    m10.addChars(4);

    var o10 = createMsgStruct(10, true);
    o10.addChars(4);
}

function handleNetwork() {
    if (!canHandleMsg()) {
        return;
    }
    var packet = readPacket();
    msgID = packet.msgID;
    if (msgID === 1) {
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
    } else if (msgID === 2) {
        var pID = packet.readInt(); //parseInt(readChars(2));
        var player = findPlayer(pID);
        player.cards = [];
        player.cards.push(packet.read()); //readChars(2));
        player.cards.push(packet.read()); //readChars(2));
        renderCards();
        player.label.css("color", "#999");
    } else if (msgID == 4) {
        var pID = packet.readInt(); //parseInt(readChars(2));
        var player = findPlayer(pID);
        player.cards.push(packet.read()); //readChars(2));
        renderCards();
    } else if (msgID == 3) {
        var pID = packet.readInt(); //parseInt(readChars(2));
        var player = findPlayer(pID);
        renderCards();
        player.myTurn = false;
        player.label.css("color", "red");
    } else if (msgID == 5) {
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
    } else if (msgID === 6) {
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
    } else if (msgID === 7) {
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
    } else if (msgID === 10) {
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
