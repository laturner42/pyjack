import string, cgi, time
import socket
import base64
import hashlib
import select
import random
from time import sleep
from os import curdir, sep
from http.server import BaseHTTPRequestHandler, HTTPServer

class Client:

    def __init__(self, socket, pID):
        print("Created player")
        self.socket = socket
        self.pID = pID
        self.data = ""
        self.score = 0
        self.cards = []
        self.hostCode = ""
        self.name = ""
        self.playing = False
        self.myTurn = False

    def addCard(self, card):
        self.cards.append(card)
        self.tallyScore()

    def tallyScore(self):
        total = 0
        for card in self.cards:
            val = card[0]
            if val == "0" or val == "J" or val == "Q" or val == "K":
                total += 10
            elif val == "A":
                total += 11
            elif val == "B":
                total += 1
            else:
                total += int(val)
        if total > 21:
            found = False
            for i in range(len(self.cards)): #card in self.cards:
                if self.cards[i][0] == "A":
                    found = True
                    self.cards[i] = "B" + self.cards[i][1]
                    break
            if found:
                self.tallyScore()
                return
        self.score = total

    def writeMsgID(self, msgID):
        self.writeSize(msgID)

    def readMsgID(self):
        return self.readSize()

    def peekMsgID(self):
        return int(self.data[0:3])

    def peekSize(self):
        return int(self.data[0:3])

    def writeSize(self, size):
        s = str(size)
        while (len(s) < 3):
            s = "0" + s
        self.send(s)

    def readSize(self):
        s = int(self.data[0:3])
        self.data = self.data[3:]
        return s

    def writeChars(self, chars, numChars):
        chars = str(chars)
        while (len(chars) < numChars):
            chars = "0" + chars
        self.send(chars)

    def readChars(self, numChars):
        c = self.data[0:numChars]
        self.data = self.data[numChars:]
        return c

    def writeString(self, string):
        l = len(string)
        self.writeSize(l)
        self.send(string)

    def readString(self):
        l = self.readSize()
        s = self.data[0:l]
        self.data = self.data[l:]
        return s

    def send(self, data):
        length = len(data)
        ret = bytearray([129, length])
        for byte in data.encode("utf-8"):
            ret.append(byte)
        self.socket.send(ret)

    def handle(self):
        global pID
        global hosts
        if len(self.data) < 3:
            return
        if (self.canHandleMsg() == False):
            return
        msgID = self.readMsgID()
        if msgID == 0:
            startGame(self.hostCode)
        elif msgID == 1:
            # Player hit
            card = nextCard(self.hostCode)
            self.addCard(card)
            self.writeMsgID(3)
            self.writeChars(card, 2)
            self.writeChars(self.score, 2)

            h = findHost(self.hostCode)
            h.writeMsgID(4)
            h.writeChars(self.pID, 2)
            h.writeChars(card, 2)
        elif msgID == 2:
            # Player stayed
            self.score = int(self.readChars(2))
            nextTurn(self.hostCode)
        elif msgID == 3:
            # Player busted
            self.score = 0
            nextTurn(self.hostCode)
            h = findHost(self.hostCode)
            h.writeMsgID(3)
            h.writeChars(self.pID, 2)
        elif msgID == 5:
            self.name = self.readString()
        elif msgID == 10:
            code = self.readChars(4)
            if code == "0000":
                self.becomeHost()
            else:
                host = findHost(code)
                if host:
                    for player in host.players:
                        if player.socket == None:
                            if player.name.upper() == self.name.upper():
                                print("Player has reconnected.")
                                player.socket = self.socket
                                clients.append(player)
                                clients.remove(self)
                                self.socket = None
                                player.confirm()
                                return

                    host.players.append(self)
                    self.hostCode = host.hostCode
                    pID += 1
                    self.pID = pID
                    print("Player has joined host", self.hostCode)
                    self.confirm()
                else:
                    self.writeMsgID(10)
                    self.writeMsgID(code)
    
    def confirm(self):
        host = findHost(self.hostCode)
        self.writeMsgID(1)
        self.writeChars(self.pID, 2)
        host.writeMsgID(1)
        host.writeChars(self.pID, 2)
        host.writeString(self.name)
    
    def becomeHost(self):
        global hosts
        global cards
        self.hostCode = generateHostCode()
        self.players = []
        self.cards = cards[:]
        self.turn = -1
        self.cardNum = 0
        self.stage = 0
        hosts.append(self)
        self.gameStarted = False
        print("New host with host code", self.hostCode)
        self.writeMsgID(10)
        self.writeChars(self.hostCode, 4)

    def canHandleMsg(self):
        msgID = self.peekMsgID()
        l = self.getMsgSize(msgID)
        if (len(self.data) >= l):
            return True
        return False

    def getMsgSize(self, msgID):
        if (msgID == 0):
            return 3
        elif (msgID == 1):
            return 3
        elif (msgID == 2):
            return 5
        elif (msgID == 3):
            return 3
        elif (msgID == 5):
            s = int(self.data[3:6])
            return 3 + 3 + s
        elif (msgID == 10):
            return 3 + 4
        else:
            print("No message size for msgID", msgID)
        return 3

    def recv(self):
        data = bytearray(self.socket.recv(4096))
        if (len(data) == 0):
            print("Lost client.")
            host = findHost(self.hostCode)
            host.writeMsgID(7)
            host.writeChars(self.pID, 2)
            sockets.remove(self.socket)
            clients.remove(self)
            self.playing = False
            self.socket = None
            if self.myTurn:
                nextTurn(self.hostCode)
            return
        self.parseData(data)
        
    def parseData(self, data):
        global sockets
        if (len(data) < 1):
            return
        strData = ''
        datalen = (0x7f & data[1])
        if (datalen > 0):
            mask_key = data[2:6]
            masked_data = data[6:(6+datalen)]
            unmasked_data = [masked_data[i] ^ mask_key[i%4] for i in range(len(masked_data))]
            strData = bytearray(unmasked_data).decode('utf-8')
        self.data = self.data + strData
        self.parseData(data[6+datalen:])

def generateHostCode():
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    code = ''.join(chars[int(random.random()*26)] for _ in range(4))
    for host in hosts:
        if host.hostCode == code:
            return generateHostCode()
    return code

def handle(s):
    global pID
    global sockets
    global players
    #s.setblocking(0)
    rec = s.recv(4096).decode("utf-8").split('\n')
    headers = {}
    for header in rec:
        if (": " in header):
            app = header.split(": ")
            headers[app[0]] = app[1]
    
    guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

    accept = ""
    if "Sec-WebSocket-Key" in headers:
        key = headers['Sec-WebSocket-Key'].rstrip()
        key = bytes(key + guid, 'UTF-8')
        key = hashlib.sha1(key).digest()
        accept = base64.b64encode(key)
        accept = accept.decode('UTF-8')

    s.send(bytes(("" +
    "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" +
    "Upgrade: WebSocket\r\n" +
    "Connection: Upgrade\r\n" +
    "WebSocket-Origin: http://localhost:8888\r\n" +
    "WebSocket-Location: ws://localhost:9876/\r\n" +
    "WebSocket-Protocol: sample\r\n" +
    "Sec-WebSocket-Accept: " + str(accept) +
    "").strip() + '\r\n\r\n', 'UTF-8'))

    sockets.append(s)
    client = Client(s, pID)
    clients.append(client)
    return client

def main():
    global gameStarted
    global stage
    global window
    try:
        server = socket.socket()
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('', 8886))
        server.listen(5)
        #server.setblocking(0)
        print("Listening...")
        while True:
            clientWaiting, _, _ = select.select([server], [], [], 0)
            if (len(clientWaiting) > 0):
                (clientsocket, address) = server.accept()
                print("Accepted new client!")
                handle(clientsocket)
            clientsReady, _, _ = select.select(sockets, [], [], 0)
            for client in clientsReady:
                for c in clients:
                    if c.socket == client:
                        c.recv()
            for client in clients:
                client.handle()
            for host in hosts:
                if host.gameStarted:
                    if (host.stage == 0):
                        for player in host.players:
                            if player.playing != True:
                                continue
                            # Give each player their card
                            player.writeMsgID(2)
                            card1 = nextCard(host.hostCode)
                            card2 = nextCard(host.hostCode)
                            player.addCard(card1)
                            player.addCard(card2)
                            player.writeChars(card1, 2)
                            player.writeChars(card2, 2)
                            player.writeChars(player.score, 2)

                            host.writeMsgID(2)
                            host.writeChars(player.pID, 2)
                            host.writeChars(card1, 2)
                            host.writeChars(card2, 2)
                        host.stage = 1
                        nextTurn(host.hostCode)
            sleep(0.01)
    except KeyboardInterrupt:
        print(' received, closing server.')
        server.close()

def startGame(hostCode):
    host = findHost(hostCode)
    if host.gameStarted:
        return
    if len(host.players) >= 1:
        host.players.append(host.players.pop(0))
        host.gameStarted = True
        random.shuffle(host.cards)
        print("Starting game!")
        host.stage = 0
        host.turn = -1
        host.cardNum = 0
        for player in host.players:
            if player.socket:
                player.playing = True
            player.cards = []
            player.score = 0

def nextTurn(hostCode):
    host = findHost(hostCode)
    host.turn += 1
    for p in host.players:
        p.myTurn = False
    if host.turn == len(host.players):
        win(hostCode)
        return
    p = host.players[host.turn]
    if p.playing:
        p.myTurn = True
        p.writeMsgID(4)
        host.writeMsgID(5)
        host.writeChars(p.pID, 2)
    else:
        nextTurn(hostCode)

def findHost(hostCode):
    for h in hosts:
        if h.hostCode == hostCode:
            return h
    return False

def win(hostCode):
    host = findHost(hostCode)
    winners = []
    for player in host.players:
        if player.score < 2:
            continue
        if len(winners) == 0:
            winners.append(player)
        else:
            if player.score > winners[0].score:
                winners = [player]
            elif player.score == winners[0].score:
                winners.append(player)
    for player in host.players:
        if player.playing != True:
            continue
        player.writeMsgID(5)
        if player in winners:
            player.writeChars(1, 1)
            host.writeMsgID(6)
            host.writeChars(player.pID, 2)
        else:
            player.writeChars(0, 1)
    host.gameStarted = False

def nextCard(hostNum):
    host = findHost(hostNum)
    card = host.cards[host.cardNum]
    host.cardNum += 1
    return card

sockets = []
clients = []
hosts = []
pID = 0

cards = [   "2H", "3H", "4H", "5H", "6H", "7H", "8H", "9H", "0H", "JH", "QH", "KH", "AH",
            "2D", "3D", "4D", "5D", "6D", "7D", "8D", "9D", "0D", "JD", "QD", "KD", "AD",
            "2S", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "0S", "JS", "QS", "KS", "AS",
            "2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "0C", "JC", "QC", "KC", "AC"]

if __name__ == '__main__':
    main()
