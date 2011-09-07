/*
myGengo API javascript
APIQuery object and associated scripts
Copyright 2011, Josh Chia

Released under the Lesser GNU Public License, version 3
http://www.gnu.org/licenses/lgpl.html
*/

/*
Contents: APIQuery, json_sort, url_encode, ascii_encode, sign

Dependencies: 
    sprintf() for JavaScript 0.7-beta1 (http://www.diveintojavascript.com/projects/javascript-sprintf)
    crypto-js (http://code.google.com/p/crypto-js/)
    mygengo call:url dictionary
*/

var APIQuery = function(call, params, data, url_params) {
/*  call:            string;     query url to mygengo api
    params:          json;       specific params needed to authenticate query and generate url
    data:            json;       data sent as part of api request (post, put)
    url_params:      json;       url specific parameters */
    
    query_params = (params === undefined) ? {} : params;
    query_params.api_key = settings.api_key;
    query_params.ts = parseInt((new Date).getTime() / 1000).toString();
    
    // fix for IE (lame XDomainRequest crap)
    if ($.browser.msie && window.XDomainRequest) {
        switch (call) {
            case mygengo.translate_job_id_delete:
                query_params._method = 'delete'
                break;
                
            case mygengo.translate_job_id_put:
                query_params._method = 'put'
                break;
                
            default:
                break;
        };
    };
    
    // stringify used as equality operator
    if ((!(data === undefined)) && (JSON.stringify(data) != '{}')) {
        query_params.data = ascii_encode(JSON.stringify(data));
    };
    
    // determining api sig method
    switch (call) {
        // for those with data sent i.e. POST PUT
        case mygengo.translate_job_post:
        case mygengo.translate_jobs_post:
        case mygengo.translate_job_id_comment_post:
        case mygengo.translate_service_quote_post:
        case mygengo.translate_job_id_put:
            query_params.api_sig = sign(JSON.stringify(json_sort(query_params)), settings.private_key);
            break;
        
        // for those with no data sent (only url query params) i.e. GET DELETE
        default:
            query_params.api_sig = sign(url_encode(json_sort(query_params)), settings.private_key);
            break;
    };
    
    // returning APIQuery json
    switch (call) {
        case mygengo.account_balance_get:
        case mygengo.account_stats_get:
        case mygengo.translate_service_languages_get: 
        case mygengo.translate_job_language_pairs_get:
        case mygengo.translate_jobs_get:
            return {'call': call, 'method': 'GET', 'url': encodeURIComponent(call + url_encode(query_params))};
            break;
        
        case mygengo.translate_job_id_get:
            return {'call': call, 'method': 'GET', 'url': encodeURIComponent(sprintf(call, query_params.job_id, url_encode(query_params)))};
            break;
            
        case mygengo.translate_job_id_delete:
            // substring called to remove prefix used to distinguish url path between delete and get job id
            // fix for IE (lame XDomainRequest crap)
            if ($.browser.msie && window.XDomainRequest) {
                return {'call': call, 'method': 'POST', 'url': encodeURIComponent(sprintf(call.substring(2), url_params.job_id, url_encode(query_params))), 'data': url_encode(query_params)};
            }
            else {
                return {'call': call, 'method': 'DELETE', 'url': encodeURIComponent(sprintf(call.substring(2), url_params.job_id, url_encode(query_params)))};
            };
            break;
            
        case mygengo.translate_job_id_put:
            // fix for IE (lame XDomainRequest crap)
            if ($.browser.msie && window.XDomainRequest) {
                return {'call': call, 'method': 'POST', 'url': encodeURIComponent(sprintf(call, url_params.job_id)), 'data': url_encode(query_params)};
            }
            else {
                // couldn't get PUT method to work, seems the data wasn't being sent as API response is api_key missing (yet dev console shows it was sent)
                // a quick change to POST method fixes this so problem is with PUT/data
                return {'call': call, 'method': 'POST', 'url': encodeURIComponent(sprintf(call, url_params.job_id)), 'data': url_encode(query_params)};
            };
            break;
        
        case mygengo.translate_job_post:
        case mygengo.translate_jobs_post:
        case mygengo.translate_service_quote_post:
            return {'call': call, 'method': 'POST', 'url': call, 'data': url_encode(query_params)};
            break;
            
        case mygengo.translate_job_id_comment_post:
            return {'call': call, 'method': 'POST', 'url': encodeURIComponent(sprintf(call, url_params.job_id)), 'data': url_encode(query_params)};
            break;
        
        case mygengo.translate_job_id_comments_get:
        case mygengo.translate_job_id_feedback_get:
        case mygengo.translate_job_id_preview_get:
        case mygengo.translate_job_id_revisions_get:
        case mygengo.translate_jobs_id_get:
            return {'call': call, 'method': 'GET', 'url': encodeURIComponent(sprintf(call, url_params.job_id, url_encode(query_params)))};
            break;
        
        case mygengo.translate_job_id_revision_rev_id_get:
            return {'call': call, 'method': 'GET', 'url': encodeURIComponent(sprintf(call, url_params.job_id, url_params.rev_id, url_encode(query_params)))};
            break;
        
        default:
            return {'call': call, 'method': 'ERROR', 'data': 'API query not supported'};
            break;
    };
};
    
function json_sort(obj) {
    var keys = [];
    var sorted_obj = {};

    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            keys.push(key);
        }
    };
    keys.sort();
    
    for (i = 0; i < keys.length; i++) {
        sorted_obj[keys[i]] = obj[keys[i]];
    };
    return sorted_obj;
};

function url_encode(dict) {
    var url = [];

    for (var d in dict) {
        if (dict.hasOwnProperty(d)) {
            url.push(d + '=' + 
                encodeURIComponent(dict[d]).replace(/[!*'()~]/g, function(r) {
                    return '%' + r.charCodeAt(0).toString(16).toUpperCase();
                })
            );
        };
    };
    return url.join("&");
};

function ascii_encode(str) {
    var escaped = '';
    
    for (var i = 0; i < str.length; ++i) {
        var hex = str.charCodeAt(i);
        if (hex < 128) {
            escaped += str[i];
        }
        else {
            hex = hex.toString(16);
            escaped += '\\u' + '0000'.substr(hex.length) + hex;
        };
    };
    return escaped;
};

function sign(query_params, private_key) {
    return Crypto.util.bytesToHex(Crypto.HMAC(Crypto.SHA1, query_params, private_key, {asBytes: true}));
};