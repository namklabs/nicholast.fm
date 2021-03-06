/**
 * Last.fm API Module
 * by: Nicholas Ness
 *
 *	------------------------
 * Many thanks to fxb's Javascript last.fm API Library,
 * which was the main influence for this one.
 *	https://github.com/fxb/javascript-last.fm-api
 *
 * Also,
 * Many thanks to John K. Paul's jQuery Ajax Retry plugin,
 * which is how I handle retrying failed ajax requests.
 *	https://github.com/johnkpaul/jquery-ajax-retry
 */

/*

Examples of usage:

LastFM initialization:
---------------
LastFM({
	api_key: '',

	callbacks: { -- This is completely optional
		done: function( data, textStatus, jqXHR ) { },
		fail: function( jqXHR, textStatus, errorThrown ) { },
		always: function( data|jqXHR, textStatus, jqXHR|errorThrown ) { }
	}
});

The only required option is an api_key
These callbacks are called for every API Request are completely optional

The passed in object is the settings for every jQuery ajax call
A full list of options is available at: http://api.jquery.com/jQuery.ajax/



Making an API Request and having it callback a function:
------------------------------------------
LastFM('user.getRecentTracks', {
	user: username,
	limit: '200',
	page: 1,
	to: toDate,
	from: fromDate
}).done(function ( data ) {
	// do stuff with data
	console.log( data );
});

An API Request returns a jqXHR Object (jQuery's Promise Object)
For more information and help with them go here:
	http://api.jquery.com/jQuery.ajax/#jqXHR

*/

var LastFM = (function( $ ) {

	"use strict";

	var
		// extra parameters needed for api requests
		data = {
			//api_key: '',
			//api_secret: '',
			format: 'json'
		},

		// defaults for jQuery's ajax settings
		defaults = {

			// Last.fm's api v2.0 url
			url: 'https://ws.audioscrobbler.com/2.0/',

			// make all api requests have a javascript callback
			dataType: 'jsonp',

			// default a request's timeout period to 10 seconds
			timeout: 10000
		},

		// jQuery ajax settings
		ajaxSettings = {},

		// callbacks that are called for every api request
		callbacks = {};


	// Init function
	function init( options ) {

		// setup jQuery's ajax settings
		$.extend( ajaxSettings, defaults, options );

		// setup the api key
		data.api_key = options.api_key || data.api_key;

		// setup any callbacks
		$.extend( callbacks, options.callbacks );
	}


	// simple helper function for api requests
	function makeRequest( settings, retries, resolve, reject ) {

		$.ajax( settings )

			// filter successful requests checking for last.fm errors,
			// so, if a request fails, call retry the ajax call
			.then( checkError( retries ), retry( retries ) )

			// successful api request, call the resolve callback
			// if there was a request error, call the reject callback
			.then( resolve, reject );

	}


	// API Request function
	function apiRequest( method, params, cache ) {

		var callback,

			// local scope settings for async makeRequest calls
			settings = $.extend( {}, ajaxSettings ),

			// create a deferred promise
			deferred = $.Deferred(),
			promise = deferred.promise();

		// api request parameters
		params.method = method;
		$.extend( params, data );

		// jQuery's ajax settings
		settings.data = params;
		settings.cache = cache;

		// make the api request
		makeRequest( settings, 3, deferred.resolve, deferred.reject );

		// add any callbacks to the promise
		for ( callback in callbacks ) {
			promise[ callback ]( callbacks[ callback ] );
		}

		// return the promise
		return promise;
	}


	// Checks for Last.fm errors, filters "successful" requests and retries them a couple seconds later
	function checkError( retries ) {

		return function ( data, status, jqXHR ) {

			// create a new deferred object and filter the previous ajax request with this one
			var output = $.Deferred(),

				settings = this;

			// if the Rate Limit was exceeded or there was an error fetching the tracks, retry the call in 2 seconds
			if ( data.error == 29 || data.error == 8 ) {

				setTimeout( function () {
					makeRequest( settings, 3, output.resolve, output.reject );
				}, 2000 );

			// if there was a last.fm error fail the promise
			} else if ( data.error ) {
				output.reject( jqXHR, status, data );

			// else if there are wasn't an error, resolve the new deferred object
			} else {
				output.resolve( data, status, jqXHR );
			}

			// return the new deferred object
			return output;
		};
	}


	// Retry function
	function retry( retries ) {

		// fail filter function, returns a new deferred object
		return function ( jqXHR, status, data ) {

			// create a new deferred object and filter the previous ajax request with this one
			var output = $.Deferred();

			// decrement the amount of retries that remain
			// and if there are still retries remaining, don't fail the promise, just retry the ajax call
			if ( --retries ) {

				// if it was a timeout, increase the timeout time by 20 seconds
				if ( status == 'timeout' ) {
					this.timeout += 20000;
				}

				// retry the ajax call
				makeRequest( this, retries, output.resolve, output.reject );

			// else if there are no retries left, fail the new deferred object
			} else {
				output.reject( jqXHR, status, data );
			}

			// return the new deferred object
			return output;
		};
	}


	// Main class definition
	return function( options, params, cache ) {

		// the first parameter is a string we know its an api request
		if ( typeof options == 'string' ) {
			return apiRequest( options, params, cache );
		}

		// else its an object and setting up some options
		init( options );
	};

})( window.jQuery );
