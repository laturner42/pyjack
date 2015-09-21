import string, cgi, time
import socket
import base64
import hashlib
import select
import random

from wsserver import *

from time import sleep
from os import curdir, sep
from http.server import BaseHTTPRequestHandler, HTTPServer

class Client:

    def __init__(self, socket, pID):
        print("Created player")
        self.socket = socket
        self.pID = pID
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

    def handle(self):
        global pID
        global hosts
        if (self.socket.canHandleMsg() == False):
            return
        sock = self.socket
        packet = sock.readPacket()
        msgID = packet.msgID
        if msgID == 0:
            startGame(self.hostCode)
        elif msgID == 1:
            # Player hit
            card = nextCard(self.hostCode)
            self.addCard(card)
            sock.newPacket(3)
            sock.write(card)
            sock.write(self.score)
            sock.send()

            hsock = findHost(self.hostCode).socket
            hsock.newPacket(14)
            hsock.write(self.pID)
            hsock.write(card)
            hsock.send()
        elif msgID == 2:
            # Player stayed
            self.score = int(packet.read())
            nextTurn(self.hostCode)
        elif msgID == 3:
            # Player busted
            self.score = 0
            hsock = findHost(self.hostCode).socket
            hsock.newPacket(13)
            hsock.write(self.pID)
            hsock.send()
            nextTurn(self.hostCode)
        elif msgID == 5:
            self.name = packet.read()
        elif msgID == 10:
            code = packet.read()
            if code == "0000":
                self.becomeHost()
            else:
                host = findHost(code)
                if host and host.socket:
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
                    sock.newPacket(10)
                    sock.write(code)
                    sock.send()
    
    def confirm(self):
        hsock = findHost(self.hostCode).socket
        self.socket.newPacket(1)
        self.socket.write(self.pID)
        self.socket.send()
        hsock.newPacket(11)
        hsock.write(self.pID)
        hsock.write(self.name)
        hsock.send()
    
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
        self.socket.newPacket(10)
        self.socket.write(self.hostCode)
        self.socket.send()

    def disconnect(self):
        print("Lost client.")
        host = findHost(self.hostCode)
        if (host and host.socket):
            host.socket.newPacket(17)
            host.socket.write(self.pID)
            host.socket.send()
        sockets.remove(self.socket)
        clients.remove(self)
        self.playing = False
        self.socket = None
        if self.myTurn:
            nextTurn(self.hostCode)
        return

def generateHostCode():
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    code = ''.join(chars[int(random.random()*26)] for _ in range(4))
    for host in hosts:
        if host.hostCode == code:
            return generateHostCode()
    return code

def handle(socket):
    global pID, clients
    pID += 1
    client = Client(socket, pID)
    clients.append(client)


def main():
    global gameStarted
    global stage
    try:
        setupMessages()
        server = startServer()
        while True:
            newClient = handleNetwork()
            if newClient:
                print("New client!")
                handle(newClient)
            for player in clients:
                player.handle()
            for host in hosts:
                if host.gameStarted:
                    if (host.stage == 0):
                        for player in host.players:
                            if player.playing != True:
                                continue
                            # Give each player their card
                            player.socket.newPacket(2)
                            card1 = nextCard(host.hostCode)
                            card2 = nextCard(host.hostCode)
                            player.addCard(card1)
                            player.addCard(card2)
                            player.socket.write(card1)
                            player.socket.write(card2)
                            player.socket.write(player.score)
                            player.socket.send()

                            host.socket.newPacket(12)
                            host.socket.write(player.pID)
                            host.socket.write(card1)
                            host.socket.write(card2)
                            host.socket.send()
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
        p.socket.newPacket(4)
        p.socket.send()
        host.socket.newPacket(15)
        host.socket.write(p.pID)
        host.socket.send()
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
        player.socket.newPacket(5)
        if player in winners:
            player.socket.write(1)
            host.socket.newPacket(16)
            host.socket.write(player.pID)
            host.socket.send()
        else:
            player.socket.write(0)
        player.socket.send()
    host.gameStarted = False

def nextCard(hostNum):
    host = findHost(hostNum)
    card = host.cards[host.cardNum]
    host.cardNum += 1
    return card

def setupMessages():
    m0 = createMsgStruct(0, False)

    m1 = createMsgStruct(1, False)
    
    m2 = createMsgStruct(2, False)
    m2.addChars(2)

    m3 = createMsgStruct(3, False)

    m5 = createMsgStruct(5, False)
    m5.addString()

    m10 = createMsgStruct(10, False)
    m10.addChars(4)

    c1 = createMsgStruct(1, True)
    c1.addChars(2)

    c2 = createMsgStruct(2, True)
    c2.addChars(2)
    c2.addChars(2)
    c2.addChars(2)

    c3 = createMsgStruct(3, True)
    c3.addChars(2)
    c3.addChars(2)

    c4 = createMsgStruct(4, True)
    
    c5 = createMsgStruct(5, True)
    c5.addChars(1)

    c10 = createMsgStruct(10, True)
    c10.addChars(4)

    h1 = createMsgStruct(11, True)
    h1.addChars(2)
    h1.addString()

    h2 = createMsgStruct(12, True)
    h2.addChars(2)
    h2.addChars(2)
    h2.addChars(2)

    h3 = createMsgStruct(13, True)
    h3.addChars(2)

    h4 = createMsgStruct(14, True)
    h4.addChars(2)
    h4.addChars(2)

    h5 = createMsgStruct(15, True)
    h5.addChars(2)

    h6 = createMsgStruct(16, True)
    h6.addChars(2)

    h7 = createMsgStruct(17, True)
    h7.addChars(2)

    #h10 = createMsgStruct(10, True)
    #h10.addChars(4)


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
