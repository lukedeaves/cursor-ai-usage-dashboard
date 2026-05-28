#!/usr/bin/env python3
"""Launch the Cursor Usage Dashboard in a native window (optional pywebview) or browser."""

import http.server
import socketserver
import threading
import webbrowser
import os
import sys

PORT = 8765
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def start_server():
    os.chdir(ROOT)
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(('', PORT), handler) as httpd:
        httpd.serve_forever()


def main():
    threading.Thread(target=start_server, daemon=True).start()
    url = f'http://127.0.0.1:{PORT}/index.html'

    try:
        import webview
        webview.create_window('Cursor AI Usage Dashboard', url, width=1280, height=860)
        webview.start()
    except ImportError:
        print(f'pywebview not installed — opening in browser: {url}')
        print('Install optional desktop shell: pip install pywebview')
        webbrowser.open(url)
        try:
            while True:
                threading.Event().wait(3600)
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
