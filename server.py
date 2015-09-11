import string, cgi, time
import json
from os import curdir, sep
from http.server import BaseHTTPRequestHandler, HTTPServer

files = ["/lib/jquery-1.11.3.js", "/script.js", "/index.html", "/style.css"]

class MyHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        try:
            if self.path == '/': # or self.path not in files:
                self.path = "/index.html"
            if self.path == '/host':
                self.path = "/host.html"
            f = open(curdir + sep + self.path)
            out = f.read()
            ext = self.path.split('.')
            ext = ext[len(ext)-1]
            if (ext != '.ico'):
                out = bytes(out, 'utf-8')
            self.gen_headers(ext)
            self.wfile.write(out)
            f.close()
            return
        except IOError:
            self.send_error(404, 'File Not Found: %s' % self.path)

    def gen_headers(self, ext):
        self.send_response(200)
        contentType = 'text/html'
        if (ext == "css"):
            contentType = 'text/css'
        elif (ext == "js"):
            contentType = 'application/javascript'
        self.send_header('Content-type', contentType)
        self.end_headers()

    def do_POST(self):
        pass

def main():
    try:
        server = HTTPServer(('', 8001), MyHandler)
        print("Starting webpage server...")
        server.serve_forever()
    except KeyboardInterrupt:
        print(' received, closing server.')
        server.socket.close()

if __name__ == '__main__':
    main()
