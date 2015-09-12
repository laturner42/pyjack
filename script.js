var data = "";
var ws;
var cards = [];

var total = 0;

$(document).ready(function() {
 
    $("#hitme").hide();
    $("#stay").hide();

    $("#start").hide();

    $("#hostCode").on('input',  function() {
        $("#hostCode").val($("#hostCode").val().toUpperCase());
    });

    $("#login").click( function() {
        ws = new WebSocket("ws://preston.room409.xyz:8886");
        ws.onmessage = function (event) {
            data = data + event.data;
        }
        window.onbeforeunload = function() {
            ws.onclose = function () {}; // disable onclose handler first
            ws.close();
        };
        ws.onopen = function() {
            var hostCode = $("#hostCode").val().toUpperCase();
            if (hostCode == "0000" || hostCode.length != 4) {
                alert("This is an invalid host code. Try again!");
            } else {
                var name = $("#name").val();
                writeMsgID(5);
                writeString(name);
                writeMsgID(10);
                writeChars(hostCode, 4);
            }
        }

        $("#host").hide();
    } );

    $("#host").click( function() {
        window.location.href = '/host.html';
    });

    $("#start").click( function() {
        writeMsgID(0);
    });

    $("#hitme").click( function() {
        writeMsgID(1);
    });

    $("#stay").click( function() {
        writeMsgID(2);
        writeChars(total, 2);
        $("#hitme").hide();
        $("#stay").hide();
        $("#notify").text("You stayed with a score of " + String(total));
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
        var pID = parseInt(readChars(2));
        $("#myname").text("");
        $("#login").hide();
        $("#name").hide();
        $("#myhost").hide();
        $("#hostCode").hide();

        $("#start").show();
        $("#notify").text("Waiting for players...");
    } else if (msgID === 2) {
        $("#start").hide();
        var card1 = readChars(2);
        var card2 = readChars(2);
        $("#cards").empty();
        cards = [];
        addCard(card1);
        addCard(card2);
        total = parseInt(readChars(2));
        $("#notify").text("These are your cards.");
    } else if (msgID === 3) {
        var card = readChars(2);
        addCard(card);
        total = parseInt(readChars(2));
        parseScore();
    } else if (msgID === 4) {
        $("#notify").text("It is your turn!");
        $("#hitme").show();
        $("#stay").show();
        parseScore();
    } else if (msgID === 5) {
        winner = parseInt(readChars(1));
        if (winner == 1) {
            $("#notify").text("You won!");
        } else {
            $("#notify").text("You lost...");
        }
        $("#start").show();
    } else if (msgID === 10) {
        code = readChars(4);
        alert("Host code " + String(code) + " is invalid.");
    }
}

function addCard(card) {
    val = card.substring(0,1);
    suit = card.substring(1,2);
    name = "";
    color = "black";
    if (val == "0") {
        name += "10";
    } else if (val == "J") {
        name += "J";
    } else if (val == "Q") {
        name += "Q";
    } else if (val == "K") {
        name += "K";
    } else if (val == "A") {
        name += "A";
    } else {
        name += String(val);
    }
    name += "</br>";
    if (suit == "H") {
        name += "&#9829;";
        color = "red";
    } else if (suit == "S") {
        name += "&#9824;";
    } else if (suit == "C") {
        name += "&#9827;";
    } else if (suit == "D") {
        name += "&#9830;";
        color = "red";
    }
    var newCard = $("<li><div class='card'>"+name+"</div></li>");
    newCard.css("color", color);
    $("#cards").append(newCard);
    cards.push(card);
}

function parseScore() {
    if (total < 0) {
        return;
    }

    if (total < 21) {
        $("#notify").text("These are your cards. Total: "+String(total));
    } else if (total == 21) {
        $("#notify").text("You got 21!");
        $("#hitme").hide();
    } else {
        $("#notify").text("You busted with "+String(total));
        total = -1;
        $("#hitme").hide();
        $("#stay").hide();
        writeMsgID(3);
    }
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
    } else if (msgID == 2) {
        return 3 + 4 + 2;
    } else if (msgID == 3) {
        return 3 + 2 + 2;
    } else if (msgID == 4) {
        return 3;
    } else if (msgID == 5) {
        return 4;
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
