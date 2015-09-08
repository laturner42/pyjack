var data = "";
var ws;

var players = [];

var hostCode = "";

$(document).ready(function() {
    connect();
    setInterval(gameLoop, 15);
});

function connect() {
    ws = new WebSocket("ws://localhost:8886");
    ws.onmessage = function(event) {
        data = data + event.data;
    };

    window.onbeforeunload = function() {
        ws.onclose = function() {};
        ws.close();
    };

    ws.onopen = function() {
        $("#hostCode").text("Waiting on host code...");
        writeMsgID(10);
        writeChars("0000", 4);
    }
}

function readChars(k) {
    d = data.substring(0, k);
    data = data.substring(k);
    return d;
}

function readMsgID() {
    return readSize();
}

function readSize() {
    d = parseInt(data.substring(0, 3));
    data = data.substring(3);
    return d;
}

function writeMsgID(msgID) {
    writeSize(msgID);
}

function writeSize(num) {
    s = String(num);
    while (s.length < 3) {
        s = "0"+s;
    }
    ws.send(s);
}

function writeChars(chars, numChars) {
    s = String(chars);
    while (s.length < numChars) {
        s = "0"+s;
    }
    ws.send(s);
}

function writeString(string) {
    writeSize(string.length);
    ws.send(string);
}

function readString() {
    size = readSize();
    return readChars(size);
}

function peekSize(k) {
    if (k === undefined) {
        k = 0;
    }
    return parseInt(data.substring(k+0, k+3));
}

function handleNetwork() {
    if (data.length < 3) {
        return;
    }
    if (!canHandleMsg()) {
        return;
    }
    msgID = readMsgID();
    if (msgID === 1) {
        var pID = parseInt(readChars(2));
        var name = readString();
        var newPlayer = {};
        newPlayer.pID = pID;
        newPlayer.cards = [];
        newPlayer.myTurn = false;
        newPlayer.name = name;
        lbl = $("<li>Player "+String(pID)+"</li>");
        newPlayer.label = lbl;
        $("#players").append(lbl);
        players.push(newPlayer);
        renderCards();
    } else if (msgID === 2) {
        var pID = parseInt(readChars(2));
        var player = findPlayer(pID);
        player.cards = [];
        player.cards.push(readChars(2));
        player.cards.push(readChars(2));
        renderCards();
        player.label.css("color", "#AAA");
    } else if (msgID == 4) {
        var pID = parseInt(readChars(2));
        var player = findPlayer(pID);
        player.cards.push(readChars(2));
        renderCards();
    } else if (msgID == 3) {
        var pID = parseInt(readChars(2));
        var player = findPlayer(pID);
        renderCards();
        player.myTurn = false;
        player.label.css("color", "red");
    } else if (msgID == 5) {
        var pID = parseInt(readChars(2));
        var player = findPlayer(pID);
        for (var i=0; i<players.length; i++) {
            if (players[i].myTurn) {
                players[i].label.css("color", "white");
                players[i].myTurn = false;
                break;
            }
        }
        player.label.css("color", "blue");
        player.myTurn = true;
    } else if (msgID === 6) {
        for (var i=0; i<players.length; i++) {
            if (players[i].myTurn) {
                players[i].label.css("color", "white");
                players[i].myTurn = false;
                break;
            }
        }
        var pID = parseInt(readChars(2));
        findPlayer(pID).label.css("color", "green");
    } else if (msgID === 10) {
        hostCode = readChars(4);
        $("#hostCode").text("Host code: "+hostCode);
    }
}

function getMsgSize(msgID) {
    if (msgID == 1) {
        s = peekSize(5);       
        return 3 + 2 + 3 + s;
    } else if (msgID == 2) {
        return 3 + 2 + 4;
    } else if (msgID == 3) {
        return 3 + 2;
    } else if (msgID == 4) {
        return 3 + 2 + 2;
    } else if (msgID == 10) {
        return 3 + 4;
    } else if (msgID == 5) {
        return 3 + 2;
    } else if (msgID == 6) {
        return 3 + 2;
    } else {
        alert("Message ID "+String(msgID)+" does not exist.");
    }
    return 3;
}

function renderCards() {
    for (var p=0; p<players.length; p++) {
        var player = players[p];
        var t = player.name;
        if (player.cards.length > 0) {
            t += " :  ";
            for (var c=0; c<player.cards.length; c++) {
                if (c > 0) {
                    var card = player.cards[c];
                    t += card + "  ";
                } else {
                    t += "??  ";
                }
            }
        }
        player.label.text(t);
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

function canHandleMsg() {
    var msgID = peekSize();
    var len = getMsgSize(msgID);
    if (data.length >= len) {
        return true;
    }
    return false;
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
