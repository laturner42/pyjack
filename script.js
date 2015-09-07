var data = "";
var ws;
var cards = [];

$(document).ready(function() {
 
    $("#hitme").hide();
    $("#stay").hide();

    $("#login").click( function() {
        ws = new WebSocket("ws://localhost:8886");
        ws.onmessage = function (event) {
            data = data + event.data;
        }
        window.onbeforeunload = function() {
            ws.onclose = function () {}; // disable onclose handler first
            ws.close();
        };
        ws.onopen = function() {
            //ws.send($("#name").val());
        }
    } );

    $("#hitme").click( function() {
        writeMsgID(1);
    });

    $("#stay").click( function() {
        $("#hitme").hide();
        $("#stay").hide();
    }); 

    setInterval(gameLoop, 15);
});

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
        $("#login").hide();
        $("#name").hide();
        $("#notify").text("Waiting to for game to start...");
    } else if (msgID === 2) {
        var card1 = readChars(2);
        var card2 = readChars(2);
        $("#hitme").show();
        $("#stay").show();
        addCard(card1);
        addCard(card2);
        $("#notify").text("These are your cards.");
    } else if (msgID === 3) {
        var card = readChars(2);
        addCard(card);
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
        return 3;
    } else if (msgID == 2) {
        return 3 + 4;
    } else if (msgID == 3) {
        return 3 + 2;
    }
    return 3;
}

function gameLoop() {
    handleNetwork();
    if (cards.length > 0) {
        var total = 0;
        for (var i=0; i<cards.length; i++) {
            var val = cards[i].substring(0,1);
            if (val == "0" || val=="J" || val=="Q" || val=="K") {
                total += 10;
            } else if (val == "A") {
                total += 1;
            } else {
                total += parseInt(val);
            }
        }
        if (total < 21) {
            $("#notify").text("These are your cards. Total: "+String(total));
        } else if (total == 21) {
            $("#notify").text("You got 21!");
            $("#hitme").hide();
            $("#stay").hide();
        } else {
            $("#notify").text("You busted with "+String(total));
            $("#hitme").hide();
            $("#stay").hide();
        }
    }
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
