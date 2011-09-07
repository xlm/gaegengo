/*
GadgetGengo javascript
Gadget functionality scripts
Copyright 2011, Josh Chia

Released under the Lesser GNU Public License, version 3
http://www.gnu.org/licenses/lgpl.html
*/

$.ajaxSetup({
    error: function(xhr) {
        alert('G-Gengo has encountered an error: Please check your connection or API access\n' + xhr.status + ' ' + xhr.statusText);
    }
});

var AJAXRequest = function(api_obj, callback) {    
// To implement: delete and put request using switch
    var url = settings.run_mode + api_obj.url;

    callback = (callback === undefined) ? ajax_callback : callback;
    url = (settings.host === undefined) ? url : settings.host + '?query=' + url;
    
    switch(api_obj.call) {
        // catch unsupported API query
        case 'Error':
            alert('G-Gengo has encountered an error: ' + api_obj.data);
            break;
    
        default:
            if (!(api_obj.data === undefined)) {
                var payload = 'payload=' + encodeURIComponent(api_obj.data);
                
                $.post(url, payload, function(data) {
                    if (data.opstat == 'error') {
                        alert('Received error!\n' + JSON.stringify(data));
                    }
                    else {
                        callback(data, api_obj.call);
                    };
                });
            }
            else {
                $.get(url, payload, function(data) {
                    if (data.opstat == 'error') {
                        alert('Received error!\n' + JSON.stringify(data));
                    }
                    else {
                        callback(data, api_obj.call);
                    };
                });
            };
            break;
    };
};

function ajax_callback(data, call) {
    switch(call) {
        case mygengo.account_balance_get:
            gadgetgengo.balance = data.response.credits;
            gui_handler('update_balance');
            break;
        
        case mygengo.translate_job_language_pairs_get:
            gadgetgengo.lang_pairs = data.response;
            gui_handler('update_lc_src');
            gui_handler('update_lc_tgt');
            gui_handler('update_tier');
            gui_handler('update_quote');
            break;
        
        case mygengo.translate_service_quote_post:
            gui_handler('update_purchase', data.response.jobs.job1.credits);
            break;
        
        case mygengo.translate_jobs_get:
            for (i in data.response) {
                AJAXRequest(APIQuery(mygengo.translate_job_id_get, {'job_id': data.response[i].job_id, 'pre_mt': 1}));
            };
            break;
            
        case mygengo.translate_job_id_get:
            gadgetgengo.current_jobs[data.response.job.job_id] = data.response.job;
            gui_handler('append_job_list', data.response.job.job_id);
            break;
        
        case mygengo.translate_job_id_comments_get:
            gui_handler('view_comments', data.response.thread)
            break;
            
        case mygengo.translate_job_post:
            switch($('#new_comment').val()) {
                case '':
                case $('#new_comment').get(0).defaultValue:
                    break;
                    
                default:
                    AJAXRequest(APIQuery(mygengo.translate_job_id_comment_post, {}, {'body': $('#new_comment').val()}, {'job_id': data.response.job.job_id}));
                    break;
            };
            AJAXRequest(APIQuery(mygengo.account_balance_get));
            
            if (data.response.job.job_id in gadgetgengo.current_jobs) {
                gadgetgengo.current_jobs[data.response.job.job_id] = data.response.job;
                alert('Updated existing job');
            }
            else {
                gadgetgengo.current_jobs[data.response.job.job_id] = data.response.job;
                gui_handler('insert_job_list', data.response.job.job_id);
            };
            
            gui_handler('reset_job_form');
            gui_handler('update_quote');
            gui_handler('show_job_details', data.response.job.job_id);
            gui_handler('show_only', '#output_field');
            break;
            
        case mygengo.translate_job_id_comment_post:
            gui_handler('post_comment');
            break;
    };
};

function gui_callback(call, data) {
    // called by HTML GUI i.e. onclick, onblur, onfocus etc.
    switch(call) {
        case 'show_options_form':
            gui_handler('show_only', '#options_form');
            break;
            
        case 'show_job_form':
            gui_handler('show_only', '#job_form');
            break;
        
        case 'save_options':
            var changed = false;
            if ($('#options_api_key').val() != settings.api_key) {
                prefs.set('api_key', $('#options_api_key').val()); //google gadget API
                settings.api_key = $('#options_api_key').val();
                changed = true;
            };
            
            if ($('#options_private_key').val() != settings.private_key) {
                prefs.set('private_key', $('#options_private_key').val()); //google gadget API
                settings.private_key = $('#options_private_key').val();
                changed = true;
            };
            
            if (changed) {
                gadgetgengo = {
                    'balance': '',
                    'lang_pairs': [],
                    'current_jobs': {}
                };
                gui_handler('save_options');
                gui_handler('init');
                AJAXRequest(APIQuery(mygengo.account_balance_get));
                AJAXRequest(APIQuery(mygengo.translate_job_language_pairs_get));
                AJAXRequest(APIQuery(mygengo.translate_jobs_get));
            }
            else {
                gui_handler('show_only', '#output_field');
            };
            break;
            
        case 'update_lc_tgt':
            gui_handler('update_lc_tgt');
            break;
        
        case 'update_tier':
            gui_handler('update_tier');
            break;
            
        case 'update_quote':
            gui_handler('update_quote');
            break;
            
        case 'default_remove':
            if ($(data).val() == data.defaultValue) {
                $(data).val('');
            };
            break;
        
        case 'default_add':
            if ($(data).val() == '') {
                $(data).val(data.defaultValue);
            };
            break;
            
        case 'purchase_job':
            if (confirm('Please confirm purchase')) {
                $('#new_purchase').attr('disabled', 'disabled');
                AJAXRequest(APIQuery(mygengo.translate_job_post, {'_method': 'post'}, {'job': get_job_form()}));
            };
            break;
            
        case 'view_comments':
            $('#job_details_view_comments').attr('disabled', 'disabled');
            AJAXRequest(APIQuery(mygengo.translate_job_id_comments_get, {}, {}, {'job_id': data}));
            break;
        
        case 'post_comment':
            switch($('#job_details_enter_comment').val()) {
                case '':
                case $('#job_details_enter_comment').get(0).defaultValue:
                    alert('Please enter a comment');
                    break;
                
                default:
                    $('#job_details_post_comment').attr('disabled', 'disabled');
                    AJAXRequest(APIQuery(mygengo.translate_job_id_comment_post, {}, {'body': $('#job_details_enter_comment').val()}, {'job_id': data}));
                    break;
            };
            break;
            
        case 'show_job':
            gui_handler('show_job_details', data);
            gui_handler('show_only', '#output_field');
            break;
            
        case 'update_jobs':
            //check if any differences with latest job id list and current_jobs list
            //callback function is a bit hacked up re gui_callback vs gui_handler, possible redesign
            AJAXRequest(APIQuery(mygengo.translate_jobs_get), function(data) {
                for (i in data.response) {
                    if (!(data.response[i].job_id in gadgetgengo.current_jobs)) {
                        gadgetgengo.current_jobs[data.response[i].job_id] = '';
                    };
                };
                
                var last = 0;
                for (i in gadgetgengo.current_jobs) {
                    last = i;
                };
                
                for (i in gadgetgengo.current_jobs) {
                    if (gadgetgengo.current_jobs[i] == '') {
                        AJAXRequest(APIQuery(mygengo.translate_job_id_get, {'job_id': i, 'pre_mt': 1}), function(data) {
                            // new get jobs need insertAfter joblist and their data added to current_jobs
                            gadgetgengo.current_jobs[data.response.job.job_id] = data.response.job;
                            gui_handler('insert_job_list', data.response.job.job_id);
                            
                            if (data.response.job.job_id == last) {
                                $('#output_field').html('<p>Update complete!</p>');
                            };
                        });
                    }
                    else {
                        AJAXRequest(APIQuery(mygengo.translate_job_post, {'_method': 'post'}, {'job': job_parser(gadgetgengo.current_jobs[i])}), function(data) {
                            // existing jobs need text_button updates and their data added to current_jobs
                            gadgetgengo.current_jobs[data.response.job.job_id] = data.response.job;
                            gui_handler('update_job_button', data.response.job.job_id);
                            
                            if (data.response.job.job_id == last) {
                                $('#output_field').html('<p>Update complete!</p>');
                            };
                        });
                    };
                };
            });
            $('#output_field').html('<p>Updating jobs... please wait</p>');
            $('#update_btn').removeAttr('disabled');
            break;
    };
};

function gui_handler(call, data) {
    switch(call) {
        case 'save_options':
            $("body").html(html_parser('base_html'));
            break;
        
        case 'init':
            $('#job_form').html(html_parser('job_form'));
            $('#options_form').html(html_parser('options_form'));
            //$('#options_api_key').attr('value', settings.api_key);
            //$('#options_private_key').attr('value', settings.private_key);
            
            $('#update_btn').click(function() {
                $('#update_btn').attr('disabled', 'disabled');
                gui_callback('update_jobs');
            });
            
            $('#options_btn').click(function() {
                gui_callback('show_options_form');
            });
            
            $('#add_job').click(function() {
                gui_callback('show_job_form');
            });
            
            $('#options_api_key').focus(function() {
                gui_callback('default_remove', this);
            });
            
            $('#options_api_key').blur(function() {
                gui_callback('default_add', this);
            });
            
            $('#options_private_key').focus(function() {
                gui_callback('default_remove', this);
            });
            
            $('#options_private_key').blur(function() {
                gui_callback('default_add', this);
            });
            
            $('#save_options').click(function() {
                gui_callback('save_options');
            });
            
            $('#new_slug').focus(function() {
                gui_callback('default_remove', this);
            });
            
            $('#new_slug').blur(function() {
                gui_callback('default_add', this);
            });
            
            $('#new_body_src').focus(function() {
                gui_callback('default_remove', this);
            });
            
            $('#new_body_src').blur(function() {
                gui_callback('default_add', this);
            });
            
            $('#new_comment').focus(function() {
                gui_callback('default_remove', this);
            });
            
            $('#new_body_src').change(function() {
                if ($('#new_tier').val() != 'machine' && $('#new_body_src').val() != '') {
                    gui_callback('update_quote');
                };
            });
            
            $('#new_lc_src').change(function() {
                gui_callback('update_lc_tgt');
                gui_callback('update_tier');
                gui_callback('update_quote');
            });
            
            $('#new_lc_tgt').change(function() {
                gui_callback('update_tier');
                gui_callback('update_quote');
            });
            
            $('#new_tier').change(function() {
                gui_callback('update_quote');
            });
            
            $('#new_purchase').click(function() {
                gui_callback('purchase_job');
            });
            break;
        
        case 'reset_job_form':
            $('#new_slug').val('Job title');
            $('#new_body_src').val('Text to translate');
            $('#new_comment').val('Comment for translator');
            $('new_purchase').removeAttr('disabled');
            break;
        
        case 'show_only':
            $('#output_field').hide();
            $('#job_form').hide();
            $('#options_form').hide();
            $(data).show();
            break;
        
        case 'update_balance':
            gadgets.window.setTitle('G-Gengo: $' + gadgetgengo.balance); // google gadget API
            break;
        
        case 'update_lc_src':
            $('#new_lc_src').html(html_parser('new_lc_src'));
            break;
        
        case 'update_lc_tgt':
            $('#new_lc_tgt').attr('disabled', 'disabled');
            $('#new_lc_tgt').html(html_parser('new_lc_tgt'));
            $('#new_lc_tgt').removeAttr('disabled');
            break;
        
        case 'update_tier':
            $('#new_tier').attr('disabled', 'disabled');
            $('#new_tier').html(html_parser('new_tier'));
            $('#new_tier').removeAttr('disabled');
            break;
            
        case 'update_quote':
            if ($('#new_tier').val() != 'machine') {
                $('#new_purchase').attr('disabled', 'disabled');
                AJAXRequest(APIQuery(mygengo.account_balance_get));
                AJAXRequest(APIQuery(mygengo.translate_service_quote_post, {'_method': 'post'}, {'jobs': {'job1': get_job_form()}, 'as_group': 0}));
            }
            else {
                $('#new_purchase').html('Purchase: Free');
                $('#new_purchase').removeAttr('disabled');
            };
            break;
        
        case 'update_purchase':
            $('#new_purchase').html('Purchase: $' + data.toFixed(2));
            if (gadgetgengo.balance >= data) {
                $('#new_purchase').removeAttr('disabled');
            };
            break;
            
        case 'append_job_list':
            $('#job_list').append(html_parser('text_button', gadgetgengo.current_jobs[data]));
            $('#' + data).attr('title', gadgetgengo.current_jobs[data].slug);
            
            $('#' + data).click(function() {
                gui_callback('show_job', data);
            });
            break;
            
        case 'insert_job_list':
            $(html_parser('text_button', gadgetgengo.current_jobs[data])).insertAfter('#add_job');
            $('#' + data).attr('title', gadgetgengo.current_jobs[data].slug);
            
            $('#' + data).click(function() {
                gui_callback('show_job', data);
            });
            break;
        
        case 'update_job_button':
            $('#' + data).html(html_parser('text_button_html', gadgetgengo.current_jobs[data]));
            break;
        
        case 'view_comments':
            $('#comment_thread').html(html_parser('view_comments', data));
            $('#job_details_view_comments').removeAttr('disabled');
            break;
        
        case 'post_comment':
            $('#job_details_enter_comment').val('Post comments here');
            $('#job_details_post_comment').removeAttr('disabled');
            $('#comment_thread').html('');
            break;
        
        case 'show_job_details':
            $('#output_field').html(html_parser('job_details', gadgetgengo.current_jobs[data]));
            $('#job_details_enter_comment').focus(function() {
                gui_callback('default_remove', this);
            });
            $('#job_details_view_comments').click(function() {
                gui_callback('view_comments', data);
            });
            $('#job_details_post_comment').click(function() {
                gui_callback('post_comment', data);
            });
            break;
    };
};

function html_parser(call, data) {
    var html_result = '';
    switch(call) {
        // assign at risk HTML attributes via JQUERY as precaution, must be at a level higher - html_parser only return text
        case 'base_html':
            html_result = 
                "<p class='bold'><button type='button' id='update_btn'>Update</button><button type='button' id='options_btn'>Options</button></p>" +
                "<div class='container' id='job_list'>" +
                    "<p class='text_button' id='add_job'>Add Job</p>" +
                "</div>" +
                "<div class='container' id='output_field'>" +
                    "<p>Job details displayed here</p>" +
                "</div>" +
                "<div class='container' id='job_form'>" +
                "</div>" +
                "<div class='container' id='options_form'>" +
                "</div>";
            break;
        
        case 'options_form':
            html_result = 
                '<p>Public key:</br>' +
                '<input type="text" id="options_api_key" value="' + settings.api_key + '"/></p></br>' +
                '<p>Private key:</br>' +
                '<input type="text" id="options_private_key" value="' + settings.private_key + '"/></br>' +
                '<button id="save_options">Save</button></p>';
            break;
    
        case 'text_button':
            html_result = 
                '<p class="text_button" id="' + data.job_id +'" title="">' +
                    (data.slug.length > 21 ? data.slug.substring(0, 21) + '...' : data.slug) + '</br>' +
                    capitalise_first(data.status) + ' #' + data.job_id +
                '</p>';
            break;
            
        case 'text_button_html':
            html_result = 
                (data.slug.length > 21 ? data.slug.substring(0, 21) + '...' : data.slug) + '</br>' +
                capitalise_first(data.status) + ' #' + data.job_id;
            break;
            
        case 'job_form':
            html_result = 
                '<input type="text" id="new_slug" value="Job title"/></br>' +
                '<textarea id="new_body_src">Text to translate</textarea>' +
                '<textarea id="new_comment">Comment for translator</textarea>' +
                '<select id="new_lc_src"></select> to' +
                '<select id="new_lc_tgt"></select></br>' +
                'Tier: <select id="new_tier"></select></br>' +
                '<button id="new_purchase">Purchase:</button>';
            break;
        
        case 'new_lc_src':
            var lc_src = {};
            
            for (i in gadgetgengo.lang_pairs) {
                if (!(gadgetgengo.lang_pairs[i].lc_src in lc_src)) {
                    lc_src[gadgetgengo.lang_pairs[i].lc_src] = gadgetgengo.lang_pairs[i].lc_src;
                };
            };
            for (i in lc_src) {
                html_result += '<option value="' + lc_src[i] + '">' + lc_src[i] + '</option>';
            };
            break;
            
        case 'new_lc_tgt':
            var lc_tgt = {};
            
            for (i in gadgetgengo.lang_pairs) {
                if (gadgetgengo.lang_pairs[i].lc_src == $('#new_lc_src').val()) {
                    lc_tgt[gadgetgengo.lang_pairs[i].lc_tgt] = gadgetgengo.lang_pairs[i].lc_tgt;
                };
            };
            for (i in json_sort(lc_tgt)) {
                html_result += '<option value="' + i + '">' + i + '</option>';
            };
            break;
        
        case 'new_tier':
            var tier = {};
            
            for (i in gadgetgengo.lang_pairs) {
                if (gadgetgengo.lang_pairs[i].lc_src == $('#new_lc_src').val() &&
                    gadgetgengo.lang_pairs[i].lc_tgt == $('#new_lc_tgt').val()) {
                        tier[gadgetgengo.lang_pairs[i].tier] = gadgetgengo.lang_pairs[i].tier;
                };
            };
            
            for (i in json_sort(tier)) {
                html_result += '<option value="' + i + '">' + i + '</option>';
            };
            break;
        
        case 'job_details':
            html_result =
                '<p class="bold">#' + data.job_id + ' (' + data.lc_src + ')</p>' +
                '<p>' + data.body_src + '</p></br>' +
                '<p class="bold">' + capitalise_first(data.tier) + ' (' + data.lc_tgt + ')</p>' + 
                (data.status == 'available' || data.status == 'pending' ? '<p class="italic">(Preview by machine)</p>': '') +
                '<p>' + data.body_tgt + '</p></br>' +
                '<textarea id="job_details_enter_comment">Post comments here</textarea>' +
                '<button type="button" id="job_details_view_comments">Comments</button>' +
                '<button type="button" id="job_details_post_comment">Post</button>' +
                '<p id="comment_thread"></p>';
            break;
            
        case 'view_comments':
            var html_result = 'No comments';
            
            if (data.length != 0) {
                html_result = '';
                for (i=0; i<data.length; i++) {
                    html_result += 
                        data[i].body + '</br>' +
                        '<i>' + data[i].author + ', ' + date_parse(data[i].ctime) + '</i></br></br>';
                };
            }
            break;
    };
    return html_result;
};

function get_job_form() {
    return {
        'slug':     $('#new_slug').val(),
        'body_src': $('#new_body_src').val(),
        'lc_src':   $('#new_lc_src').val(),
        'lc_tgt':   $('#new_lc_tgt').val(),
        'tier':     $('#new_tier').val()
        //comments can't be added via post job call
    };
};

function job_parser(data) {
    return {
        'slug':     data.slug,
        'body_src': data.body_src,
        'lc_src':   data.lc_src,
        'lc_tgt':   data.lc_tgt,
        'tier':     (data.tier == 'ultra_pro') ? 'ultra' : data.tier //MyGengo API bug: difference in naming of 'ultra' tier between POST and GET methods
    };
};

function capitalise_first(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

function date_parse(ctime) {
    var d = new Date(ctime * 1000);
    return d.getDate() + '/' + d.getMonth() + '/' + d.getFullYear();
};