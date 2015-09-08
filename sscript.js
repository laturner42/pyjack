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

function peekSize() {
    return parseInt(data.substring(0, 3));
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
        var newPlayer = {};
        newPlayer.pID = pID;
        newPlayer.cards = [];
        lbl = $("<li>Player "+String(pID)+"</li>");
        newPlayer.label = lbl;
        $("#players").append(lbl);
    } else if (msgID === 10) {
        hostCode = readChars(4);
        $("#hostCode").text("Host code: "+hostCode);
    }
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

function getMsgSize(msgID) {
    if (msgID == 1) {
        return 3 + 2;
    } else if (msgID == 10) {
        return 3 + 4;
    } else {
        alert("Message ID "+String(msgID)+" does not exist.");
    }
    return 3;
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
