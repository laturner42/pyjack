import string, cgi, time
import socket
import base64
import hashlib
import select
import random
import tkinter
from time import sleep
from os import curdir, sep
from http.server import BaseHTTPRequestHandler, HTTPServer

class Player:

    def __init__(self, socket, pID):
        print("Created player")
        self.socket = socket
        self.pID = pID
        self.data = ""
        self.score = 0
        self.cards = []
        self.labelText = tkinter.StringVar()
        self.label = tkinter.Label(window, textvariable=self.labelText, font=("Helvetica", 32))
        self.label.pack()
        self.labelText.set("Player " + str(self.pID))

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
        myCards = "??  "
        for i in range(1, len(self.cards)):
            myCards += self.cards[i] + "  "
        self.labelText.set("Player " + str(self.pID) + " :  " + myCards)

    def writeMsgID(self, msgID):
        self.writeSize(msgID)

    def readMsgID(self):
        return self.readSize()

    def peekMsgID(self):
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
        if len(self.data) < 3:
            return
        if (self.canHandleMsg() == False):
            return
        msgID = self.readMsgID()
        if msgID == 0:
            startGame()
        elif msgID == 1:
            card = nextCard()
            self.addCard(card)
            self.writeMsgID(3)
            self.writeChars(card, 2)
            self.writeChars(self.score, 2)
        elif msgID == 2:
            self.score = int(self.readChars(2))
            self.label.config(fg='black')
            nextTurn()
        elif msgID == 3:
            self.score = 0
            self.label.config(fg='red')
            nextTurn()


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
        else:
            print("No message size for msgID", msgID)
        return 3

    def recv(self):
        data = bytearray(self.socket.recv(4096))
        if (len(data) == 0):
            print("Lost player.")
            sockets.remove(self.socket)
            players.remove(self)
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
    player = Player(s, pID)
    player.writeMsgID(1)
    player.writeChars(player.pID, 2)
    players.append(player)
    pID += 1
    return player

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
        window = tkinter.Tk()
        window.geometry("640x480")
        window.update()
        lbl = tkinter.Label(window, text="Blackjack", font=("Helvetica", 64))
        lbl.pack()
        while True:
            clientWaiting, _, _ = select.select([server], [], [], 0)
            if (len(clientWaiting) > 0):
                (clientsocket, address) = server.accept()
                print("Accepted new client!")
                p = handle(clientsocket)
            clientsReady, _, _ = select.select(sockets, [], [], 0)
            for client in clientsReady:
                for player in players:
                    if player.socket == client:
                        player.recv()
            for player in players:
                player.handle()
            if gameStarted:
                if (stage == 0):
                    for player in players:
                        player.writeMsgID(2)
                        card1 = nextCard()
                        card2 = nextCard()
                        player.addCard(card1)
                        player.addCard(card2)
                        player.writeChars(card1, 2)
                        player.writeChars(card2, 2)
                        player.writeChars(player.score, 2)
                    stage = 1
                    nextTurn()
            window.update()
            sleep(0.01)
    except KeyboardInterrupt:
        print(' received, closing server.')
        server.close()

def startGame():
    global gameStarted
    global stage
    global turn
    global cardNum
    if gameStarted:
        return
    if len(players) >= 1:
        gameStarted = True
        random.shuffle(cards)
        print("Starting game!")
        stage = 0
        turn = -1
        cardNum = 0
        for player in players:
            player.label.config(fg='black')
            player.cards = []
            player.score = 0

def nextTurn():
    global turn
    turn += 1
    if turn == len(players):
        win()
        return
    for player in players:
        if player.pID == turn:
            player.label.config(fg='blue')
            player.writeMsgID(4)
            break

def win():
    global gameStarted
    winners = []
    for player in players:
        if player.score < 2:
            continue
        if len(winners) == 0:
            winners.append(player)
        else:
            if player.score > winners[0].score:
                winners = [player]
            elif player.score == winners[0].score:
                winners.append(player)
    for player in players:
        player.writeMsgID(5)
        if player in winners:
            player.label.config(fg='green')
            player.writeChars(1, 1)
        else:
            player.writeChars(0, 1)
    gameStarted = False

def nextCard():
    global cardNum
    card = cards[cardNum]
    cardNum += 1
    return card

sockets = []
players = []
pID = 0

cards = [   "2H", "3H", "4H", "5H", "6H", "7H", "8H", "9H", "0H", "JH", "QH", "KH", "AH",
            "2D", "3D", "4D", "5D", "6D", "7D", "8D", "9D", "0D", "JD", "QD", "KD", "AD",
            "2S", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "0S", "JS", "QS", "KS", "AS",
            "2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "0C", "JC", "QC", "KC", "AC"]
cardNum = 0
turn = -1
gameStarted = False
stage = 0

if __name__ == '__main__':
    main()
