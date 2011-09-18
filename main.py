# -*- coding: utf-8 -*-

# GAEGengo, A proxy server for MyGengo API
# Intended for use by G-Gengo, A GMail Gadget for MyGengo
# Copyright 2011, Josh Chia
#
# Released under the Lesser GNU Public License, version 3
# http://www.gnu.org/licenses/lgpl.html

from google.appengine.api import urlfetch
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from urllib2 import Request, URLError, urlopen

import urllib
import simplejson as json


class MainHandler(webapp.RequestHandler):
    def options(self):
        self.response.headers['Access-Control-Allow-Origin'] = '*'
        self.response.headers['Access-Control-Max-Age'] = 3268800
        self.response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        self.response.headers['Content-Type'] = 'application/json'
    
    def get(self):
        url = self.request.get('query')
        response_type = 'json'
        
        result = urlfetch.fetch(url, headers={'Accept': 'application/' + response_type})        
        
        if result.status_code == 200:
            self.response.headers['Access-Control-Allow-Origin'] = '*'
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write(result.content)
            
    def delete(self):
        url = self.request.get('query')
        response_type = 'json'
        
        result = urlfetch.fetch(url, method=urlfetch.DELETE, headers={'Accept': 'application/' + response_type})        
        
        if result.status_code == 200:
            self.response.headers['Access-Control-Allow-Origin'] = '*'
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write(result.content)
    
    def post(self):
        url = self.request.get('query')
        payload = str(self.request.get('payload'))
        response_type = 'json'
        
        result = urlfetch.fetch(url, payload, urlfetch.POST, headers={'Accept': 'application/' + response_type})

        # result may return 200 or 201 as for comment posts
        if result.status_code == 200 or result.status_code == 201:
            self.response.headers['Access-Control-Allow-Origin'] = '*'
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write(result.content)

    def put(self):
        url = self.request.get('query')
        payload = str(self.request.get('payload'))
        response_type = 'json'
        
        result = urlfetch.fetch(url, payload, urlfetch.PUT, headers={'Accept': 'application/' + response_type})

        if result.status_code == 200:
            self.response.headers['Access-Control-Allow-Origin'] = '*'
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write(result.content)
            

def main():
    application = webapp.WSGIApplication(
        [
            ('/', MainHandler)
        ], 
        debug=False)
    util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
