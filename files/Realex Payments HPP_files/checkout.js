
 
/**
 * 
 */
var RealexCheckout = {
		
		placeholder: null,
		form: null,
		jquery: null,
		stage:null,
		dcc:false,
		dcc_currencies : {},
		card_form: null,
		base_currency: '',
		dcc_enabled: true,
		amount: 0,
		
		
		/**
		 * 
		 */
		init : function(placeholder, attributes) {
			
			RealexCheckout.include_jquery(placeholder);
			Realex.init();
			
			for(att in attributes) {
				RealexCheckout[att] = attributes[att];
			}
			
		},
		
		/**
		 * 
		 * @param placeHolder
		 */
		checkout : function(placeHolder) {
			
			
			if(!placeHolder) {
				placeHolder = "realex-payment-form";
			}
			
			var holderElement = document.getElementById(placeHolder);
			holderElement.setAttribute("class", placeHolder);
			RealexCheckout.placeholder = holderElement;
			RealexCheckout.apply_css();
			
			RealexCheckout.build_card_form();
		},
		
		/**
		 * 
		 */
		build_card_form : function() {
			
			
			var holderElement = RealexCheckout.placeholder;
			var cardNumberField = RealexCheckout.build_form_field("input", {id: "realex-cc-number", name:"realex-cc-number", 'class':"realex-cc-number", required:true});
			var cardNameField = RealexCheckout.build_form_field("input", {id: "realex-cc-name", name:"realex-cc-name", required:true});
			var cardCvvField = RealexCheckout.build_form_field("input", {id: "realex-cc-cvv", name:"realex-cc-cvv", size:3, required:true});
			var expiryField = RealexCheckout.build_form_field("input", {id: "realex-cc-expiry", name:"realex-cc-expiry", size:3, required:true});
			
			var submitBtn = RealexCheckout.build_form_field("input", {id: "btn", name:"btn", value:"Pay Now", type:"submit", required:true});
			
			
			var cardForm = RealexCheckout.build_form_field("form", {'class':"realex-form", action:"#cardSubmitted", method:"POST", id:"realex-form"});
			RealexCheckout.jquery(cardForm).submit(RealexCheckout.handle_submit);
			RealexCheckout.card_form = cardForm;
			
			RealexCheckout.build_form_row("Credit Card Number", cardNumberField, cardForm);
			
			RealexCheckout.build_form_row("Name", cardNameField, cardForm);
			RealexCheckout.build_form_row("Cvv", cardCvvField, cardForm);
			RealexCheckout.build_form_row("Expiry", expiryField, cardForm);
			RealexCheckout.jquery(cardForm).append("<div id='realex-dcc-holder'></div>");
			
			//
			RealexCheckout.build_form_row(null, submitBtn, cardForm);
			RealexCheckout.form = cardForm;
			holderElement.appendChild(cardForm);
			if(RealexCheckout.dcc_enabled) {
				RealexCheckout.jquery(cardNumberField).change(RealexCheckout.handle_check_for_dcc);
			}
			
		},
		
		
		
		/**
		 * 
		 * @param labelText
		 * @param field
		 * @param parent
		 */
		build_form_row : function(labelText, field, parent) {
			var row = document.createElement("div");
			if(labelText) {
				var label = document.createElement("label");
				//label.setAttribute("for", field.attributes.id);
				var t = document.createTextNode(labelText);
				label.appendChild(t);
				
				row.appendChild(label);
			}
			row.appendChild(field);
			parent.appendChild(row);
			
		},
		
		/**
		 * 
		 * @param type
		 * @param attributes
		 * @returns
		 */
		build_form_field : function(type, attributes) {
			var f = document.createElement(type);
			for(var prop in attributes) {
				//console.log(prop +" = "+attributes[prop]);
				f.setAttribute(prop, attributes[prop]);
			}
			
			return f;
		},
		
		
		
		
		/**
		 * 
		 */
		apply_css : function() {
			var $ = document;
			var head  = $.getElementsByTagName('head')[0];
		    var link  = $.createElement('link');
		    //link.id   = cssId;
		    link.rel  = 'stylesheet';
		    link.type = 'text/css';
		    link.href = 'resources/css/checkout.css';
		    link.media = 'screen/projector';
		    head.appendChild(link);
		    //console.log(document.styleSheets);
		},
		
		/**
		 * 
		 * @param placeholder
		 */
		include_jquery:function(placeholder) {
			var head  = document.getElementsByTagName("body")[0];
		    var script  = document.createElement("script");
		    
		    script.src  = "http://code.jquery.com/jquery-1.9.1.min.js";
		    script.type = "text/javascript";
		    script.id= "tettss";
		    //script.load(function() {alert("ssaf");});
		    
		    head.appendChild(script);
		    
		    RealexCheckout.wait_for_js_load(placeholder);
		},
		
		/**
		 * 
		 * @param placeholder
		 */
		wait_for_js_load:function(placeholder) {
			
			if(typeof $ == 'undefined') {
		    	setTimeout(RealexCheckout.wait_for_js_load, 500); 
		    } else {
		    	RealexCheckout.jquery = $;
		    	$ = $.noConflict();
		    	//console.log(RealexCheckout.jquery().jquery);
		    	RealexCheckout.checkout(placeholder);
		    }
			
		},
		
		/**
		 * 
		 */
		append_dcc_fields:function() {
			var dcc = RealexCheckout.jquery("#realex-dcc-holder");
			dcc.html("I understand that I have been offered a choice of currencies for payment.<br>I accept the conversion rate and final amount and that the final selected transaction currency is <#CARDHOLDERCURRENCY#> <#CARDHOLDERCURRENCYSYMBOL#> <br>I understand that my choice is final.");
			
			//var currency = RealexCheckout.build_form_field("span", {});
			
			//dcc.append(currency);
			//for(currencyCode in RealexCheckout.currencies) {
				var currencyCodeField = RealexCheckout.build_form_field("input", {type:"radio", name:"realex-dcc-currency", value:RealexCheckout.base_currency});
				RealexCheckout.build_form_row(RealexCheckout.base_currency +" - "+RealexCheckout.amount, currencyCodeField, dcc.get(0));
			//}
			
			for(currencyCode in RealexCheckout.dcc_currencies) {
				var currencyCodeField = RealexCheckout.build_form_field("input", {type:"radio", name:"realex-dcc-currency", value:currencyCode});
				RealexCheckout.build_form_row(currencyCode +" - "+RealexCheckout.dcc_currencies[currencyCode], currencyCodeField, dcc.get(0));
			}
			
			//RealexCheckout.build_form_row("Currency", currency, dcc.get(0));
		},
		
		/**
		 * 
		 */
		handle_check_for_dcc: function() {
			//console.log("sssss");
			RealexCheckout.jquery("#realex-dcc-holder").children().each(function(){
				//console.log(this);
				RealexCheckout.jquery(this).remove();
			});
			RealexCheckout.jquery("#realex-dcc-holder").html("");
			
			
			RealexCheckout.jquery.ajax({
				url:"/js/api/dcc",
				type: "POST",
				data:{},
				//done:RealexCheckout.handle_dcc_callback,
				success:RealexCheckout.handle_dcc_callback,
				failure:function(){
					alert("Failed to check DCC");
				}
			});
			//if(RealexCheckout.dcc == false || RealexCheckout.dcc == null) {
				//RealexCheckout.dcc = true;
				//RealexCheckout.handle_dcc_callback();
			//}
			
		},
		
		/**
		 * 
		 * @param data
		 */
		handle_dcc_callback:function(data) {
			//console.log(data);
			if(data.data.dcc) {
				RealexCheckout.dcc = true;
				
				//var cur = RealexCheckout.currencies;
				RealexCheckout.dcc_currencies[data.data.dcc.cardCurrency] = data.data.dcc.amount;
			} else {
				RealexCheckout.dcc = false;
				RealexCheckout.dcc_currencies = {};
			}
			if(RealexCheckout.dcc == true) {
				//$(RealexCheckout.card_form).hide();
				RealexCheckout.append_dcc_fields();
			}
		},
		
		/**
		 * 
		 * @param event
		 */
		handle_submit:function(event) {
			event.preventDefault();
			
			RealexCheckout.jquery.ajax({
				url:"/js/api/auth",
				data:{},
				success:RealexCheckout.handle_submit_callback,
				failure:function(){
					alert("failed to submit form");
				},
				error:function(){
					alert("failed to submit form");
				}
			});
			
			
		},
		
		/**
		 * 
		 * @param data
		 */
		handle_submit_callback:function(data){
			
		}
};