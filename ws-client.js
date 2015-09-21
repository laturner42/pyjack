var _data = "";
var _ws;

var _outMsgStructs;
var _inMsgStructs;

function createMsgStruct(msgID, outgoing) {
    var struct = {};
    struct.msgID = msgID;
    struct.numParts = 0;
    struct.nextPart = 0;
    struct.parts = new Array();
    struct.sizes = new Array();

    if (outgoing) {
        _outMsgStructs[msgID] = struct;
    } else {
        _inMsgStructs[msgID] = struct;
    }
    struct.parts[struct.numParts] = "M";
    struct.sizes[struct.numParts] = 3; 
    struct.data = "";

    struct.reset = function() {
        this.data = extend(this.msgID, 3);
        this.nextPart = 0;
        return this;
    }

    struct.canHandle = function(data) {
        var part = 1;
        var ind = 3;
        while (part <= struct.numParts) {
            var type = this.parts[part];
            var len = this.sizes[part];
            if (data.substring(ind).length < len) {
                return false;
            }
            switch(type) {
                case "C":
                    ind += len;
                    break;
                case "S":
                    var size = parseInt(data.substring(ind, ind+len));
                    ind += len;
                    if (size > data.substring(ind).length) {
                        return false;
                    }
                    ind += size;
                    break;
            }
            part += 1;
        }
        return true;
    }

    struct.readInt = function() {
        return parseInt(this.read());
    }

    struct.read = function() {
        this.nextPart += 1;
        var type = this.parts[this.nextPart];
        var len = this.sizes[this.nextPart];
        var out;
        switch(type) {
            case "C":
                out = this.data.substring(0, len);
                break;
            case "S":
                var size = parseInt(this.data.substring(0, len));
                out = this.data.substring(len, len+size);
                len += size;
                break;
        }
        this.data = this.data.substring(len);
        //this.nextPart += 1;
        return out;
    }

    struct.fillFromData = function() {
        var part = 1;
        var ind = 3;
        while (part <= this.numParts) {
            var type = this.parts[part];
            var len = this.sizes[part];
            switch(type) {
                case "C":
                    ind += len;
                    break;
                case "S":
                    var size = parseInt(_data.substring(ind, ind+len));
                    ind += len;
                    ind += size;
                    break;
            }
            part += 1;
        }
        this.data = _data.substring(3,ind);
        this.nextPart = 0;
        _data = _data.substring(ind);
        return this;
    }

    struct.write = function(data) {
        this.nextPart += 1;
        var type = this.parts[this.nextPart];
        var len = this.sizes[this.nextPart];
        switch(type) {
            case "C":
                var dataS = String(data);
                if (dataS.length > len) {
                    alert("Incorrect MSG write size: " + dataS + " | max size " + String(len));
                    return;
                }
                dataS = extend(dataS, len);
                this.data += dataS;
            break;
            case "S":
                var dataS = String(data);
                var sLen = dataS.length;
                dataS = extend(sLen, len) + dataS;
                this.data += dataS;
            break;
        }
        return this;
    }

    struct.send = function() {
        if (this.nextPart < this.numParts) {
            alert("MSG struct was not finished being written!");
            return;
        }
        return _ws.send(this.data);
    }

    struct.addChars = function(numChars) {
        this.numParts += 1;
        this.parts[this.numParts] = "C";
        this.sizes[this.numParts] = numChars;
        return this;
    }

    struct.addString = function() {
        this.numParts += 1;
        this.parts[this.numParts] = "S";
        this.sizes[this.numParts] = 3;
        return this;
    }

    return struct;
}

function extend(s, n) {
    var st = String(s);
    while (st.length < n) {
        st = "0" + st;
    }
    return st;
}

function newPacket(msgID) {
    return _outMsgStructs[msgID].reset();
}

function readPacket() {
    var msgID = parseInt(_data.substring(0,3));
    return _inMsgStructs[msgID].fillFromData();
}

$(document).ready(function() {
    _outMsgStructs = new Array();
    _inMsgStructs = new Array();
   
});

function wsconnect(uri, onopen, onclose) {
    _ws = new WebSocket(uri);
    _ws.onmessage = function (event) {
        _data = _data + event.data;
    }
    window.onbeforeunload = function() {
        _ws.onclose = function () {}; // disable onclose handler first
        _ws.close();
    };
    _ws.onopen = function() {
        if (onopen != undefined) {
            onopen();
        }
    }
    _ws.onclose = function() {
        if (onclose != undefined) {
            onclose();
        }
    }
}

function canHandleMsg() {
    if (_data.length < 3) {
        return false;
    }
    var rawMsgID = _data.substring(0,3);
    var msgID = parseInt(rawMsgID);
    if (_inMsgStructs[msgID] === undefined) {
        alert("Invalid MsgID " + rawMsgID);
        return false;
    }
    return _inMsgStructs[msgID].canHandle(_data);
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
