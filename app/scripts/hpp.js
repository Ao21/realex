if (!console) {
    var console = {
        log : function(msg) {

        }
    };

}

var Hpp = {
    config : {
        base_url : '/',
        dcc_section_holder_name : 'realex-dcc-holder',
        auth_check_url : '/api/auth',
        acs_url : '/api/acsurl',
        acs_url_threeDSecure : '/acs/threeDSecure',
        card_identification_url : '/api/cardIdentification',
        merchant_data : null,
        script_name : 'realex-script',
        dcc_offer_template_name : 'rxp-dcc-offer-template',
        dcc_offer_template : null,

        form_name : 'card-payment-form',
        container_name : 'rxp-container',
        ajaxTimeoutShort : 5000,
        ajaxTimeoutLong : 10000,
        ajaxRetryLimit : 2
    }
};

Hpp.paypal = function(custom_attributes) {
    var attributes = Hpp.config;

    if (custom_attributes != null) {

        for (att in custom_attributes) {
            attributes[att] = custom_attributes[att];
        }
    }

    $('#paypal-form').submit(function(event) {
        var form = event.target;
        form = $(form);
        form.find(':input[type=submit]').prop('disabled', true);
        form.find(':input[type=submit]').val(Hpp.i18n.messages.processing);
    });
};

/**
 * 
 */
Hpp.create = function(custom_attributes) {

    var cardIdentified = false;
    
    if( $('#hpp_post_dimensions').length ){
    	  var currentHeight = document.body.clientHeight;
    	  var currentWidth = document.body.clientWidth;
    	  var dimensionData = {};
    	  dimensionData.iframe = {};
    	  dimensionData.iframe.height = currentHeight + 'px';
    	  dimensionData.iframe.width = currentWidth + 'px';
          var hppDimensionHostUrl = $('#hpp_post_dimensions').val();
          parent.postMessage(JSON.stringify(dimensionData),hppDimensionHostUrl);
    	  
    	}
    function postSizeIfChanged()
    {
      var dimensionData = {};
      dimensionData.iframe = {};
      var hppHeight = document.body.clientHeight;
      var hppWidth = document.body.clientWidth;
      var hppDimensionHostUrl = $('#hpp_post_dimensions').val();
      if(hppHeight != currentHeight || hppWidth != currentWidth){
    	  dimensionData.iframe.height = hppHeight + 'px';;
    	  dimensionData.iframe.width = hppWidth + 'px';;
          parent.postMessage(JSON.stringify(dimensionData),hppDimensionHostUrl);
          currentHeight = hppHeight;
          currentWidth = hppWidth;
      }
     
    }
    
    function postResponseToParent(message, parentDomain){
    	
    	if (window.webkit && window.webkit.messageHandlers) {
			// iOS native app
			if(window.webkit.messageHandlers.callbackHandler){
				// WkWebView supported
				window.webkit.messageHandlers.callbackHandler.postMessage(message, parentDomain);
			} else {
				// UIWebView supported
				window.location.href = 'callbackHandler://' + message;
			}
		} else if (window.HppManager) {
			// Android native app
			window.HppManager.callbackHandler(message, parentDomain);
		} else if(window.opener){
			// browser new window
			window.opener.postMessage(message, parentDomain);
			window.close();
		} else {
			// browser IFrame
			window.parent.postMessage(message, parentDomain);
		}
    	
    }
    
    
    if( $('#hpp_post_dimensions').length ){
        setInterval( postSizeIfChanged, 300);
    }

    var is_touch_device = ('ontouchstart' in window)
            || (window.DocumentTouch && document instanceof DocumentTouch);
    // if its a lightbox form
    var isLightbox = $('#rxp-lightbox').length > 0;

    $('.rxp-popover').popover({
        trigger : is_touch_device ? 'click' : 'hover',
        placement : isLightbox ? 'bottom' : 'top',
        delay : 300
    });

    $('input[name=\'pas_ccnum\']').val('');
    $('input[name=\'dccchoice\']').val('NO');

    var attributes = Hpp.config;

    attributes.proccessing_logo = $('#realex-script').data('proccessing');

    var data_attributes = $('#' + custom_attributes.form_name)
            .serializeObject();

    attributes.merchant_data = data_attributes;

    $('#' + attributes.form_name).removeAttr('action');

    if (custom_attributes != null) {

        for (att in custom_attributes) {
            attributes[att] = custom_attributes[att];
        }
    }

    /*
     * Removed as now not used
     * $("input[name='pas_expiry']").mask(Hpp.i18n.messages.expirymask, {
     * placeholder : " " });
     */

    Handlebars.registerHelper('dateFormat', function(context, block) {
        if (window.moment) {
            var df = block.hash.format || 'YYYY/MM/DD hh:mm:ss';
            return moment(context, 'YYYYMMDDhhmmss').format(df);
        }
    });

    Handlebars.registerHelper('ifCond', function(v1, v2, options) {
        if (v1 === v2) {
            return options.fn(this);
        }
        return options.inverse(this);
    });

    var template_source = $('#' + attributes.dcc_offer_template_name).html();
    attributes.dcc_offer_template = Handlebars.compile(template_source);

    var handle_auth_request = function() {

        var cardType = $('input[name=\'pas_cctype\']').val();
        if (cardType === undefined || cardType === '') {
            if ($('input[name=\'pas_ccnum\']').val() === undefined
                    || $('input[name=\'pas_ccnum\']').val() === '') {
                $('#card-errors').html(
                        Hpp.i18n.messages.erroridentifycardfailed);
            } else {
                $('#card-errors')
                        .html(Hpp.i18n.messages.merchantnotenabledcard);
            }

            return false;
        }

        doAuth();

    };

    var joinExpiry = function(form) {
        var month = $(form).find('#pas_ccmonth').val();
        var year = $(form).find('#pas_ccyear').val();
        $(form).find('#pas_expiry').val(month + '/' + year);
    };

    var removeSpaces = function(form) {
        var pas_ccnum = $(form).find('#pas_ccnum').val().replace(/\s/g, '');
        $(form).find('#pas_ccnum').val(pas_ccnum);
    };

    var doAuth = function() {

        $('#' + attributes.form_name).find(':input[type=submit]').prop(
                'disabled', true);

        var old_button_text = $('#rxp-primary-btn').val();
        var form = $('#' + attributes.form_name);
        var container = $('#' + attributes.container_name);
        joinExpiry(form);

        var formCopy = form.clone();
        removeSpaces(formCopy);
        var serialisedData = formCopy.serialize();

        var ser = $.param(attributes.merchant_data);
        form.find(':input').prop('disabled', true);
        form.find(':input[type=submit]').val(Hpp.i18n.messages.processing);

        container.fadeOut(500, function() {

            $('#success-pane').fadeIn();
        });
        $.ajax({
            url : attributes.auth_check_url,
            type : 'POST',
            data : serialisedData,
            success : function(data) {
                handle_auth_request_callback(data, old_button_text);
            },
            error : handle_auth_request_error_callback

        });

        return false;
    };

    var handle_auth_request_error_callback = function() {
        $('#' + attributes.form_name).find(':input[type=submit]').prop(
                'disabled', true);
        show_error_message(Hpp.i18n.messages.authfailed);

    };
    
    var handle_auth_request_callback = function(data, button_text) {

        if (data.status === 'ERROR') {
            if (data.errors[0].message === 'Failed to Identify Card') {
                var form = $('#' + attributes.form_name);
                form.find(':input[type=submit]').prop('disabled', false);
                form.find(':input').prop('disabled', false);

                $('#card-errors').html(
                        Hpp.i18n.messages.erroridentifycardfailed);
                $('.rxp-btn-info').addClass('rxp-hidden');
                $('#rxp-primary-btn').val(button_text);
            } else {
                handle_auth_request_error_callback();
            }
        } else {

            if (typeof (data) === 'string') {
                $('#' + attributes.form_name).find(':input[type=submit]').prop(
                        'disabled', false);
                show_error_message(Hpp.i18n.messages.authfailed);
                return false;
            }

            if (data.data !== undefined
                    && data.data.verifyEnrolledResult !== undefined) {
                updateMDforACS_callback(data);
                return false;
            }

            if (data.data !== undefined && data.data.postToIFrame) {
            	postResponseToParent(data.message, data.data.originUrl);

            } else {
                var container = $('.' + attributes.container_name);
                container.fadeOut(500, function() {
                    $('#success-pane').show();
                    $('#result-message').html(data.message);
                    if (data.status != '00') {
                        $('#result-message').addClass('error');
                    } else {
                        $('#result-message').removeClass('error');
                    }

                });
            }
            if( $('#hppPostResponse').length && data.data !== undefined){
            	postResponseToParent(data.message, $('#hppPostResponse').val());
            }
        }

    };

    var remove_dcc_section = function() {
        var currentHtml = $('#' + attributes.dcc_section_holder_name).html();

        if (currentHtml != '' && currentHtml != null) {
            $('#' + attributes.dcc_section_holder_name).hide(500, function() {
                $('#' + attributes.dcc_section_holder_name).html('');
            });
        }
        $('#' + attributes.form_name).find(':input[name=dccchoice]').val('');
        $('#' + attributes.form_name).find(':input[name=dccrate]').val('');
    };

    var add_dcc_section = function(dcc, dcc_encrypt, cardIdentity) {
        var dcc_section = $('#' + attributes.dcc_section_holder_name);

        var dcc_cardIdentity_obj = {
            dcc : dcc,
            cardIdentity : cardIdentity
        };

        dcc_section.html(attributes.dcc_offer_template(dcc_cardIdentity_obj));
        dcc_section.show(500);

        $('#' + attributes.form_name).find(':input[name=dccchoice]').val('YES');
        $('#rxp-dcc-offer-yes').button('toggle');
        $('#rxp-dcc-offer-legal-mastercard-no').hide();
        $('#rxp-dcc-offer-legal-visa-yes').show();
        $('#rxp-dcc-offer-legal-mastercard-yes').show();
        $('#' + attributes.form_name).find(':input[name=dccrate]').val(
                dcc_encrypt);

        $('#rxp-dcc-offer-yes').click(
                function() {
                    $('#' + attributes.form_name)
                            .find(':input[name=dccchoice]').val('YES');
                    $('#rxp-dcc-offer-legal-mastercard-no').hide();
                    $('#rxp-dcc-offer-legal-mastercard-yes').show();
                    $('#rxp-dcc-offer-legal-visa-yes').show();
                    $('#rxp-dcc-offer-yes').button('toggle');
                });

        $('#rxp-dcc-offer-no').click(
                function() {
                    $('#' + attributes.form_name)
                            .find(':input[name=dccchoice]').val('NO');
                    $('#rxp-dcc-offer-legal-mastercard-no').show();
                    $('#rxp-dcc-offer-legal-mastercard-yes').hide();
                    $('#rxp-dcc-offer-legal-visa-yes').hide();
                    $('#rxp-dcc-offer-no').button('toggle');
                });
    };

    $(document)
            .ready(
                    function() {
                    	
                    	$('.digitsOnly')
                                .keydown(
                                        function(event) {
                                            var theEvent = event
                                                    || window.event;

                                            if ((theEvent.charCode == undefined || theEvent.charCode == 0)
                                                    && (theEvent.keyCode == 46 // delete
                                                            || theEvent.keyCode == 8 // backspace
                                                            || theEvent.keyCode == 9 // tab
                                                            || theEvent.keyCode == 27 // esc
                                                            || theEvent.keyCode == 13 // enter
                                                            || (theEvent.keyCode == 65 && theEvent.ctrlKey === true) // A &&
                                                                                                                        // ctrl
                                                            || (theEvent.keyCode == 86 && theEvent.ctrlKey === true) // V &&
                                                                                                                        // ctrl
                                                    || (theEvent.keyCode >= 35 && theEvent.keyCode <= 40) // End(35)
                                                                                                            // ,
                                                                                                            // Home(36),
                                                                                                            // Left(37),
                                                                                                            // Up(38),
                                                                                                            // Right(39)
                                                                                                            // ,
                                                                                                            // Down(40)
                                                    )) {
                                                return;
                                            }

                                            // IE8 keyCode is undefined .. use
                                            // charCode
                                            // Firefox keyCode = 0
                                            var key = String
                                                    .fromCharCode(theEvent.keyCode != undefined
                                                            && theEvent.keyCode != 0 ? getKeyCode(theEvent.keyCode)
                                                            : theEvent.charCode);
                                            var regex = /[0-9]/;
                                            if (!regex.test(key)) {
                                                theEvent.returnValue = false;
                                                if (theEvent.preventDefault)
                                                    theEvent.preventDefault();
                                            }
                                        });

                    });
    
    var getKeyCode = function(keyCode) {
        // numpad
        if (keyCode >= 96 && keyCode <= 105) {
            return keyCode - 48;
        }
        return keyCode;
    };

    var validate_card_form = function(form_name) {
        var form = $('#' + form_name);
        var errorContainer = $('#expiry-error-container');
        form
                .validate({
                    errorClass : 'rxp-error',
                    onkeyup : false,
                    rules : {
                        pas_ccnum : {
                            required : true,
                            minlength : 14,
                            maxlength : 23,
                            validcardnumber : true,
                            luhn : true
                        },
                        pas_ccname : {
                            required : true,
                            validCardName : true
                        },
                        pas_cccvc : {
                            required : true,
                            number : true,
                            minlength : 3,
                            maxlength : 4,
                            validamexcvc : true,
                            validnonamexcvc : true

                        },
                        pas_ccmonth : {
                            required : true,
                            number : true,
                            minlength : 2,
                            maxlength : 2,
                            max : 12,
                            min : 1
                        },
                        pas_ccyear : {
                            required : true,
                            number : true,
                            minlength : 2,
                            maxlength : 2,
                            validexpirydate : true
                        },
                        pas_issuenumber : {
                            required : false,
                            number : true,
                            validissuenumber : true
                        }
                    },
                    messages : {
                        pas_ccnum : {
                            required : Hpp.i18n.messages.cardnumberrequired,
                            minlength : Hpp.i18n.messages.cardnumbertooshort,
                            maxlength : Hpp.i18n.messages.cardnumbertoolong,
                            luhn : Hpp.i18n.messages.cardnumberinvalid,
                            validcardnumber : Hpp.i18n.messages.validNumber
                        },
                        pas_ccname : {
                            required : Hpp.i18n.messages.cardnameinvalid
                        },
                        pas_cccvc : {
                            required : Hpp.i18n.messages.cvcinvalid,
                            number : Hpp.i18n.messages.cvcinvalid,
                            minlength : Hpp.i18n.messages.cvcmin,
                            maxlength : Hpp.i18n.messages.cvcmax,
                            validamexcvc : Hpp.i18n.messages.pleaseentervalidamexcvc,
                            validnonamexcvc : Hpp.i18n.messages.pleaseentervalidnonamexcvc
                        },
                        pas_ccmonth : {
                            required : Hpp.i18n.messages.requiredexpirymonth,
                            number : Hpp.i18n.messages.validNumberexpirymonth,
                            minlength : Hpp.i18n.messages.expiryminmonth,
                            maxlength : Hpp.i18n.messages.expirymaxmaonth,
                            max : Hpp.i18n.messages.dateinvalid,
                            min : Hpp.i18n.messages.dateinvalid

                        },
                        pas_ccyear : {
                            validexpirydate : Hpp.i18n.messages.dateinvalid,
                            required : Hpp.i18n.messages.requiredexpiryyear,
                            number : Hpp.i18n.messages.validNumberexpiryyear,
                            minlength : Hpp.i18n.messages.expiryminyear,
                            maxlength : Hpp.i18n.messages.expirymaxyear

                        },
                        pas_issuenumber : {
                            validissuenumber : Hpp.i18n.messages.issuenumberinvalid,
                            number : Hpp.i18n.messages.validNumber

                        }
                    },
                    submitHandler : handle_auth_request,

                    errorPlacement : function(error, element) {

                        // if its a lightbox form
                        if ($('#rxp-lightbox').length) {
                            if (element.is('#pas_ccmonth')
                                    || element.is('#pas_ccyear')) {
                                error.appendTo($('#rxp-expiry-error-mobile'));
                            } else if (element.is('#pas_cccvc')) {
                                error.appendTo($('#rxp-expiry-svn-group'));
                            } else if (element.is('#pas_ccnum')) {
                                $('#card-errors').html('');
                                error.appendTo($('#card-errors'));
                            } else {
                                error.appendTo(element.parent());
                            }
                        } else {
                            if (element.is('#pas_ccmonth')
                                    || element.is('#pas_ccyear')) {
                                error.appendTo($('#expiry-error-container'));
                            } else if (element.is('#pas_ccnum')) {
                                $('#card-errors').html('');
                                error.appendTo($('#card-errors'));
                            } else {
                                error.appendTo(element.parent());
                            }
                        }
                    }
                });
        return false;

    };
    validate_card_form(attributes.form_name);

    var passesLuhnCheck = function(ccnum, element) {
        if (element) {
            if (this.optional(element)) {
                return true;
            }
        }
        ccnum = '' + ccnum.replace(/\s/g, '');

        var i, sum, weight;
        sum = 0;
        var ccNumLength = ccnum.length;
        for (i = 0; i < ccNumLength - 1; i++) {
            weight = ccnum.substr(ccNumLength - (i + 2), 1) * (2 - (i % 2));
            sum += ((weight < 10) ? weight : (weight - 9));
        }

        if (parseInt(ccnum.substr(ccNumLength - 1)) === ((10 - sum % 10) % 10)) {
            return true;
        } else {
            return false;
        }

        return true;
    };

    var validExpiryDateCheck = function(expiry, element) {

        if (element) {
            if (this.optional(element)) {
                return true;
            }
        }

        var otherEl = $(element).data('other-expiry');
        var otherVal = $('#' + otherEl).val();
        if (otherVal === '' || otherVal === undefined) {
            return true;
        }

        var comp = [];

        if (otherEl === 'pas_ccyear') {
            comp = [ expiry, otherVal ];
        } else {
            comp = [ otherVal, expiry ];
        }

        var currentDate = new Date();

        var month = parseInt(comp[0], 10);
        var year = parseInt(comp[1], 10);

        var currentYear = parseInt(currentDate.getFullYear().toString(10)
                .substring(2, 4), 10);

        if (month > 12 || year < currentYear
                || (year == currentYear && month < currentDate.getMonth() + 1)) {
            return false;
        }

        return true;
    };

    var validAmexCvcCheck = function(cvc, element) {

        if (element) {
            if (this.optional(element)) {
                return true;
            }
        }
        if (undefined === cvc || '' === cvc) {
            return true;
        }

        var selectedCardType = $('input[name=\'pas_cctype\']').val();

        if (undefined === selectedCardType) {
            return false;
        }
        if (selectedCardType.toLowerCase() === 'amex' && cvc.length !== 4) {
            return false;
        }

        return true;
    };

    var validNonAmexCvcCheck = function(cvc, element) {

        if (element) {
            if (this.optional(element)) {
                return true;
            }
        }
        if (undefined === cvc || '' === cvc) {
            return true;
        }

        var selectedCardType = $('input[name=\'pas_cctype\']').val();

        if (undefined === selectedCardType) {
            return false;
        }
        if (selectedCardType.toLowerCase() !== 'amex' && cvc.length !== 3) {
            return false;
        }

        return true;
    };

    var validCardNumberCheck = function(cardNumber, element) {

        if (element) {
            if (this.optional(element)) {
                return true;
            }
        }

        if (!/^\d+$/.test(cardNumber.replace(/\s/g, ''))) {
            return false;
        }

        return true;
    };

    var validIssueNumberCheck = function(issuenumber, element) {

        if (element) {
            if (this.optional(element)) {
                return true;
            }
        }

        var selectedCardType = $('input[name=\'pas_cctype\']').val();

        if (undefined === selectedCardType) {
            return false;
        }
        if (selectedCardType === 'switch' && !/^\d{0,2}$/.test(issuenumber)) {
            return false;
        }

        return true;
    };

    var validCardName = function(cardName, element) {

        if (element) {
            if (this.optional(element)) {
                return true;
            }
        }

        var cardName = $(element).val();
        var pattern = new RegExp(hpp.validCardNameString);

        if (pattern.test(cardName)) {
            return true;
        }

        return false;
    };

    jQuery.validator.addMethod('luhn', passesLuhnCheck,
            Hpp.i18n.messages.pleaseentervalidcreditcardnumber);
    jQuery.validator.addMethod('validexpirydate', validExpiryDateCheck,
            Hpp.i18n.messages.pleaseentervalidmonthyear);
    jQuery.validator.addMethod('validamexcvc', validAmexCvcCheck,
            Hpp.i18n.messages.pleaseentervalidamexcvc);
    jQuery.validator.addMethod('validnonamexcvc', validNonAmexCvcCheck,
            Hpp.i18n.messages.pleaseentervalidnonamexcvc);

    jQuery.validator.addMethod('validissuenumber', validIssueNumberCheck,
            Hpp.i18n.messages.pleaseentervalidissuenumber);
    jQuery.validator.addMethod('validCardName', validCardName,
            Hpp.i18n.messages.validCardName);

    jQuery.validator.addMethod('validcardnumber', validCardNumberCheck,
            Hpp.i18n.messages.validNumber);

    var oldCardNum;

    var handleGetCardType = function(event) {
        // fix for ie not able to handle keyup and change events together
        var form = $('#' + attributes.form_name);
        var newCardNum = $(form).find('#pas_ccnum').val();
        if (oldCardNum != undefined && oldCardNum == newCardNum) {
            return;
        }
        oldCardNum = newCardNum;

        // determine the card type based on card ranges
        var derived_data = determine_card_type_from_card_range();
        if (derived_data) {
            handle_card_lookup_callback(derived_data);
        }

        cardIdentified = false;
        var formValid = $(event.target).valid();

        var form = $('#' + attributes.form_name);
        joinExpiry(form);

        var formCopy = form.clone();
        removeSpaces(formCopy);

        var serialisedData = formCopy.serialize();
        var tryCount = 0;

        if (formValid === true) {
            $('#card-loader').removeClass('rxp-hidden');
            $
                    .ajax({
                        url : attributes.card_identification_url,
                        type : 'POST',
                        data : serialisedData,
                        timeout : hpp.shouldOfferDCC ? attributes.ajaxTimeoutLong
                                : attributes.ajaxTimeoutShort,
                        tryCount : 0,
                        retryLimit : attributes.ajaxRetryLimit,
                        success : handle_card_lookup_callback,
                        error : function(request, status, error) {
                            if (status === 'timeout'
                                    && this.tryCount < this.retryLimit) {
                                this.tryCount++;
                                // try again
                                $.ajax(this);
                                return;
                            } else {
                                $('#card-loader').addClass('rxp-hidden');
                            }
                        }

                    });
        } else {
            reset_selected_card_type();
        }

    };

    var determine_card_type_from_card_range = function() {

        var pas_ccnum = $('input[name=\'pas_ccnum\']').val();

        // check if it passes luhn check first
        if (passesLuhnCheck(pas_ccnum) === false) {
            return;
        }

        var firstDigit = parseInt(pas_ccnum.charAt(0), 10);
        var firstTwoDigits = parseInt(pas_ccnum.substring(0, 2), 10);

        var cardtype = null;

        if (firstDigit === 4) {
            cardtype = 'VISA';
        } else if (firstTwoDigits >= 51 && firstTwoDigits <= 55) {
            cardtype = 'MC';
        } else if (firstTwoDigits === 34 || firstTwoDigits === 37) {
            cardtype = 'AMEX';
        } else if (firstTwoDigits === 30 || firstTwoDigits === 36
                || firstTwoDigits === 38 || firstTwoDigits === 39
                || firstTwoDigits === 60 || firstTwoDigits === 64
                || firstTwoDigits === 65) {
            cardtype = 'DINERS';
        } else if (firstTwoDigits === 50 || firstTwoDigits === 56
                || firstTwoDigits === 67) {
            cardtype = 'SWITCH';
        } else if (firstTwoDigits === 35) {
            cardtype = 'JCB';
        }

        if (cardtype !== null) {
            var derived_data = {
                status : 'SUCCESS',
                data : {
                    cardIdentity : {
                        cardtype : cardtype
                    }
                }
            };
        }
        return derived_data;
    };

    var updateMDforACS_callback = function(data) {
        if (undefined === data.data) {
            show_error_message(Hpp.i18n.messages.authfailed, true);
            return;
        }

        var encryptMD = data.data.encryptMerchantData;
        $('#MD').val(encryptMD);

        if ('undefined' !== $.type(data.data.verifyEnrolledResult)) {
            var acsurl = data.data.verifyEnrolledResult.acsurl;
            var pareq = data.data.verifyEnrolledResult.pareq;
            var message = data.data.verifyEnrolledResult.message;
            var result = data.data.verifyEnrolledResult.result;
            var enrolled = data.data.verifyEnrolledResult.enrolled;
            var termUrl = window.location.href;

            $('#pas_pareq').val(pareq);
            $('#pas_acsurl').val(acsurl);
            $('#pas_termurlId').val(termUrl);

            $('#verifyMessageId').val(message);
            $('#verifyResultId').val(result);
            $('#verifyEnrolledId').val(enrolled);

            $('#PaReq').val(pareq);
            $('#acsurl').val(acsurl);
            $('#TermUrl').val(termUrl);
        }

        var acsURL = $('#pas_acsurl').val();
        var enrolled = $('#verifyEnrolledId').val();
        var result = $('#verifyResultId').val();

        if (!window.location.origin) {
            window.location.origin = window.location.protocol + '//'
                    + window.location.host;
        }

        termurl = window.location.origin + attributes.acs_url_threeDSecure;
        $('#TermUrl').val(termurl);

        if (!isNullOrTrimWhiteSpace(result) && result === '00'
                && !isNullOrTrimWhiteSpace(acsURL)
                && !isNullOrTrimWhiteSpace(enrolled) && enrolled === 'Y') {
            $('#acsUrlForm').attr('action', acsURL);
            $('#acsUrlForm').get(0).setAttribute('action', acsURL);
            // post to iFrame to resize for 3DS
            if ((isLightbox ||  $('#hpp_post_dimensions').length) && data) {
                resizeIFrame(data);
            }
            $('#acsUrlForm').get(0).submit();
        } else if (data.status != '00') {

            var container = $('.' + attributes.container_name);
            container.fadeOut(500, function() {
                $('#result-message').html(data.message);
                $('#result-message').addClass('error');
                $('#success-pane').fadeIn();
            });

        }

    };

    var resizeIFrame = function(data) {
        var iframeData = {};
        iframeData.iframe = {};
        iframeData.iframe.width = data.data.iframeWidth;
        iframeData.iframe.height = data.data.iframeHeight;
        // IE doesnt allow to post objects
        window.parent.postMessage(JSON.stringify(iframeData),
                data.data.originUrl);
    };

    var show_error_message = function(error_message, fill_div) {
        if (fill_div === undefined) {
            fill_div = false;
        }

        if (fill_div === true) {
            var form = $('#' + attributes.form_name);
            if (undefined !== form) {
                form.fadeOut(500);
            }
            var result_message = $('#result-message');
            if (undefined !== result_message) {
                result_message.fadeOut(500);
            }
        }
        $('#error-message').html(error_message);
        var error_pane = $('#error-message-pane');
        error_pane.fadeIn(1000);
    };

    var hide_error_message = function(fill_div) {
        if (fill_div === true) {
            var form = $('#' + attributes.form_name);
            if (undefined !== form) {
                form.fadeIn(500);
            }
            var result_message = $('#result-message');
            if (undefined !== result_message) {
                result_message.fadeIn(500);
            }
        }

        var error_pane = $('#error-message-pane');
        error_pane.fadeOut(500);

    };

    var reset_selected_card_type = function() {
        $('input[name=\'pas_cctype\']').val();

        var cards = $('.rxp-allowed-cards');
        cards.find('img').each(function(index, element) {
            $(element).removeClass('rxp-highlight');
            $(element).removeClass('rxp-fade');
        });
    };

    var handle_card_lookup_callback = function(data) {
        $('#card-errors').html('');
        var validCardReturned = false;
        $('#issue-number-pane').fadeOut(500);
        if (data.status === 'SUCCESS') {
            $('#card-loader').addClass('rxp-hidden');
            cardIdentified = true;
            var selectedCardType = data.data.cardIdentity.cardtype;

            if (undefined === selectedCardType || selectedCardType === null) {
                show_error_message('Unable to identify card');
                return false;
            }
            selectedCardType = selectedCardType.toLowerCase();
            if (undefined === selectedCardType) {
                $('#'.attributes.form_name).attr('disabled', true);
                $('#card-errors').html(
                        Hpp.i18n.messages.erroridentifycardfailed);
                cardIdentified = false;
            } else {
                var validCard = $.inArray(selectedCardType.toUpperCase(),
                        hpp.allowableCards);

                // Switch card from Switch to MC if merchant is configured for
                // MC but not switch
                if (validCard < 0 && selectedCardType.toUpperCase() == 'SWITCH') {
                    var mcAllowed = $.inArray('MC', hpp.allowableCards);
                    if (mcAllowed >= 0) {

                        selectedCardType = 'mc';
                        validCard = 1;

                    }
                }

                if (validCard < 0) {
                    $('#card-errors').html(
                            Hpp.i18n.messages.merchantnotenabledcard);
                } else {
                    hide_error_message(false);
                    $('#card-errors').html('');
                    validCardReturned = true;
                }
            }

            var cards = $('.rxp-allowed-cards');

            cards.find('img:not([id=\'' + selectedCardType + '-logo\'])').each(
                    function(index, element) {
                        $(element).addClass('rxp-fade');
                        $(element).removeClass('rxp-highlight');
                    });

            cards.find('img[id=\'card-loader\']').removeClass('rxp-fade');

            cards.find('img[id=\'' + selectedCardType + '-logo\']').removeClass(
                    'rxp-fade');
            cards.find('img[id=\'' + selectedCardType + '-logo\']').addClass(
                    'rxp-highlight');
            if (validCardReturned === true) {
                $('input[name=\'pas_cctype\']').val(
                        selectedCardType.toUpperCase());
            }
            if ('switch' === selectedCardType && validCardReturned === true) {
                $('#issue-number-pane').fadeIn(500);
            }

            if ('undefined' !== $.type(data.data.verifyEnrolledResult)) {
                var enrolled = data.data.verifyEnrolledResult.enrolled;
                if (enrolled !== null && enrolled === 'Y') {
                    $('.rxp-btn-info').removeClass('rxp-hidden');
                    $('#rxp-primary-btn').val(
                            Hpp.i18n.messages.proceedtoverification);
                } else {
                    $('.rxp-btn-info').addClass('rxp-hidden');
                    $('#rxp-primary-btn').val(Hpp.i18n.messages.paynow);
                }
            } else {
                $('.rxp-btn-info').addClass('rxp-hidden');
                $('#rxp-primary-btn').val(Hpp.i18n.messages.paynow);
            }

            if ('undefined' !== $.type(data.data.dccRate)
                    && 'undefined' !== $.type(data.data.dccRate_encrypted)) {
                add_dcc_section(data.data.dccRate, data.data.dccRate_encrypted,
                        data.data.cardIdentity);
            } else {
                remove_dcc_section();
            }

            if ('undefined' !== $.type(data.data.dcc105)) {
                $('#' + attributes.form_name).find(':input[name=dcc105]').val(
                        data.data.dcc105);
            }

        } else {

            reset_selected_card_type();

            var message = Hpp.i18n.messages.erroridentifycardfailed;
            if (data.data && data.data.cannotIdentifyCardType) {
                message = Hpp.i18n.messages.merchantnotenabledcard;
            }

            $('#card-errors').html(message);
            $('#card-loader').addClass('rxp-hidden');
        }
    };

    var isNullOrTrimWhiteSpace = function(value) {
        return !value || /^\s*$/.test(value);
    };

    var addCardNumberSpace = function(event) {
        var numspace = /[0-9 ]+/.test($(this).val());
        if ((event.keyCode >= 96 && event.keyCode <= 105 && numspace)
                || (event.keyCode >= 48 && event.keyCode <= 57 && numspace)) {
            var foo = $(this).val().split(' ').join('');
            if (foo.length > 0) {
                foo = foo.match(new RegExp('.{1,4}', 'g')).join(' ');
            }
            $(this).val(foo);
        }
    };

    // fix for ie not able to handle keyup and change events together .. using
    // blur
    $('#pas_ccnum').keyup(addCardNumberSpace).blur(handleGetCardType);

    return {};

};