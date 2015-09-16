var ws;
var cards = [];

var total = 0;

$(document).ready(function() {
 
    setupMessages();

    $("#hitme").hide();
    $("#stay").hide();

    $("#start").hide();

    $("#hostCode").on('input',  function() {
        $("#hostCode").val($("#hostCode").val().toUpperCase());
    });

    $("#login").click( function() {
        startConnection(); 
    } );

    $("#host").click( function() {
        window.location.href = '/host.html';
    });

    $("#start").click( function() {
        newPacket(0).send();
        //writeMsgID(0);
    });

    $("#hitme").click( function() {
        newPacket(1).send();
        //writeMsgID(1);
    });

    $("#stay").click( function() {
        //writeMsgID(2);
        //writeChars(total, 2);
        var packet = newPacket(2);
        packet.write(total);
        packet.send();
        $("#hitme").hide();
        $("#stay").hide();
        $("#notify").text("You stayed with a score of " + String(total));
    }); 

    setInterval(gameLoop, 15);
});

function startConnection() {
    var onopen = function() {
        var hostCode = $("#hostCode").val().toUpperCase();
        if (hostCode == "0000" || hostCode.length != 4) {
            alert("This is an invalid host code. Try again!");
        } else {
            var name = $("#name").val();
            var packet = newPacket(5);
            packet.write(name);
            packet.send();
            packet = newPacket(10);
            packet.write(hostCode);
            packet.send();
        }
    }

    var onclose = function() {
        window.location.href = '/';
    }

    wsconnect("ws://preston.room409.xyz:8886", onopen, onclose);

    $("#host").hide();
}

function setupMessages() {
    var m1 = createMsgStruct(1, false);
    m1.addChars(2);

    var m2 = createMsgStruct(2, false);
    m2.addChars(2);
    m2.addChars(2);
    m2.addChars(2);

    var m3 = createMsgStruct(3, false);
    m3.addChars(2);
    m3.addChars(2);

    var m4 = createMsgStruct(4, false);
    
    var m5 = createMsgStruct(5, false);
    m5.addChars(1);

    var m10 = createMsgStruct(10, false);
    m10.addChars(4);

    var o0 = createMsgStruct(0, true);

    var o1 = createMsgStruct(1, true);

    var o2 = createMsgStruct(2, true);
    o2.addChars(2);

    var o3 = createMsgStruct(3, true);

    var o5 = createMsgStruct(5, true);
    o5.addString();

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
        var pID = parseInt(packet.read());
        $("#myname").text("");
        $("#login").hide();
        $("#name").hide();
        $("#myhost").hide();
        $("#hostCode").hide();

        $("#start").show();
        $("#notify").text("Waiting for players...");
    } else if (msgID === 2) {
        $("#start").hide();
        var card1 = packet.read(); //readChars(2);
        var card2 = packet.read(); //readChars(2);
        $("#cards").empty();
        cards = [];
        addCard(card1);
        addCard(card2);
        total = packet.readInt(); //parseInt(readChars(2));
        $("#notify").text("These are your cards.");
    } else if (msgID === 3) {
        var card = packet.read(); //readChars(2);
        addCard(card);
        total = packet.readInt(); //readChars(2));
        parseScore();
    } else if (msgID === 4) {
        $("#notify").text("It is your turn!");
        $("#hitme").show();
        $("#stay").show();
        parseScore();
    } else if (msgID === 5) {
        winner = packet.readInt(); //parseInt(readChars(1));
        if (winner == 1) {
            $("#notify").text("You won!");
        } else {
            $("#notify").text("You lost...");
        }
        $("#start").show();
    } else if (msgID === 10) {
        code = packet.read(); //readChars(4);
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
        newPacket(3).send();
    }
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
