/*
GadgetGengo javascript
Gadget functionality scripts
Copyright 2011, Josh Chia

Released under the Lesser GNU Public License, version 3
http://www.gnu.org/licenses/lgpl.html
*/

// simple fix for IE XDomainRequest (lame ms)
(function($) {
    $._get = $.get;
    $._post = $.post;
    
    $.get = function(url, data, callback) {
        if (jQuery.browser.msie && window.XDomainRequest) {
            var xdr = new XDomainRequest();
            xdr.timeout = 30000; //because IE sucks
            xdr.ontimeout = function() { 
                alert('G-Gengo has encountered an error:\n' +
                    'Please check your connection or API access\n'
                );
                $('#update_btn').removeAttr('disabled');
                xdr.send(data)
            };
            xdr.onprogress = function() {};
            
            xdr.open('get', url);
            xdr.onload = function() {
                callback(eval('(' + xdr.responseText + ')'), 'success');
            };
            xdr.send();
        }
        else {
            $._get(url, data, callback);
        };
    };
    
    $.post = function(url, data, callback) {
        if (jQuery.browser.msie && window.XDomainRequest) {
            var xdr = new XDomainRequest();
            xdr.timeout = 5000;
            xdr.ontimeout = function() { 
                alert('timeout!');
                xdr.send(data)
            };
            xdr.onprogress = function() {};
            
            xdr.open('post', url);
            xdr.send(data);
            xdr.onload = function() {
                callback(eval('(' + xdr.responseText + ')'), 'success');
            };
        }
        else {
            $._post(url, data, callback);
        };
    };
})(jQuery);

$.ajaxSetup({
    error: function(xhr) {
        alert('G-Gengo has encountered an error:\n' +
            'Please check your connection or API access\n' +
            'Request status: ' + xhr.status + ' ' + xhr.statusText
        );
    }
});

var AJAXRequest = function(api_obj, callback) {    
    var url = settings.run_mode + api_obj.url;

    callback = (callback === undefined) ? ajax_callback : callback;
    url = (settings.host === undefined) ? url : settings.host + '?query=' + url;
    
    function success_handler(data) {
        if (data.opstat == 'error') {
            switch(data.err.code) {
                case 2401:
                    alert('G-Gengo has encountered error ' + data.err.code + ':\n' + 'Invalid CAPTCHA, please enter the new CAPTCHA provided');
                    callback(data, api_obj.call);
                    break;
            
                default:
                    alert('G-Gengo has encountered error ' + data.err.code + ':\n' + capitalise_first(data.err.msg));
                    break;
            };
        }
        else {
            callback(data, api_obj.call);
        };
    };
    
    switch(api_obj.method) {
        case 'GET':
            $.get(url, payload, function(data) {
                success_handler(data);
            });
            break;
            
        case 'DELETE':
            $.ajax({
                'type': 'DELETE',
                'url': url,
                'dataType': 'json',
                'success': function(data) { success_handler(data); }
            });
            break;
            
        case 'POST':
            var payload = 'payload=' + encodeURIComponent(api_obj.data);
            $.post(url, payload, function(data) {
                success_handler(data);
            });
            break;
            
        // can't get put to work with the mygengo API
        // data is sent properly but API repsonse API key required
        // change to POST with _method=put fixes the problem immediately
        case 'PUT':
            var payload = 'payload=' + encodeURIComponent(api_obj.data);
            $.ajax({
                'type': 'PUT',
                'url': url,
                'data': payload,
                'dataType': 'json',
                'success': function(data) { success_handler(data); }
            });
            break;
        
        case 'ERROR':
            alert('G-Gengo has encountered an error:\n' + api_obj.data);
            break;
            
        default:
            alert('G-Gengo has encountered an error:\n' +
                'Unrecognised AJAX method\n' +
                'Made by: ' + api_obj.call
            );
            break;
    };
};

function ajax_callback(data, call) {
    switch(call) {
        case mygengo.account_balance_get:
            gadgetgengo.balance = data.response.credits;
            gui_handler('update_balance');
            break;
            
        case mygengo.translate_service_languages_get:
            langcodes = langcodes_parser(data);
            //chained AJAX call to prevent sync problems
            AJAXRequest(APIQuery(mygengo.translate_job_language_pairs_get));
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
                gui_handler('update_status_color', data.response.job.job_id);
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
            
        // exception cases where more callback flexibility is needed i.e. update_jobs
        
        //GET method used to update
        // data[0]: data retrieved from AJAX request
        // data[1]: last job id
        case 'update_job_get':
            gadgetgengo.current_jobs[data[0].response.job.job_id] = data[0].response.job;
            gui_handler('insert_job_list', data[0].response.job.job_id);
            gui_handler('check_update_jobs_complete', [data[0].response.job.job_id, data[1]]);
            break;
        
        //POST (lazy loading) method used to update
        // data[0]: data retrieved from AJAX request
        // data[1]: last job id
        case 'update_job_post':
            // updates via lazy loading and GET differ, only update according to data received so as to preserve keys such as captcha_url etc.
            update_key_value_pairs(gadgetgengo.current_jobs[data[0].response.job.job_id], data[0].response.job);
            
            gui_handler('update_job_button', data[0].response.job.job_id);
            gui_handler('check_update_jobs_complete', [data[0].response.job.job_id, data[1]]);
            break;
            
        //exception case as api response returns dummy response
        // data[0]: data retrieved from AJAX request (useless)
        // data[1]: job_id deleted
        case mygengo.translate_job_id_delete:
            gadgetgengo.current_jobs[data[1]].status = 'cancelled';
            gui_handler('update_job_button', data[1]);
            gui_handler('cancel_yes', data[1]);
            break;
            
        //PUT via POST method job reivsion
        // data[0]: data retrieved from AJAX request (useless)
        // data[1]: job_id deleted
        case 'revise_job':           
            gadgetgengo.current_jobs[data[1]].status = 'revising';
            gui_handler('update_job_button', data[1]);
            gui_handler('revise_yes', data[1]);
            break;
        
        // PUT via POST method job approval
        // data[0]: data retrieved from AJAX request (useless)
        // data[1]: job_id approved
        case 'approve_job':
            gadgetgengo.current_jobs[data[1]].status = 'approved';
            gui_handler('update_job_button', data[1]);
            gui_handler('approve_yes', data[1]);
            break;
            
        // update cache with latest job details including captcha_url and recall the show_job_form
        // exception case as call is GET job id
        case 'get_captcha':
            gadgetgengo.current_jobs[data.response.job.job_id] = data.response.job;
            gui_handler('show_action_form', data.response.job.job_id);
            break;
            
        // update captcha_url if incorrect response received
        // data[0]: data retrieved from AJAX request
        // data[1]: job_id rejected
        case 'captcha_error':
            gadgetgengo.current_jobs[data[1]].captcha_url = data[0].err.msg[1];
            gui_handler('captcha_error', data[1]);
            break;
        
        // PUT via POST method job rejection
        // data[0]: data retrieved from AJAX request
        // data[1]: job_id rejected
        case 'reject_job':
            gadgetgengo.current_jobs[data[1]].status = 'Held';
            gui_handler('update_job_button', data[1]);
            gui_handler('reject_yes', data[1]);
            break;
    };
};

function gui_callback(call, data) {
    // called by HTML GUI i.e. onclick, onblur, onfocus etc.
    switch(call) {
        case 'show_options_form':
            gui_handler('min_job_list');
            gui_handler('show_only', '#options_form');
            break;
            
        case 'show_job_form':
            gui_handler('min_job_list');
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
                AJAXRequest(APIQuery(mygengo.translate_service_languages_get)); // which then calls translate_job_language_pairs_get
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
            $('#new_purchase').attr('disabled', 'disabled');
            AJAXRequest(APIQuery(mygengo.translate_job_post, {'_method': 'post'}, {'job': get_job_form()}));
            break;
            
        case 'view_comments':
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
            gui_handler('min_job_list');
            gui_handler('center_selection', data);
            gui_handler('show_only', '#output_field');
            break;
            
        case 'update_balance':
            AJAXRequest(APIQuery(mygengo.account_balance_get));
            break;
            
        case 'minmax_job_list':
            gui_handler('minmax_job_list');
            break;
            
        case 'cancel_yes':
            $('#job_details_cancel_yes').attr('disabled', 'disabled');
            AJAXRequest(APIQuery(mygengo.translate_job_id_delete, {}, {}, {'job_id': data}), function(_data) {
                ajax_callback([_data, data], mygengo.translate_job_id_delete);
            });
            break;
            
        case 'revise_yes':
            switch($('#job_details_revise_comment').val()) {
                case '':
                case $('#job_details_revise_comment').get(0).defaultValue:
                    alert('Please enter a revision comment first');
                    break;
                
                default:
                    $('#job_details_revise_yes').attr('disabled', 'disabled');
                    AJAXRequest(APIQuery(mygengo.translate_job_id_put, {'_method': 'put'}, {'action': 'revise', 'comment': $('#job_details_revise_comment').val()}, {'job_id': data}), function(_data) {
                        ajax_callback([_data, data], 'revise_job');
                    });
                    break;
            };
            break;
            
        case 'approve_yes':
            if ($('#job_details_approve_rating').val() != 'default') {
                $('#job_details_approve_yes').attr('disabled', 'disabled');
                
                var action = {'action': 'approve', 'rating': $('#job_details_approve_rating').val()};
                switch($('#job_details_approve_translator_feedback').val()) {
                    case '':
                    case $('#job_details_approve_translator_feedback').get(0).defaultValue:
                        break;
                        
                    default:
                        action.for_translator = $('#job_details_approve_translator_feedback').val();
                        break;
                };
                switch($('#job_details_approve_mygengo_feedback').val()) {
                    case '':
                    case $('#job_details_approve_mygengo_feedback').get(0).defaultValue:
                        break;
                        
                    default:
                        action.for_mygengo = $('#job_details_approve_mygengo_feedback').val();
                        break;
                };
                AJAXRequest(APIQuery(mygengo.translate_job_id_put, {'_method': 'put'}, action, {'job_id': data}), function(_data) {
                    ajax_callback([_data, data], 'approve_job');
                });
            }
            else {
                alert('Please rate the job first');
            };
            break;
            
        case 'reject_yes':
            if ($('#job_details_reject_reason').val() == 'default') {
                alert('Please select reason for rejection');
                break;
            };
            if ($('#job_details_reject_comment').val() == '' || $('#job_details_reject_comment').val() == $('#job_details_reject_comment').get(0).defaultValue) {
                alert('Please detail the reasons for rejection');
                break;
            };
            if ($('#job_details_reject_followup').val() == 'default') {
                alert('Please select a follow up action');
                break;
            };
            if ($('#job_details_reject_captcha').val() == '' || $('#job_details_reject_captcha').val() == $('#job_details_reject_captcha').get(0).defaultValue) {
                alert('Please enter CAPTCHA');
                break;
            };
            $('#job_details_reject_yes').attr('disabled', 'disabled');
            
            var action = {'action': 'reject'};
            action.reason = $('#job_details_reject_reason').val();
            action.comment = $('#job_details_reject_comment').val();
            action.follow_up = $('#job_details_reject_followup').val();
            action.captcha = $('#job_details_reject_captcha').val();
            
            AJAXRequest(APIQuery(mygengo.translate_job_id_put, {'_method': 'put'}, action, {'job_id': data}), function(_data) {
                if (_data.opstat == 'error') {
                    ajax_callback([_data, data], 'captcha_error');
                }
                else {
                    ajax_callback([_data, data], 'reject_job');
                };
            });
            break;
            
        case 'action_cancel':
            gui_handler('action_cancel', data);
            break;
            
        case 'update_jobs':
            //check if any differences with latest job id list and current_jobs list
            gui_handler('min_job_list');
            gui_handler('show_only', '#output_field');
            gui_handler('set_output_field_msg', 'Updating jobs, please wait');
            
            //request all jobs, cross reference cancelled jobs, update necessary jobs
            AJAXRequest(APIQuery(mygengo.translate_jobs_get), function(data) {
                //if the job id is not in the current list, add job id as the key, value is blank
                for (i in data.response) {
                    if (!(data.response[i].job_id in gadgetgengo.current_jobs)) {
                        gadgetgengo.current_jobs[data.response[i].job_id] = '';
                    };
                };
                
                // find the last job being sent for update, to provide 'update completed!'
                var last = 0;
                for (i in gadgetgengo.current_jobs) {
                    switch(gadgetgengo.current_jobs[i].status) {
                        case 'cancelled':
                        case 'approved':
                            break;
                            
                        default: // covers new jobs not in the cache as well, their status == undefined
                            last = i;
                            break;
                    };
                };
                
                // need to prevent lazy loading from creating any jobs
                // lazy loading doesn't apply to cancelled jobs (recreates them!) but appears to apply to rejected jobs (status being Held)
                // API has inconsistent spelling, GET only accepts'canceled' NOT 'cancelled'
                AJAXRequest(APIQuery(mygengo.translate_jobs_get, {'status': 'canceled'}), function(data) {
                    var dont_lazy_load = [];
                    for (i in data.response) {
                        dont_lazy_load.push(data.response[i].job_id);
                    };
                
                    // make AJAX update calls only if there are jobs to update
                    if (last) {
                        for (i in gadgetgengo.current_jobs) {
                            switch(gadgetgengo.current_jobs[i].status) {
                                case 'cancelled':
                                case 'approved':
                                    //no need to update
                                    break;
                                
                                case undefined: //jobs not in cache, update with GET
                                    AJAXRequest(APIQuery(mygengo.translate_job_id_get, {'job_id': i, 'pre_mt': 1}), function(data) {
                                        ajax_callback([data, last], 'update_job_get');
                                    });
                                    break;
                                
                                default: //jobs in cache, update with POST (lazy loading) or update with GET if job is now cancelled (to prevent actual POST call)
                                    if (dont_lazy_load.indexOf(i) == -1) {
                                        AJAXRequest(APIQuery(mygengo.translate_job_post, {'_method': 'post'}, {'job': job_parser(gadgetgengo.current_jobs[i])}), function(data) {
                                            ajax_callback([data, last], 'update_job_post');
                                        });
                                    }
                                    else {
                                        AJAXRequest(APIQuery(mygengo.translate_job_id_get, {'job_id': i, 'pre_mt': 1}), function(data) {
                                            ajax_callback([data, last], 'update_job_post'); //this method applies as it is still an existing job
                                        });
                                    };
                                    break;
                            };
                        };
                    }
                    else {
                        gui_handler('check_update_jobs_complete', [0, last]);
                    };
                });
            });
            break;
    };
};

function gui_handler(call, data) {
    switch(call) {
        case 'load_base_html':
        case 'save_options':
            $('body').html(html_parser('base_html'));
            break;
        
        case 'init':
            $('#job_form').html(html_parser('job_form'));
            $('#options_form').html(html_parser('options_form'));
            
            $('#update_btn').click(function() {
                $('#update_btn').attr('disabled', 'disabled');
                gui_callback('update_balance');
                gui_callback('update_jobs');
            });
            
            $('#options_btn').click(function() {
                gui_callback('show_options_form');
            });
            
            $('#minmax_btn').click(function() {
                gui_callback('minmax_job_list');
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
        
        case 'minmax_job_list':
            var min_or_max = ($('#job_list').css('height') != '243px') ? 'min' : 'max';
            
            if (min_or_max == 'min') {
                $('#job_list').animate({'height': '243px'}, 'slow');
                $('#minmax_btn').html('-');
                gui_handler('max_job_list_style');
            }
            else {
                $('#job_list').animate({'height': '105px'}, 'slow');
                $('#minmax_btn').html('+');
                gui_handler('min_job_list_style');
            };
            break;
            
        case 'min_job_list':
            if ($('#job_list').css('height') != '105px') {
                $('#job_list').animate({'height': '105px'}, 'slow');
                $('#minmax_btn').html('+');
                gui_handler('min_job_list_style');
            };
            break;
            
        case 'max_job_list_style':
            $('#job_list').css({'border': 'solid 1px transparent'});
            break;
            
        case 'min_job_list_style':
            $('#job_list').removeAttr('style');
            break;
            
        case 'center_selection':
            //takes the id and checks if it is in view, if not it scrolls it into view (for min job_list view)
            //offset().top: 98 is bottom, 25 is top viewing
            var pos_from_top = $('#' + data).offset().top;
            var in_view = (pos_from_top > 98 || pos_from_top < 25) ? false : true;
            
            if (!in_view) {
                var high_or_low = (pos_from_top > 98) ? 'too low' : 'too high';
                var scroll_pos = $('#job_list').scrollTop();
                
                switch(high_or_low) {
                    case 'too low':
                        var delta = pos_from_top - 98;
                        $('#job_list').animate({'scrollTop': scroll_pos + delta}, 'slow');
                        break;
                    
                    case 'too high':
                        var delta = 25 - pos_from_top;
                        $('#job_list').animate({'scrollTop': scroll_pos - delta}, 'slow');
                        break;
                    
                    default:
                        //alert('center_selection: default called!'); should not in be (abled to be) called at all
                        break;
                };
            };
            break;
        
        case 'show_only':
            var hide_me = ['#output_field', '#job_form', '#options_field'];
            hide_me.splice(hide_me.indexOf(data), 1);
            
            for (i in hide_me) {
                $(hide_me[i]).fadeOut('fast');
            };
            
            if ($(data).css('display') == 'none') {
                $(data).fadeIn('fast');
            };
            $(data).scrollTop(0);
            break;
        
        case 'update_balance':
            $('#add_job').html(html_parser('add_job_html', gadgetgengo.balance));
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
            
        case 'update_status_color':
            switch(gadgetgengo.current_jobs[data].status) {
                case 'cancelled':
                    $('#' + data).css('opacity', 0.4);
                    break;
                
                case 'approved':
                case 'reviewable':
                    $('#' + data).css('color', '#FF6600');
                    break;
                
                default:
                    $('#' + data).removeAttr('style');
                    break;
            };
            break;
            
        case 'set_output_field_msg':
            $('#output_field').html(html_parser('p', data));
            break;
            
        case 'check_update_jobs_complete':
            // data[0], current job id
            // data[1], last job_id
            if (data[0] == data[1]) {
                gui_handler('min_job_list');
                gui_handler('show_only', '#output_field');
                gui_handler('set_output_field_msg', 'Update complete!');
                $('#update_btn').removeAttr('disabled');
            };
            break;
            
        case 'append_job_list':
            $('#job_list').append(html_parser('text_button', gadgetgengo.current_jobs[data]));
            $('#' + data).attr('title', gadgetgengo.current_jobs[data].slug);
            gui_handler('update_status_color', data);
            
            $('#' + data).click(function() {
                gui_callback('show_job', data);
            });
            break;
            
        case 'insert_job_list':
            $(html_parser('text_button', gadgetgengo.current_jobs[data])).insertAfter('#add_job');
            $('#' + data).attr('title', gadgetgengo.current_jobs[data].slug);
            gui_handler('update_status_color', data);
            
            $('#' + data).click(function() {
                gui_callback('show_job', data);
            });
            break;
        
        case 'update_job_button':
            $('#' + data).html(html_parser('text_button_html', gadgetgengo.current_jobs[data]));
            gui_handler('update_status_color', data);
            break;
        
        case 'view_comments':
            $('#comment_thread').html(html_parser('view_comments', data));
            $('#comment_thread').show('slow');
            $('#job_details_view_comments').html('Refresh Comments');
            break;
        
        case 'post_comment':
            $('#job_details_enter_comment').val('Leave comments for the translator here');
            $('#job_details_post_comment').removeAttr('disabled');
            $('#job_details_view_comments').html('View Comments');
            $('#comment_thread').hide('slow');
            break;
            
        case 'action_cancel':
            $('#job_actions').val('comments');
            gui_handler('show_action_form', data);
            
            //scroll down to show the field
            var delta = $('#job_action_form').css('height');
            var pos_from_top = $('#output_field').scrollTop();
            $('#output_field').animate({'scrollTop': pos_from_top + delta}, 'slow');
            break;
            
        case 'cancel_yes':
            $('#job_details_cancel_yes').removeAttr('disabled');
            gui_handler('set_output_field_msg', 'Job: ' + gadgetgengo.current_jobs[data].slug + ' has been cancelled!');
            break;
            
        case 'revise_yes':
            $('#job_details_revise_yes').removeAttr('disabled');
            gui_handler('set_output_field_msg', 'Job: ' + gadgetgengo.current_jobs[data].slug + ' has been set for revision!');
            break;
        
        case 'approve_yes':
            $('#job_details_approve_yes').removeAttr('disabled');
            gui_handler('set_output_field_msg', 'Job: ' + gadgetgengo.current_jobs[data].slug + ' has been approved!');
            break;
            
        case 'captcha_error':
            $('#job_details_reject_captcha_img').attr('src', gadgetgengo.current_jobs[data].captcha_url);
            $('#job_details_reject_yes').removeAttr('disabled');
            break;
            
        case 'reject_yes':
            $('#output_field').html(html_parser('p', 'Job: ' + gadgetgengo.current_jobs[data].slug + ' has been rejected!'));
            $('#job_details_reject_yes').removeAttr('disabled');
            break;
        
        case 'show_job_details':
            $('#output_field').html(html_parser('job_details', gadgetgengo.current_jobs[data]));
            gui_handler('update_job_actions', data);
            break;
            
        case 'update_job_actions':
            var action_list = {'comments': 'Add/View Comments'};
            switch(gadgetgengo.current_jobs[data].status) {
                // to implement other status actions
                case 'available':
                    action_list['cancel'] = 'Cancel Job';
                    break;
                    
                case 'reviewable':
                    action_list['revise'] = 'Revise Job';
                    action_list['approve'] = 'Approve Job';
                    action_list['reject'] = 'Reject Job';
                    break;
                
                default:
                    //blank as Add/View Comments should be top on the list
                    break;
            };
            
            $('#job_actions').html('');
            $('#job_actions').append(html_parser('add_job_actions', action_list));
            
            // if they change the selection, it should create the appropriate job form (publicly accessible) and functionality (job id?)
            $('#job_actions').change(function() {
                gui_handler('show_action_form', data);
                
                //scroll down to show form
                var delta = $('#job_actions').offset().top - 132;
                var pos_from_top = $('#output_field').scrollTop();
                $('#output_field').animate({'scrollTop': pos_from_top + delta}, 'slow');
            });
            gui_handler('show_action_form', data); //intial call
            break;
            
        case 'show_action_form':
            switch($('#job_actions').val()) {
                case 'comments':
                    $('#job_action_form').html(html_parser('comment_form'));
                    
                    $('#job_details_enter_comment').focus(function() {
                        gui_callback('default_remove', this);
                    });
                    $('#job_details_post_comment').click(function() {
                        gui_callback('post_comment', data);
                    });
                    $('#job_details_view_comments').click(function() {
                        gui_callback('view_comments', data);
                    });
                    break;
                
                case 'cancel':
                    $('#job_action_form').html(html_parser('cancel_form'));
                    
                    $('#job_details_cancel_no').click(function() {
                        gui_callback('action_cancel', data);
                    });
                    $('#job_details_cancel_yes').click(function() {
                        gui_callback('cancel_yes', data);
                    });
                    break;
                    
                case 'revise':
                    $('#job_action_form').html(html_parser('revise_form'));
                    
                    $('#job_details_revise_comment').focus(function() {
                        gui_callback('default_remove', this);
                    });
                    $('#job_details_reivse_comment').blur(function() {
                        gui_callback('default_add', this);
                    });
                    $('#job_details_revise_no').click(function() {
                        gui_callback('action_cancel', data);
                    });
                    $('#job_details_revise_yes').click(function() {
                        gui_callback('revise_yes', data);
                    });
                    break;
                    
                case 'approve':
                    $('#job_action_form').html(html_parser('approve_form'));
                    
                    $('#job_details_approve_translator_feedback').focus(function() {
                        gui_callback('default_remove', this);
                    });
                    $('#job_details_approve_translator_feedback').blur(function() {
                        gui_callback('default_add', this);
                    });
                    $('#job_details_approve_mygengo_feedback').focus(function() {
                        gui_callback('default_remove', this);
                    });
                    $('#job_details_approve_mygengo_feedback').blur(function() {
                        gui_callback('default_add', this);
                    });
                    $('#job_details_approve_no').click(function() {
                        gui_callback('action_cancel', data);
                    });
                    $('#job_details_approve_yes').click(function() {
                        gui_callback('approve_yes', data);
                    });
                    break;
                    
                case 'reject':
                    $('#job_action_form').html(html_parser('p', 'Loading form, please wait'));
                    
                    // load job form (check if captcha data is available otherwise load it in)
                    switch(gadgetgengo.current_jobs[data].captcha_url) {
                        case undefined:
                            AJAXRequest(APIQuery(mygengo.translate_job_id_get, {'job_id': data, 'pre_mt': 1}), function(data) {
                                ajax_callback(data, 'get_captcha');
                            });
                            break;
                            
                        default:
                            $('#job_action_form').html(html_parser('reject_form', gadgetgengo.current_jobs[data].captcha_url));
                            break;
                    };
                    
                    $('#job_details_reject_comment').focus(function() {
                        gui_callback('default_remove', this);
                    });
                    $('#job_details_reject_comment').blur(function() {
                        gui_callback('default_add', this);
                    });
                    $('#job_details_reject_captcha').focus(function() {
                        gui_callback('default_remove', this);
                    });
                    $('#job_details_reject_captcha').blur(function() {
                        gui_callback('default_add', this);
                    });
                    $('#job_details_reject_no').click(function() {
                        gui_callback('action_cancel', data);
                    });
                    $('#job_details_reject_yes').click(function() {
                        gui_callback('reject_yes', data);
                    });
                    break;
            };
            break;
    };
};

function html_parser(call, data) {
    var html_result = '';
    switch(call) {
        // assign at risk HTML attributes via JQUERY as precaution, must be at a level higher - html_parser only return text
        case 'p':
            html_result = '<p>' + data + '</p>';
            break;
        
        case 'base_html':
            html_result = 
                "<p class='bold'>" +
                    "<button type='button' id='update_btn'>Refresh</button>" +
                    "<button type='button' id='options_btn'>Options</button>" +
                    "<button type='button' id='minmax_btn'>+</button>" +
                "</p>" +
                "<div class='container' id='job_list'>" +
                    "<p class='text_button' id='add_job'>Order Translation</br>Credits:</p>" +
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
            // quick dirty hack to display status 'held' as 'rejection under review' - per myGengo feedback
            var displayed_status = (data.status == 'held') ? 'rejection under review' : data.status;
            
            html_result = 
                '<p class="text_button" id="' + data.job_id +'" title="">' +
                    (data.slug.length > 18 ? data.slug.substring(0, 18) + '...' : data.slug) + '</br>' +
                    capitalise_first(displayed_status) +
                '</p>';
            break;
            
        case 'text_button_html':
            // quick dirty hack to display status 'held' as 'rejection under review' - per myGengo feedback
            var displayed_status = (data.status == 'held') ? 'rejection under review' : data.status;
            
            html_result = 
                (data.slug.length > 18 ? data.slug.substring(0, 18) + '...' : data.slug) + '</br>' +
                capitalise_first(displayed_status);
            break;
            
        case 'add_job_html':
            html_result =
                'Order Translation</br>' +
                'Credits: $' + data;
            break;
            
        case 'job_form':
            html_result = 
                '<input type="text" id="new_slug" value="Job title"/></br>' +
                '<textarea id="new_body_src">Text to translate</textarea>' +
                '<textarea id="new_comment">Comment for translator</textarea>' +
                'From: <select id="new_lc_src"></select></br>' +
                'To: <select id="new_lc_tgt"></select></br>' +
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
                html_result += '<option value="' + lc_src[i] + '">' + langcodes[lc_src[i]] + '</option>';
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
                html_result += '<option value="' + i + '">' + langcodes[i] + '</option>';
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
                html_result += '<option value="' + i + '">' + capitalise_first(i) + '</option>';
            };
            break;
        
        case 'job_details':
            html_result =
                '<p class="bold">#' + data.job_id + ' (' + langcodes[data.lc_src] + ')</p>' +
                '<p>' + data.body_src + '</p></br>' +
                '<p class="bold">' + capitalise_first(data.tier) + ' (' + langcodes[data.lc_tgt] + ')</p>';
                
            if (data.status == 'reviewable') {
                var link = APIQuery(mygengo.translate_job_id_preview_get, {}, {}, {'job_id': data.job_id}).url;
                html_result +=
                    '<a href="' + "javascript: open_window('" + settings.run_mode + link + "', 460, 673)" + '">Preview human translation</a></br></br>';
            }
            else {   
                html_result +=
                    (data.status != 'approved' ? '<p class="italic">(Preview by machine)</p>': '') +
                    '<p>' + data.body_tgt + '</p></br>';
            }
            html_result += 
                '<p class="bold">Actions:</p>' +
                '<select id="job_actions"></select></br>' +
                '<div class="hidden" id="job_action_form"></div>';
            break;
        
        case 'add_job_actions':
            for (i in data) {
                html_result += '<option value="' + i + '">' + data[i] + '</option>';
            };
            break;
        
        case 'comment_form':
            html_result = 
                '<textarea id="job_details_enter_comment">Leave comments for the translator here</textarea>' +
                '<button type="button" id="job_details_post_comment">Post</button>' + '</br>' +
                '<p id="comment_thread"></p>' +
                '<a id="job_details_view_comments" href="javascript:">View Comments</a>';
            break;
            
        case 'cancel_form':
            html_result = 
                '<p>Are you sure you wish to cancel?</p>' +
                '<button id="job_details_cancel_yes">Yes</button>' + '<button id="job_details_cancel_no">No</button>';
            break;
            
        case 'revise_form':
            html_result =
                '<textarea id="job_details_revise_comment">Please detail your reasons for revision</textarea>' +
                '<button type="button" id="job_details_revise_yes">Revise</button>' + '<button id="job_details_revise_no">Cancel</button>';
            break;
            
        case 'approve_form':
            html_result =
                '<textarea id="job_details_approve_translator_feedback">Feedback for translator (optional)</textarea>' +
                '<textarea id="job_details_approve_mygengo_feedback">Feedback for myGengo (optional)</textarea>' +
                '<select id="job_details_approve_rating">' +
                    '<option value="default">Rating</option>' +
                    '<option value="1">1 (Poor)</option>' + 
                    '<option value="2">2</option>' +
                    '<option value="3">3</option>' +
                    '<option value="4">4</option>' +
                    '<option value="5">5 (Fantastic)</option>' +
                '</select></br>' +
                '<button id="job_details_approve_yes">Approve</button>' + '<button id="job_details_approve_no">Cancel</button>';
            break;
            
        case 'reject_form':
            html_result = 
                '<select id="job_details_reject_reason">' +
                    '<option value="default">Reason for rejection</option>' +
                    '<option value="incomplete">Incomplete</option>' +
                    '<option value="quality">Quality</option>' +
                    '<option value="other">Other</option>' +
                '</select>' +
                '<textarea id="job_details_reject_comment">Please detail your reasons for rejection</textarea>' +
                '<select id="job_details_reject_followup">' +
                    '<option value="default">Follow up action</option>' +
                    '<option value="requeue">Requeue</option>' +
                    '<option value="cancel">Cancel</option>' +
                '</select></br>' +
                '<img id="job_details_reject_captcha_img" src="' + data + '"/>' +
                '<input type="text" id="job_details_reject_captcha" value="Enter CAPTCHA"></input>' +
                '<button id="job_details_reject_yes">Reject</button>' + '<button id="job_details_reject_no">Cancel</button>';
            break;
            
        case 'view_comments':
            if (data.length != 0) {
                html_result = '';
                for (i=0; i<data.length; i++) {
                    html_result += 
                        data[i].body + '</br>' +
                        '<i>' + data[i].author + ', ' + date_parse(data[i].ctime) + '</i></br></br>';
                };
            }
            else {
                html_result = 'No comments';
            };
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

function update_key_value_pairs(current, latest) {
    for (i in latest) {
        current[i] = latest[i];
    };
};

function capitalise_first(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

function date_parse(ctime) {
    var d = new Date(ctime * 1000);
    return d.getDate() + '/' + d.getMonth() + '/' + d.getFullYear();
};

function open_window(url, h, w) {
    new_window = window.open(url, '', 'height = ' + h + ', width = ' + w);
    if (window.focus) {
        new_window.focus()
    };
};