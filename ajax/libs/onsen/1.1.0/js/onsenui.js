/*! onsenui - v1.1.0 - 2014-07-23 */
/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
 
  // The base Class implementation (does nothing)
  this.Class = function(){};
 
  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
    var _super = this.prototype;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);        
            this._super = tmp;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    function Class() {
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
   
    // Populate our constructed prototype object
    Class.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;
 
    // And make this class extendable
    Class.extend = arguments.callee;
   
    return Class;
  };
})();
/**
 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
 *
 * @version 1.0.0
 * @codingstandard ftlabs-jsv2
 * @copyright The Financial Times Limited [All Rights Reserved]
 * @license MIT License (see LICENSE.txt)
 */

/*jslint browser:true, node:true*/
/*global define, Event, Node*/


/**
 * Instantiate fast-clicking listeners on the specificed layer.
 *
 * @constructor
 * @param {Element} layer The layer to listen on
 */
function FastClick(layer) {
	'use strict';
	var oldOnClick;


	/**
	 * Whether a click is currently being tracked.
	 *
	 * @type boolean
	 */
	this.trackingClick = false;


	/**
	 * Timestamp for when when click tracking started.
	 *
	 * @type number
	 */
	this.trackingClickStart = 0;


	/**
	 * The element being tracked for a click.
	 *
	 * @type EventTarget
	 */
	this.targetElement = null;


	/**
	 * X-coordinate of touch start event.
	 *
	 * @type number
	 */
	this.touchStartX = 0;


	/**
	 * Y-coordinate of touch start event.
	 *
	 * @type number
	 */
	this.touchStartY = 0;


	/**
	 * ID of the last touch, retrieved from Touch.identifier.
	 *
	 * @type number
	 */
	this.lastTouchIdentifier = 0;


	/**
	 * Touchmove boundary, beyond which a click will be cancelled.
	 *
	 * @type number
	 */
	this.touchBoundary = 10;


	/**
	 * The FastClick layer.
	 *
	 * @type Element
	 */
	this.layer = layer;

	if (FastClick.notNeeded(layer)) {
		return;
	}

	// Some old versions of Android don't have Function.prototype.bind
	function bind(method, context) {
		return function() { return method.apply(context, arguments); };
	}

	// Set up event handlers as required
	if (deviceIsAndroid) {
		layer.addEventListener('mouseover', bind(this.onMouse, this), true);
		layer.addEventListener('mousedown', bind(this.onMouse, this), true);
		layer.addEventListener('mouseup', bind(this.onMouse, this), true);
	}

	layer.addEventListener('click', bind(this.onClick, this), true);
	layer.addEventListener('touchstart', bind(this.onTouchStart, this), false);
	layer.addEventListener('touchmove', bind(this.onTouchMove, this), false);
	layer.addEventListener('touchend', bind(this.onTouchEnd, this), false);
	layer.addEventListener('touchcancel', bind(this.onTouchCancel, this), false);

	// Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
	// which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
	// layer when they are cancelled.
	if (!Event.prototype.stopImmediatePropagation) {
		layer.removeEventListener = function(type, callback, capture) {
			var rmv = Node.prototype.removeEventListener;
			if (type === 'click') {
				rmv.call(layer, type, callback.hijacked || callback, capture);
			} else {
				rmv.call(layer, type, callback, capture);
			}
		};

		layer.addEventListener = function(type, callback, capture) {
			var adv = Node.prototype.addEventListener;
			if (type === 'click') {
				adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
					if (!event.propagationStopped) {
						callback(event);
					}
				}), capture);
			} else {
				adv.call(layer, type, callback, capture);
			}
		};
	}

	// If a handler is already declared in the element's onclick attribute, it will be fired before
	// FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
	// adding it as listener.
	if (typeof layer.onclick === 'function') {

		// Android browser on at least 3.2 requires a new reference to the function in layer.onclick
		// - the old one won't work if passed to addEventListener directly.
		oldOnClick = layer.onclick;
		layer.addEventListener('click', function(event) {
			oldOnClick(event);
		}, false);
		layer.onclick = null;
	}
}


/**
 * Android requires exceptions.
 *
 * @type boolean
 */
var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0;


/**
 * iOS requires exceptions.
 *
 * @type boolean
 */
var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent);


/**
 * iOS 4 requires an exception for select elements.
 *
 * @type boolean
 */
var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


/**
 * iOS 6.0(+?) requires the target element to be manually derived
 *
 * @type boolean
 */
var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS ([6-9]|\d{2})_\d/).test(navigator.userAgent);


/**
 * Determine whether a given element requires a native click.
 *
 * @param {EventTarget|Element} target Target DOM element
 * @returns {boolean} Returns true if the element needs a native click
 */
FastClick.prototype.needsClick = function(target) {
	'use strict';
	switch (target.nodeName.toLowerCase()) {

	// Don't send a synthetic click to disabled inputs (issue #62)
	case 'button':
	case 'select':
	case 'textarea':
		if (target.disabled) {
			return true;
		}

		break;
	case 'input':

		// File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
		if ((deviceIsIOS && target.type === 'file') || target.disabled) {
			return true;
		}

		break;
	case 'label':
	case 'video':
		return true;
	}

	return (/\bneedsclick\b/).test(target.className);
};


/**
 * Determine whether a given element requires a call to focus to simulate click into element.
 *
 * @param {EventTarget|Element} target Target DOM element
 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
 */
FastClick.prototype.needsFocus = function(target) {
	'use strict';
	switch (target.nodeName.toLowerCase()) {
	case 'textarea':
		return true;
	case 'select':
		return !deviceIsAndroid;
	case 'input':
		switch (target.type) {
		case 'button':
		case 'checkbox':
		case 'file':
		case 'image':
		case 'radio':
		case 'submit':
			return false;
		}

		// No point in attempting to focus disabled inputs
		return !target.disabled && !target.readOnly;
	default:
		return (/\bneedsfocus\b/).test(target.className);
	}
};


/**
 * Send a click event to the specified element.
 *
 * @param {EventTarget|Element} targetElement
 * @param {Event} event
 */
FastClick.prototype.sendClick = function(targetElement, event) {
	'use strict';
	var clickEvent, touch;

	// On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
	if (document.activeElement && document.activeElement !== targetElement) {
		document.activeElement.blur();
	}

	touch = event.changedTouches[0];

	// Synthesise a click event, with an extra attribute so it can be tracked
	clickEvent = document.createEvent('MouseEvents');
	clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
	clickEvent.forwardedTouchEvent = true;
	targetElement.dispatchEvent(clickEvent);
};

FastClick.prototype.determineEventType = function(targetElement) {
	'use strict';

	//Issue #159: Android Chrome Select Box does not open with a synthetic click event
	if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
		return 'mousedown';
	}

	return 'click';
};


/**
 * @param {EventTarget|Element} targetElement
 */
FastClick.prototype.focus = function(targetElement) {
	'use strict';
	var length;

	// Issue #160: on iOS 7, some input elements (e.g. date datetime) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
	if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time') {
		length = targetElement.value.length;
		targetElement.setSelectionRange(length, length);
	} else {
		targetElement.focus();
	}
};


/**
 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
 *
 * @param {EventTarget|Element} targetElement
 */
FastClick.prototype.updateScrollParent = function(targetElement) {
	'use strict';
	var scrollParent, parentElement;

	scrollParent = targetElement.fastClickScrollParent;

	// Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
	// target element was moved to another parent.
	if (!scrollParent || !scrollParent.contains(targetElement)) {
		parentElement = targetElement;
		do {
			if (parentElement.scrollHeight > parentElement.offsetHeight) {
				scrollParent = parentElement;
				targetElement.fastClickScrollParent = parentElement;
				break;
			}

			parentElement = parentElement.parentElement;
		} while (parentElement);
	}

	// Always update the scroll top tracker if possible.
	if (scrollParent) {
		scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
	}
};


/**
 * @param {EventTarget} targetElement
 * @returns {Element|EventTarget}
 */
FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {
	'use strict';

	// On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
	if (eventTarget.nodeType === Node.TEXT_NODE) {
		return eventTarget.parentNode;
	}

	return eventTarget;
};


/**
 * On touch start, record the position and scroll offset.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchStart = function(event) {
	'use strict';
	var targetElement, touch, selection;

	// Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
	if (event.targetTouches.length > 1) {
		return true;
	}

	targetElement = this.getTargetElementFromEventTarget(event.target);
	touch = event.targetTouches[0];

	if (deviceIsIOS) {

		// Only trusted events will deselect text on iOS (issue #49)
		selection = window.getSelection();
		if (selection.rangeCount && !selection.isCollapsed) {
			return true;
		}

		if (!deviceIsIOS4) {

			// Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
			// when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
			// with the same identifier as the touch event that previously triggered the click that triggered the alert.
			// Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
			// immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
			if (touch.identifier === this.lastTouchIdentifier) {
				event.preventDefault();
				return false;
			}

			this.lastTouchIdentifier = touch.identifier;

			// If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
			// 1) the user does a fling scroll on the scrollable layer
			// 2) the user stops the fling scroll with another tap
			// then the event.target of the last 'touchend' event will be the element that was under the user's finger
			// when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
			// is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
			this.updateScrollParent(targetElement);
		}
	}

	this.trackingClick = true;
	this.trackingClickStart = event.timeStamp;
	this.targetElement = targetElement;

	this.touchStartX = touch.pageX;
	this.touchStartY = touch.pageY;

	// Prevent phantom clicks on fast double-tap (issue #36)
	if ((event.timeStamp - this.lastClickTime) < 200) {
		event.preventDefault();
	}

	return true;
};


/**
 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.touchHasMoved = function(event) {
	'use strict';
	var touch = event.changedTouches[0], boundary = this.touchBoundary;

	if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
		return true;
	}

	return false;
};


/**
 * Update the last position.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchMove = function(event) {
	'use strict';
	if (!this.trackingClick) {
		return true;
	}

	// If the touch has moved, cancel the click tracking
	if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
		this.trackingClick = false;
		this.targetElement = null;
	}

	return true;
};


/**
 * Attempt to find the labelled control for the given label element.
 *
 * @param {EventTarget|HTMLLabelElement} labelElement
 * @returns {Element|null}
 */
FastClick.prototype.findControl = function(labelElement) {
	'use strict';

	// Fast path for newer browsers supporting the HTML5 control attribute
	if (labelElement.control !== undefined) {
		return labelElement.control;
	}

	// All browsers under test that support touch events also support the HTML5 htmlFor attribute
	if (labelElement.htmlFor) {
		return document.getElementById(labelElement.htmlFor);
	}

	// If no for attribute exists, attempt to retrieve the first labellable descendant element
	// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
	return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
};


/**
 * On touch end, determine whether to send a click event at once.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchEnd = function(event) {
	'use strict';
	var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

	if (!this.trackingClick) {
		return true;
	}

	// Prevent phantom clicks on fast double-tap (issue #36)
	if ((event.timeStamp - this.lastClickTime) < 200) {
		this.cancelNextClick = true;
		return true;
	}

	// Reset to prevent wrong click cancel on input (issue #156).
	this.cancelNextClick = false;

	this.lastClickTime = event.timeStamp;

	trackingClickStart = this.trackingClickStart;
	this.trackingClick = false;
	this.trackingClickStart = 0;

	// On some iOS devices, the targetElement supplied with the event is invalid if the layer
	// is performing a transition or scroll, and has to be re-detected manually. Note that
	// for this to function correctly, it must be called *after* the event target is checked!
	// See issue #57; also filed as rdar://13048589 .
	if (deviceIsIOSWithBadTarget) {
		touch = event.changedTouches[0];

		// In certain cases arguments of elementFromPoint can be negative, so prevent setting targetElement to null
		targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
		targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
	}

	targetTagName = targetElement.tagName.toLowerCase();
	if (targetTagName === 'label') {
		forElement = this.findControl(targetElement);
		if (forElement) {
			this.focus(targetElement);
			if (deviceIsAndroid) {
				return false;
			}

			targetElement = forElement;
		}
	} else if (this.needsFocus(targetElement)) {

		// Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
		// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
		if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
			this.targetElement = null;
			return false;
		}

		this.focus(targetElement);
		this.sendClick(targetElement, event);

		// Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
		if (!deviceIsIOS4 || targetTagName !== 'select') {
			this.targetElement = null;
			event.preventDefault();
		}

		return false;
	}

	if (deviceIsIOS && !deviceIsIOS4) {

		// Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
		// and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
		scrollParent = targetElement.fastClickScrollParent;
		if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
			return true;
		}
	}

	// Prevent the actual click from going though - unless the target node is marked as requiring
	// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
	if (!this.needsClick(targetElement)) {
		event.preventDefault();
		this.sendClick(targetElement, event);
	}

	return false;
};


/**
 * On touch cancel, stop tracking the click.
 *
 * @returns {void}
 */
FastClick.prototype.onTouchCancel = function() {
	'use strict';
	this.trackingClick = false;
	this.targetElement = null;
};


/**
 * Determine mouse events which should be permitted.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onMouse = function(event) {
	'use strict';

	// If a target element was never set (because a touch event was never fired) allow the event
	if (!this.targetElement) {
		return true;
	}

	if (event.forwardedTouchEvent) {
		return true;
	}

	// Programmatically generated events targeting a specific element should be permitted
	if (!event.cancelable) {
		return true;
	}

	// Derive and check the target element to see whether the mouse event needs to be permitted;
	// unless explicitly enabled, prevent non-touch click events from triggering actions,
	// to prevent ghost/doubleclicks.
	if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

		// Prevent any user-added listeners declared on FastClick element from being fired.
		if (event.stopImmediatePropagation) {
			event.stopImmediatePropagation();
		} else {

			// Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
			event.propagationStopped = true;
		}

		// Cancel the event
		event.stopPropagation();
		event.preventDefault();

		return false;
	}

	// If the mouse event is permitted, return true for the action to go through.
	return true;
};


/**
 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
 * an actual click which should be permitted.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onClick = function(event) {
	'use strict';
	var permitted;

	// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
	if (this.trackingClick) {
		this.targetElement = null;
		this.trackingClick = false;
		return true;
	}

	// Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
	if (event.target.type === 'submit' && event.detail === 0) {
		return true;
	}

	permitted = this.onMouse(event);

	// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
	if (!permitted) {
		this.targetElement = null;
	}

	// If clicks are permitted, return true for the action to go through.
	return permitted;
};


/**
 * Remove all FastClick's event listeners.
 *
 * @returns {void}
 */
FastClick.prototype.destroy = function() {
	'use strict';
	var layer = this.layer;

	if (deviceIsAndroid) {
		layer.removeEventListener('mouseover', this.onMouse, true);
		layer.removeEventListener('mousedown', this.onMouse, true);
		layer.removeEventListener('mouseup', this.onMouse, true);
	}

	layer.removeEventListener('click', this.onClick, true);
	layer.removeEventListener('touchstart', this.onTouchStart, false);
	layer.removeEventListener('touchmove', this.onTouchMove, false);
	layer.removeEventListener('touchend', this.onTouchEnd, false);
	layer.removeEventListener('touchcancel', this.onTouchCancel, false);
};


/**
 * Check whether FastClick is needed.
 *
 * @param {Element} layer The layer to listen on
 */
FastClick.notNeeded = function(layer) {
	'use strict';
	var metaViewport;
	var chromeVersion;

	// Devices that don't support touch don't need FastClick
	if (typeof window.ontouchstart === 'undefined') {
		return true;
	}

	// Chrome version - zero for other browsers
	chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

	if (chromeVersion) {

		if (deviceIsAndroid) {
			metaViewport = document.querySelector('meta[name=viewport]');

			if (metaViewport) {
				// Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
				if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
					return true;
				}
				// Chrome 32 and above with width=device-width or less don't need FastClick
				if (chromeVersion > 31 && window.innerWidth <= window.screen.width) {
					return true;
				}
			}

		// Chrome desktop doesn't need FastClick (issue #15)
		} else {
			return true;
		}
	}

	// IE10 with -ms-touch-action: none, which disables double-tap-to-zoom (issue #97)
	if (layer.style.msTouchAction === 'none') {
		return true;
	}

	return false;
};


/**
 * Factory method for creating a FastClick object
 *
 * @param {Element} layer The layer to listen on
 */
FastClick.attach = function(layer) {
	'use strict';
	return new FastClick(layer);
};


if (typeof define !== 'undefined' && define.amd) {

	// AMD. Register as an anonymous module.
	define(function() {
		'use strict';
		return FastClick;
	});
} else if (typeof module !== 'undefined' && module.exports) {
	module.exports = FastClick.attach;
	module.exports.FastClick = FastClick;
} else {
	window.FastClick = FastClick;
}
/*! Hammer.JS - v1.0.6 - 2014-01-02
 * http://eightmedia.github.com/hammer.js
 *
 * Copyright (c) 2014 Jorik Tangelder <j.tangelder@gmail.com>;
 * Licensed under the MIT license */

(function(window, undefined) {
  'use strict';

  /**
   * Hammer
   * use this to create instances
   * @param   {HTMLElement}   element
   * @param   {Object}        options
   * @returns {Hammer.Instance}
   * @constructor
   */
  var Hammer = function(element, options) {
    return new Hammer.Instance(element, options || {});
  };

  // default settings
  Hammer.defaults = {
    // add styles and attributes to the element to prevent the browser from doing
    // its native behavior. this doesnt prevent the scrolling, but cancels
    // the contextmenu, tap highlighting etc
    // set to false to disable this
    stop_browser_behavior: {
      // this also triggers onselectstart=false for IE
      userSelect       : 'none',
      // this makes the element blocking in IE10 >, you could experiment with the value
      // see for more options this issue; https://github.com/EightMedia/hammer.js/issues/241
      touchAction      : 'none',
      touchCallout     : 'none',
      contentZooming   : 'none',
      userDrag         : 'none',
      tapHighlightColor: 'rgba(0,0,0,0)'
    }

    //
    // more settings are defined per gesture at gestures.js
    //
  };

  // detect touchevents
  Hammer.HAS_POINTEREVENTS = window.navigator.pointerEnabled || window.navigator.msPointerEnabled;
  Hammer.HAS_TOUCHEVENTS = ('ontouchstart' in window);

  // dont use mouseevents on mobile devices
  Hammer.MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android|silk/i;
  Hammer.NO_MOUSEEVENTS = Hammer.HAS_TOUCHEVENTS && window.navigator.userAgent.match(Hammer.MOBILE_REGEX);

  // eventtypes per touchevent (start, move, end)
  // are filled by Hammer.event.determineEventTypes on setup
  Hammer.EVENT_TYPES = {};

  // direction defines
  Hammer.DIRECTION_DOWN = 'down';
  Hammer.DIRECTION_LEFT = 'left';
  Hammer.DIRECTION_UP = 'up';
  Hammer.DIRECTION_RIGHT = 'right';

  // pointer type
  Hammer.POINTER_MOUSE = 'mouse';
  Hammer.POINTER_TOUCH = 'touch';
  Hammer.POINTER_PEN = 'pen';

  // touch event defines
  Hammer.EVENT_START = 'start';
  Hammer.EVENT_MOVE = 'move';
  Hammer.EVENT_END = 'end';

  // hammer document where the base events are added at
  Hammer.DOCUMENT = window.document;

  // plugins and gestures namespaces
  Hammer.plugins = Hammer.plugins || {};
  Hammer.gestures = Hammer.gestures || {};

  // if the window events are set...
  Hammer.READY = false;

  /**
   * setup events to detect gestures on the document
   */
  function setup() {
    if(Hammer.READY) {
      return;
    }

    // find what eventtypes we add listeners to
    Hammer.event.determineEventTypes();

    // Register all gestures inside Hammer.gestures
    Hammer.utils.each(Hammer.gestures, function(gesture){
      Hammer.detection.register(gesture);
    });

    // Add touch events on the document
    Hammer.event.onTouch(Hammer.DOCUMENT, Hammer.EVENT_MOVE, Hammer.detection.detect);
    Hammer.event.onTouch(Hammer.DOCUMENT, Hammer.EVENT_END, Hammer.detection.detect);

    // Hammer is ready...!
    Hammer.READY = true;
  }

  Hammer.utils = {
    /**
     * extend method,
     * also used for cloning when dest is an empty object
     * @param   {Object}    dest
     * @param   {Object}    src
     * @parm  {Boolean}  merge    do a merge
     * @returns {Object}    dest
     */
    extend: function extend(dest, src, merge) {
      for(var key in src) {
        if(dest[key] !== undefined && merge) {
          continue;
        }
        dest[key] = src[key];
      }
      return dest;
    },


    /**
     * for each
     * @param obj
     * @param iterator
     */
    each: function(obj, iterator, context) {
      var i, length;
      // native forEach on arrays
      if ('forEach' in obj) {
        obj.forEach(iterator, context);
      }
      // arrays
      else if(obj.length !== undefined) {
        for (i = 0, length = obj.length; i < length; i++) {
          if (iterator.call(context, obj[i], i, obj) === false) {
            return;
          }
        }
      }
      // objects
      else {
        for (i in obj) {
          if (obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj) === false) {
            return;
          }
        }
      }
    },

    /**
     * find if a node is in the given parent
     * used for event delegation tricks
     * @param   {HTMLElement}   node
     * @param   {HTMLElement}   parent
     * @returns {boolean}       has_parent
     */
    hasParent: function(node, parent) {
      while(node) {
        if(node == parent) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    },


    /**
     * get the center of all the touches
     * @param   {Array}     touches
     * @returns {Object}    center
     */
    getCenter: function getCenter(touches) {
      var valuesX = [], valuesY = [];

      Hammer.utils.each(touches, function(touch) {
        // I prefer clientX because it ignore the scrolling position
        valuesX.push(typeof touch.clientX !== 'undefined' ? touch.clientX : touch.pageX );
        valuesY.push(typeof touch.clientY !== 'undefined' ? touch.clientY : touch.pageY );
      });

      return {
        pageX: ((Math.min.apply(Math, valuesX) + Math.max.apply(Math, valuesX)) / 2),
        pageY: ((Math.min.apply(Math, valuesY) + Math.max.apply(Math, valuesY)) / 2)
      };
    },


    /**
     * calculate the velocity between two points
     * @param   {Number}    delta_time
     * @param   {Number}    delta_x
     * @param   {Number}    delta_y
     * @returns {Object}    velocity
     */
    getVelocity: function getVelocity(delta_time, delta_x, delta_y) {
      return {
        x: Math.abs(delta_x / delta_time) || 0,
        y: Math.abs(delta_y / delta_time) || 0
      };
    },


    /**
     * calculate the angle between two coordinates
     * @param   {Touch}     touch1
     * @param   {Touch}     touch2
     * @returns {Number}    angle
     */
    getAngle: function getAngle(touch1, touch2) {
      var y = touch2.pageY - touch1.pageY,
      x = touch2.pageX - touch1.pageX;
      return Math.atan2(y, x) * 180 / Math.PI;
    },


    /**
     * angle to direction define
     * @param   {Touch}     touch1
     * @param   {Touch}     touch2
     * @returns {String}    direction constant, like Hammer.DIRECTION_LEFT
     */
    getDirection: function getDirection(touch1, touch2) {
      var x = Math.abs(touch1.pageX - touch2.pageX),
      y = Math.abs(touch1.pageY - touch2.pageY);

      if(x >= y) {
        return touch1.pageX - touch2.pageX > 0 ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
      }
      else {
        return touch1.pageY - touch2.pageY > 0 ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
      }
    },


    /**
     * calculate the distance between two touches
     * @param   {Touch}     touch1
     * @param   {Touch}     touch2
     * @returns {Number}    distance
     */
    getDistance: function getDistance(touch1, touch2) {
      var x = touch2.pageX - touch1.pageX,
      y = touch2.pageY - touch1.pageY;
      return Math.sqrt((x * x) + (y * y));
    },


    /**
     * calculate the scale factor between two touchLists (fingers)
     * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
     * @param   {Array}     start
     * @param   {Array}     end
     * @returns {Number}    scale
     */
    getScale: function getScale(start, end) {
      // need two fingers...
      if(start.length >= 2 && end.length >= 2) {
        return this.getDistance(end[0], end[1]) /
          this.getDistance(start[0], start[1]);
      }
      return 1;
    },


    /**
     * calculate the rotation degrees between two touchLists (fingers)
     * @param   {Array}     start
     * @param   {Array}     end
     * @returns {Number}    rotation
     */
    getRotation: function getRotation(start, end) {
      // need two fingers
      if(start.length >= 2 && end.length >= 2) {
        return this.getAngle(end[1], end[0]) -
          this.getAngle(start[1], start[0]);
      }
      return 0;
    },


    /**
     * boolean if the direction is vertical
     * @param    {String}    direction
     * @returns  {Boolean}   is_vertical
     */
    isVertical: function isVertical(direction) {
      return (direction == Hammer.DIRECTION_UP || direction == Hammer.DIRECTION_DOWN);
    },


    /**
     * stop browser default behavior with css props
     * @param   {HtmlElement}   element
     * @param   {Object}        css_props
     */
    stopDefaultBrowserBehavior: function stopDefaultBrowserBehavior(element, css_props) {
      if(!css_props || !element || !element.style) {
        return;
      }

      // with css properties for modern browsers
      Hammer.utils.each(['webkit', 'khtml', 'moz', 'Moz', 'ms', 'o', ''], function(vendor) {
        Hammer.utils.each(css_props, function(prop) {
          // vender prefix at the property
          if(vendor) {
            prop = vendor + prop.substring(0, 1).toUpperCase() + prop.substring(1);
          }
          // set the style
          if(prop in element.style) {
            element.style[prop] = prop;
          }
        });
      });

      // also the disable onselectstart
      if(css_props.userSelect == 'none') {
        element.onselectstart = function() {
          return false;
        };
      }

      // and disable ondragstart
      if(css_props.userDrag == 'none') {
        element.ondragstart = function() {
          return false;
        };
      }
    }
  };


  /**
   * create new hammer instance
   * all methods should return the instance itself, so it is chainable.
   * @param   {HTMLElement}       element
   * @param   {Object}            [options={}]
   * @returns {Hammer.Instance}
   * @constructor
   */
  Hammer.Instance = function(element, options) {
    var self = this;

    // setup HammerJS window events and register all gestures
    // this also sets up the default options
    setup();

    this.element = element;

    // start/stop detection option
    this.enabled = true;

    // merge options
    this.options = Hammer.utils.extend(
      Hammer.utils.extend({}, Hammer.defaults),
      options || {});

      // add some css to the element to prevent the browser from doing its native behavoir
      if(this.options.stop_browser_behavior) {
        Hammer.utils.stopDefaultBrowserBehavior(this.element, this.options.stop_browser_behavior);
      }

      // start detection on touchstart
      Hammer.event.onTouch(element, Hammer.EVENT_START, function(ev) {
        if(self.enabled) {
          Hammer.detection.startDetect(self, ev);
        }
      });

      // return instance
      return this;
  };


  Hammer.Instance.prototype = {
    /**
     * bind events to the instance
     * @param   {String}      gesture
     * @param   {Function}    handler
     * @returns {Hammer.Instance}
     */
    on: function onEvent(gesture, handler) {
      var gestures = gesture.split(' ');
      Hammer.utils.each(gestures, function(gesture) {
        this.element.addEventListener(gesture, handler, false);
      }, this);
      return this;
    },


    /**
     * unbind events to the instance
     * @param   {String}      gesture
     * @param   {Function}    handler
     * @returns {Hammer.Instance}
     */
    off: function offEvent(gesture, handler) {
      var gestures = gesture.split(' ');
      Hammer.utils.each(gestures, function(gesture) {
        this.element.removeEventListener(gesture, handler, false);
      }, this);
      return this;
    },


    /**
     * trigger gesture event
     * @param   {String}      gesture
     * @param   {Object}      [eventData]
     * @returns {Hammer.Instance}
     */
    trigger: function triggerEvent(gesture, eventData) {
      // optional
      if(!eventData) {
        eventData = {};
      }

      // create DOM event
      var event = Hammer.DOCUMENT.createEvent('Event');
      event.initEvent(gesture, true, true);
      event.gesture = eventData;

      // trigger on the target if it is in the instance element,
      // this is for event delegation tricks
      var element = this.element;
      if(Hammer.utils.hasParent(eventData.target, element)) {
        element = eventData.target;
      }

      element.dispatchEvent(event);
      return this;
    },


    /**
     * enable of disable hammer.js detection
     * @param   {Boolean}   state
     * @returns {Hammer.Instance}
     */
    enable: function enable(state) {
      this.enabled = state;
      return this;
    }
  };


  /**
   * this holds the last move event,
   * used to fix empty touchend issue
   * see the onTouch event for an explanation
   * @type {Object}
   */
  var last_move_event = null;


  /**
   * when the mouse is hold down, this is true
   * @type {Boolean}
   */
  var enable_detect = false;


  /**
   * when touch events have been fired, this is true
   * @type {Boolean}
   */
  var touch_triggered = false;


  Hammer.event = {
    /**
     * simple addEventListener
     * @param   {HTMLElement}   element
     * @param   {String}        type
     * @param   {Function}      handler
     */
    bindDom: function(element, type, handler) {
      var types = type.split(' ');
      Hammer.utils.each(types, function(type){
        element.addEventListener(type, handler, false);
      });
    },


    /**
     * touch events with mouse fallback
     * @param   {HTMLElement}   element
     * @param   {String}        eventType        like Hammer.EVENT_MOVE
     * @param   {Function}      handler
     */
    onTouch: function onTouch(element, eventType, handler) {
      var self = this;

      this.bindDom(element, Hammer.EVENT_TYPES[eventType], function bindDomOnTouch(ev) {
        var sourceEventType = ev.type.toLowerCase();

        // onmouseup, but when touchend has been fired we do nothing.
        // this is for touchdevices which also fire a mouseup on touchend
        if(sourceEventType.match(/mouse/) && touch_triggered) {
          return;
        }

        // mousebutton must be down or a touch event
        else if(sourceEventType.match(/touch/) ||   // touch events are always on screen
                sourceEventType.match(/pointerdown/) || // pointerevents touch
                  (sourceEventType.match(/mouse/) && ev.which === 1)   // mouse is pressed
               ) {
                 enable_detect = true;
               }

               // mouse isn't pressed
               else if(sourceEventType.match(/mouse/) && !ev.which) {
                 enable_detect = false;
               }


               // we are in a touch event, set the touch triggered bool to true,
               // this for the conflicts that may occur on ios and android
               if(sourceEventType.match(/touch|pointer/)) {
                 touch_triggered = true;
               }

               // count the total touches on the screen
               var count_touches = 0;

               // when touch has been triggered in this detection session
               // and we are now handling a mouse event, we stop that to prevent conflicts
               if(enable_detect) {
                 // update pointerevent
                 if(Hammer.HAS_POINTEREVENTS && eventType != Hammer.EVENT_END) {
                   count_touches = Hammer.PointerEvent.updatePointer(eventType, ev);
                 }
                 // touch
                 else if(sourceEventType.match(/touch/)) {
                   count_touches = ev.touches.length;
                 }
                 // mouse
                 else if(!touch_triggered) {
                   count_touches = sourceEventType.match(/up/) ? 0 : 1;
                 }

                 // if we are in a end event, but when we remove one touch and
                 // we still have enough, set eventType to move
                 if(count_touches > 0 && eventType == Hammer.EVENT_END) {
                   eventType = Hammer.EVENT_MOVE;
                 }
                 // no touches, force the end event
                 else if(!count_touches) {
                   eventType = Hammer.EVENT_END;
                 }

                 // store the last move event
                 if(count_touches || last_move_event === null) {
                   last_move_event = ev;
                 }

                 // trigger the handler
                 handler.call(Hammer.detection, self.collectEventData(element, eventType, self.getTouchList(last_move_event, eventType), ev));

                 // remove pointerevent from list
                 if(Hammer.HAS_POINTEREVENTS && eventType == Hammer.EVENT_END) {
                   count_touches = Hammer.PointerEvent.updatePointer(eventType, ev);
                 }
               }

               // on the end we reset everything
               if(!count_touches) {
                 last_move_event = null;
                 enable_detect = false;
                 touch_triggered = false;
                 Hammer.PointerEvent.reset();
               }
      });
    },


    /**
     * we have different events for each device/browser
     * determine what we need and set them in the Hammer.EVENT_TYPES constant
     */
    determineEventTypes: function determineEventTypes() {
      // determine the eventtype we want to set
      var types;

      // pointerEvents magic
      if(Hammer.HAS_POINTEREVENTS) {
        types = Hammer.PointerEvent.getEvents();
      }
      // on Android, iOS, blackberry, windows mobile we dont want any mouseevents
      else if(Hammer.NO_MOUSEEVENTS) {
        types = [
          'touchstart',
          'touchmove',
          'touchend touchcancel'];
      }
      // for non pointer events browsers and mixed browsers,
      // like chrome on windows8 touch laptop
      else {
        types = [
          'touchstart mousedown',
          'touchmove mousemove',
          'touchend touchcancel mouseup'];
      }

      Hammer.EVENT_TYPES[Hammer.EVENT_START] = types[0];
      Hammer.EVENT_TYPES[Hammer.EVENT_MOVE] = types[1];
      Hammer.EVENT_TYPES[Hammer.EVENT_END] = types[2];
    },


    /**
     * create touchlist depending on the event
     * @param   {Object}    ev
     * @param   {String}    eventType   used by the fakemultitouch plugin
     */
    getTouchList: function getTouchList(ev/*, eventType*/) {
      // get the fake pointerEvent touchlist
      if(Hammer.HAS_POINTEREVENTS) {
        return Hammer.PointerEvent.getTouchList();
      }
      // get the touchlist
      else if(ev.touches) {
        return ev.touches;
      }
      // make fake touchlist from mouse position
      else {
        ev.identifier = 1;
        return [ev];
      }
    },


    /**
     * collect event data for Hammer js
     * @param   {HTMLElement}   element
     * @param   {String}        eventType        like Hammer.EVENT_MOVE
     * @param   {Object}        eventData
     */
    collectEventData: function collectEventData(element, eventType, touches, ev) {
      // find out pointerType
      var pointerType = Hammer.POINTER_TOUCH;
      if(ev.type.match(/mouse/) || Hammer.PointerEvent.matchType(Hammer.POINTER_MOUSE, ev)) {
        pointerType = Hammer.POINTER_MOUSE;
      }

      return {
        center     : Hammer.utils.getCenter(touches),
        timeStamp  : new Date().getTime(),
        target     : ev.target,
        touches    : touches,
        eventType  : eventType,
        pointerType: pointerType,
        srcEvent   : ev,

        /**
         * prevent the browser default actions
         * mostly used to disable scrolling of the browser
         */
        preventDefault: function() {
          if(this.srcEvent.preventManipulation) {
            this.srcEvent.preventManipulation();
          }

          if(this.srcEvent.preventDefault) {
            this.srcEvent.preventDefault();
          }
        },

        /**
         * stop bubbling the event up to its parents
         */
        stopPropagation: function() {
          this.srcEvent.stopPropagation();
        },

        /**
         * immediately stop gesture detection
         * might be useful after a swipe was detected
         * @return {*}
         */
        stopDetect: function() {
          return Hammer.detection.stopDetect();
        }
      };
    }
  };

  Hammer.PointerEvent = {
    /**
     * holds all pointers
     * @type {Object}
     */
    pointers: {},

    /**
     * get a list of pointers
     * @returns {Array}     touchlist
     */
    getTouchList: function() {
      var self = this;
      var touchlist = [];

      // we can use forEach since pointerEvents only is in IE10
      Hammer.utils.each(self.pointers, function(pointer){
        touchlist.push(pointer);
      });

      return touchlist;
    },

    /**
     * update the position of a pointer
     * @param   {String}   type             Hammer.EVENT_END
     * @param   {Object}   pointerEvent
     */
    updatePointer: function(type, pointerEvent) {
      if(type == Hammer.EVENT_END) {
        this.pointers = {};
      }
      else {
        pointerEvent.identifier = pointerEvent.pointerId;
        this.pointers[pointerEvent.pointerId] = pointerEvent;
      }

      return Object.keys(this.pointers).length;
    },

    /**
     * check if ev matches pointertype
     * @param   {String}        pointerType     Hammer.POINTER_MOUSE
     * @param   {PointerEvent}  ev
     */
    matchType: function(pointerType, ev) {
      if(!ev.pointerType) {
        return false;
      }

      var pt = ev.pointerType,
      types = {};
      types[Hammer.POINTER_MOUSE] = (pt === ev.MSPOINTER_TYPE_MOUSE || pt === Hammer.POINTER_MOUSE);
      types[Hammer.POINTER_TOUCH] = (pt === ev.MSPOINTER_TYPE_TOUCH || pt === Hammer.POINTER_TOUCH);
      types[Hammer.POINTER_PEN] = (pt === ev.MSPOINTER_TYPE_PEN || pt === Hammer.POINTER_PEN);
      return types[pointerType];
    },


    /**
     * get events
     */
    getEvents: function() {
      return [
        'pointerdown MSPointerDown',
        'pointermove MSPointerMove',
        'pointerup pointercancel MSPointerUp MSPointerCancel'
      ];
    },

    /**
     * reset the list
     */
    reset: function() {
      this.pointers = {};
    }
  };


  Hammer.detection = {
    // contains all registred Hammer.gestures in the correct order
    gestures: [],

    // data of the current Hammer.gesture detection session
    current : null,

    // the previous Hammer.gesture session data
    // is a full clone of the previous gesture.current object
    previous: null,

    // when this becomes true, no gestures are fired
    stopped : false,


    /**
     * start Hammer.gesture detection
     * @param   {Hammer.Instance}   inst
     * @param   {Object}            eventData
     */
    startDetect: function startDetect(inst, eventData) {
      // already busy with a Hammer.gesture detection on an element
      if(this.current) {
        return;
      }

      this.stopped = false;

      this.current = {
        inst      : inst, // reference to HammerInstance we're working for
        startEvent: Hammer.utils.extend({}, eventData), // start eventData for distances, timing etc
        lastEvent : false, // last eventData
        name      : '' // current gesture we're in/detected, can be 'tap', 'hold' etc
      };

      this.detect(eventData);
    },


    /**
     * Hammer.gesture detection
     * @param   {Object}    eventData
     */
    detect: function detect(eventData) {
      if(!this.current || this.stopped) {
        return;
      }

      // extend event data with calculations about scale, distance etc
      eventData = this.extendEventData(eventData);

      // instance options
      var inst_options = this.current.inst.options;

      // call Hammer.gesture handlers
      Hammer.utils.each(this.gestures, function(gesture) {
        // only when the instance options have enabled this gesture
        if(!this.stopped && inst_options[gesture.name] !== false) {
          // if a handler returns false, we stop with the detection
          if(gesture.handler.call(gesture, eventData, this.current.inst) === false) {
            this.stopDetect();
            return false;
          }
        }
      }, this);

      // store as previous event event
      if(this.current) {
        this.current.lastEvent = eventData;
      }

      // endevent, but not the last touch, so dont stop
      if(eventData.eventType == Hammer.EVENT_END && !eventData.touches.length - 1) {
        this.stopDetect();
      }

      return eventData;
    },


    /**
     * clear the Hammer.gesture vars
     * this is called on endDetect, but can also be used when a final Hammer.gesture has been detected
     * to stop other Hammer.gestures from being fired
     */
    stopDetect: function stopDetect() {
      // clone current data to the store as the previous gesture
      // used for the double tap gesture, since this is an other gesture detect session
      this.previous = Hammer.utils.extend({}, this.current);

      // reset the current
      this.current = null;

      // stopped!
      this.stopped = true;
    },


    /**
     * extend eventData for Hammer.gestures
     * @param   {Object}   ev
     * @returns {Object}   ev
     */
    extendEventData: function extendEventData(ev) {
      var startEv = this.current.startEvent;

      // if the touches change, set the new touches over the startEvent touches
      // this because touchevents don't have all the touches on touchstart, or the
      // user must place his fingers at the EXACT same time on the screen, which is not realistic
      // but, sometimes it happens that both fingers are touching at the EXACT same time
      if(startEv && (ev.touches.length != startEv.touches.length || ev.touches === startEv.touches)) {
        // extend 1 level deep to get the touchlist with the touch objects
        startEv.touches = [];
        Hammer.utils.each(ev.touches, function(touch) {
          startEv.touches.push(Hammer.utils.extend({}, touch));
        });
      }

      var delta_time = ev.timeStamp - startEv.timeStamp
        , delta_x = ev.center.pageX - startEv.center.pageX
        , delta_y = ev.center.pageY - startEv.center.pageY
        , velocity = Hammer.utils.getVelocity(delta_time, delta_x, delta_y)
        , interimAngle
        , interimDirection;

      // end events (e.g. dragend) don't have useful values for interimDirection & interimAngle
        // because the previous event has exactly the same coordinates
        // so for end events, take the previous values of interimDirection & interimAngle
        // instead of recalculating them and getting a spurious '0'
        if(ev.eventType === 'end') {
          interimAngle = this.current.lastEvent && this.current.lastEvent.interimAngle;
          interimDirection = this.current.lastEvent && this.current.lastEvent.interimDirection;
        }
        else {
          interimAngle = this.current.lastEvent && Hammer.utils.getAngle(this.current.lastEvent.center, ev.center);
          interimDirection = this.current.lastEvent && Hammer.utils.getDirection(this.current.lastEvent.center, ev.center);
        }

        Hammer.utils.extend(ev, {
          deltaTime: delta_time,

          deltaX: delta_x,
          deltaY: delta_y,

          velocityX: velocity.x,
          velocityY: velocity.y,

          distance: Hammer.utils.getDistance(startEv.center, ev.center),

          angle: Hammer.utils.getAngle(startEv.center, ev.center),
          interimAngle: interimAngle,

          direction: Hammer.utils.getDirection(startEv.center, ev.center),
          interimDirection: interimDirection,

          scale: Hammer.utils.getScale(startEv.touches, ev.touches),
          rotation: Hammer.utils.getRotation(startEv.touches, ev.touches),

          startEvent: startEv
        });

        return ev;
    },


    /**
     * register new gesture
     * @param   {Object}    gesture object, see gestures.js for documentation
     * @returns {Array}     gestures
     */
    register: function register(gesture) {
      // add an enable gesture options if there is no given
      var options = gesture.defaults || {};
      if(options[gesture.name] === undefined) {
        options[gesture.name] = true;
      }

      // extend Hammer default options with the Hammer.gesture options
      Hammer.utils.extend(Hammer.defaults, options, true);

      // set its index
      gesture.index = gesture.index || 1000;

      // add Hammer.gesture to the list
      this.gestures.push(gesture);

      // sort the list by index
      this.gestures.sort(function(a, b) {
        if(a.index < b.index) { return -1; }
        if(a.index > b.index) { return 1; }
        return 0;
      });

      return this.gestures;
    }
  };


  /**
   * Drag
   * Move with x fingers (default 1) around on the page. Blocking the scrolling when
   * moving left and right is a good practice. When all the drag events are blocking
   * you disable scrolling on that area.
   * @events  drag, drapleft, dragright, dragup, dragdown
   */
  Hammer.gestures.Drag = {
    name     : 'drag',
    index    : 50,
    defaults : {
      drag_min_distance            : 10,

      // Set correct_for_drag_min_distance to true to make the starting point of the drag
      // be calculated from where the drag was triggered, not from where the touch started.
      // Useful to avoid a jerk-starting drag, which can make fine-adjustments
      // through dragging difficult, and be visually unappealing.
      correct_for_drag_min_distance: true,

      // set 0 for unlimited, but this can conflict with transform
      drag_max_touches             : 1,

      // prevent default browser behavior when dragging occurs
      // be careful with it, it makes the element a blocking element
      // when you are using the drag gesture, it is a good practice to set this true
      drag_block_horizontal        : false,
      drag_block_vertical          : false,

      // drag_lock_to_axis keeps the drag gesture on the axis that it started on,
      // It disallows vertical directions if the initial direction was horizontal, and vice versa.
      drag_lock_to_axis            : false,

      // drag lock only kicks in when distance > drag_lock_min_distance
      // This way, locking occurs only when the distance has become large enough to reliably determine the direction
      drag_lock_min_distance       : 25
    },

    triggered: false,
    handler  : function dragGesture(ev, inst) {
      // current gesture isnt drag, but dragged is true
      // this means an other gesture is busy. now call dragend
      if(Hammer.detection.current.name != this.name && this.triggered) {
        inst.trigger(this.name + 'end', ev);
        this.triggered = false;
        return;
      }

      // max touches
      if(inst.options.drag_max_touches > 0 &&
         ev.touches.length > inst.options.drag_max_touches) {
        return;
      }

      switch(ev.eventType) {
        case Hammer.EVENT_START:
          this.triggered = false;
        break;

        case Hammer.EVENT_MOVE:
          // when the distance we moved is too small we skip this gesture
          // or we can be already in dragging
          if(ev.distance < inst.options.drag_min_distance &&
             Hammer.detection.current.name != this.name) {
          return;
        }

        // we are dragging!
        if(Hammer.detection.current.name != this.name) {
          Hammer.detection.current.name = this.name;
          if(inst.options.correct_for_drag_min_distance && ev.distance > 0) {
            // When a drag is triggered, set the event center to drag_min_distance pixels from the original event center.
            // Without this correction, the dragged distance would jumpstart at drag_min_distance pixels instead of at 0.
            // It might be useful to save the original start point somewhere
            var factor = Math.abs(inst.options.drag_min_distance / ev.distance);
            Hammer.detection.current.startEvent.center.pageX += ev.deltaX * factor;
            Hammer.detection.current.startEvent.center.pageY += ev.deltaY * factor;

            // recalculate event data using new start point
            ev = Hammer.detection.extendEventData(ev);
          }
        }

        // lock drag to axis?
        if(Hammer.detection.current.lastEvent.drag_locked_to_axis || (inst.options.drag_lock_to_axis && inst.options.drag_lock_min_distance <= ev.distance)) {
          ev.drag_locked_to_axis = true;
        }
        var last_direction = Hammer.detection.current.lastEvent.direction;
        if(ev.drag_locked_to_axis && last_direction !== ev.direction) {
          // keep direction on the axis that the drag gesture started on
          if(Hammer.utils.isVertical(last_direction)) {
            ev.direction = (ev.deltaY < 0) ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
          }
          else {
            ev.direction = (ev.deltaX < 0) ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
          }
        }

        // first time, trigger dragstart event
        if(!this.triggered) {
          inst.trigger(this.name + 'start', ev);
          this.triggered = true;
        }

        // trigger normal event
        inst.trigger(this.name, ev);

        // direction event, like dragdown
        inst.trigger(this.name + ev.direction, ev);

        // block the browser events
        if((inst.options.drag_block_vertical && Hammer.utils.isVertical(ev.direction)) ||
           (inst.options.drag_block_horizontal && !Hammer.utils.isVertical(ev.direction))) {
          ev.preventDefault();
        }
        break;

        case Hammer.EVENT_END:
          // trigger dragend
          if(this.triggered) {
          inst.trigger(this.name + 'end', ev);
        }

        this.triggered = false;
        break;
      }
    }
  };

  /**
   * Hold
   * Touch stays at the same place for x time
   * @events  hold
   */
  Hammer.gestures.Hold = {
    name    : 'hold',
    index   : 10,
    defaults: {
      hold_timeout  : 500,
      hold_threshold: 1
    },
    timer   : null,
    handler : function holdGesture(ev, inst) {
      switch(ev.eventType) {
        case Hammer.EVENT_START:
          // clear any running timers
          clearTimeout(this.timer);

        // set the gesture so we can check in the timeout if it still is
        Hammer.detection.current.name = this.name;

        // set timer and if after the timeout it still is hold,
        // we trigger the hold event
        this.timer = setTimeout(function() {
          if(Hammer.detection.current.name == 'hold') {
            inst.trigger('hold', ev);
          }
        }, inst.options.hold_timeout);
        break;

        // when you move or end we clear the timer
        case Hammer.EVENT_MOVE:
          if(ev.distance > inst.options.hold_threshold) {
          clearTimeout(this.timer);
        }
        break;

        case Hammer.EVENT_END:
          clearTimeout(this.timer);
        break;
      }
    }
  };

  /**
   * Release
   * Called as last, tells the user has released the screen
   * @events  release
   */
  Hammer.gestures.Release = {
    name   : 'release',
    index  : Infinity,
    handler: function releaseGesture(ev, inst) {
      if(ev.eventType == Hammer.EVENT_END) {
        inst.trigger(this.name, ev);
      }
    }
  };

  /**
   * Swipe
   * triggers swipe events when the end velocity is above the threshold
   * @events  swipe, swipeleft, swiperight, swipeup, swipedown
   */
  Hammer.gestures.Swipe = {
    name    : 'swipe',
    index   : 40,
    defaults: {
      // set 0 for unlimited, but this can conflict with transform
      swipe_min_touches: 1,
      swipe_max_touches: 1,
      swipe_velocity   : 0.7
    },
    handler : function swipeGesture(ev, inst) {
      if(ev.eventType == Hammer.EVENT_END) {
        // max touches
        if(inst.options.swipe_max_touches > 0 &&
           ev.touches.length < inst.options.swipe_min_touches &&
             ev.touches.length > inst.options.swipe_max_touches) {
          return;
        }

        // when the distance we moved is too small we skip this gesture
        // or we can be already in dragging
        if(ev.velocityX > inst.options.swipe_velocity ||
           ev.velocityY > inst.options.swipe_velocity) {
          // trigger swipe events
          inst.trigger(this.name, ev);
          inst.trigger(this.name + ev.direction, ev);
        }
      }
    }
  };

  /**
   * Tap/DoubleTap
   * Quick touch at a place or double at the same place
   * @events  tap, doubletap
   */
  Hammer.gestures.Tap = {
    name    : 'tap',
    index   : 100,
    defaults: {
      tap_max_touchtime : 250,
      tap_max_distance  : 10,
      tap_always        : true,
      doubletap_distance: 20,
      doubletap_interval: 300
    },
    handler : function tapGesture(ev, inst) {
      if(ev.eventType == Hammer.EVENT_END && ev.srcEvent.type != 'touchcancel') {
        // previous gesture, for the double tap since these are two different gesture detections
        var prev = Hammer.detection.previous,
        did_doubletap = false;

        // when the touchtime is higher then the max touch time
        // or when the moving distance is too much
        if(ev.deltaTime > inst.options.tap_max_touchtime ||
           ev.distance > inst.options.tap_max_distance) {
          return;
        }

        // check if double tap
        if(prev && prev.name == 'tap' &&
           (ev.timeStamp - prev.lastEvent.timeStamp) < inst.options.doubletap_interval &&
             ev.distance < inst.options.doubletap_distance) {
          inst.trigger('doubletap', ev);
        did_doubletap = true;
        }

        // do a single tap
        if(!did_doubletap || inst.options.tap_always) {
          Hammer.detection.current.name = 'tap';
          inst.trigger(Hammer.detection.current.name, ev);
        }
      }
    }
  };

  /**
   * Touch
   * Called as first, tells the user has touched the screen
   * @events  touch
   */
  Hammer.gestures.Touch = {
    name    : 'touch',
    index   : -Infinity,
    defaults: {
      // call preventDefault at touchstart, and makes the element blocking by
      // disabling the scrolling of the page, but it improves gestures like
      // transforming and dragging.
      // be careful with using this, it can be very annoying for users to be stuck
      // on the page
      prevent_default    : false,

      // disable mouse events, so only touch (or pen!) input triggers events
      prevent_mouseevents: false
    },
    handler : function touchGesture(ev, inst) {
      if(inst.options.prevent_mouseevents && ev.pointerType == Hammer.POINTER_MOUSE) {
        ev.stopDetect();
        return;
      }

      if(inst.options.prevent_default) {
        ev.preventDefault();
      }

      if(ev.eventType == Hammer.EVENT_START) {
        inst.trigger(this.name, ev);
      }
    }
  };

  /**
   * Transform
   * User want to scale or rotate with 2 fingers
   * @events  transform, pinch, pinchin, pinchout, rotate
   */
  Hammer.gestures.Transform = {
    name     : 'transform',
    index    : 45,
    defaults : {
      // factor, no scale is 1, zoomin is to 0 and zoomout until higher then 1
      transform_min_scale   : 0.01,
      // rotation in degrees
      transform_min_rotation: 1,
      // prevent default browser behavior when two touches are on the screen
      // but it makes the element a blocking element
      // when you are using the transform gesture, it is a good practice to set this true
      transform_always_block: false
    },
    triggered: false,
    handler  : function transformGesture(ev, inst) {
      // current gesture isnt drag, but dragged is true
      // this means an other gesture is busy. now call dragend
      if(Hammer.detection.current.name != this.name && this.triggered) {
        inst.trigger(this.name + 'end', ev);
        this.triggered = false;
        return;
      }

      // atleast multitouch
      if(ev.touches.length < 2) {
        return;
      }

      // prevent default when two fingers are on the screen
      if(inst.options.transform_always_block) {
        ev.preventDefault();
      }

      switch(ev.eventType) {
        case Hammer.EVENT_START:
          this.triggered = false;
        break;

        case Hammer.EVENT_MOVE:
          var scale_threshold = Math.abs(1 - ev.scale);
        var rotation_threshold = Math.abs(ev.rotation);

        // when the distance we moved is too small we skip this gesture
        // or we can be already in dragging
        if(scale_threshold < inst.options.transform_min_scale &&
           rotation_threshold < inst.options.transform_min_rotation) {
          return;
        }

        // we are transforming!
        Hammer.detection.current.name = this.name;

        // first time, trigger dragstart event
        if(!this.triggered) {
          inst.trigger(this.name + 'start', ev);
          this.triggered = true;
        }

        inst.trigger(this.name, ev); // basic transform event

        // trigger rotate event
        if(rotation_threshold > inst.options.transform_min_rotation) {
          inst.trigger('rotate', ev);
        }

        // trigger pinch event
        if(scale_threshold > inst.options.transform_min_scale) {
          inst.trigger('pinch', ev);
          inst.trigger('pinch' + ((ev.scale < 1) ? 'in' : 'out'), ev);
        }
        break;

        case Hammer.EVENT_END:
          // trigger dragend
          if(this.triggered) {
          inst.trigger(this.name + 'end', ev);
        }

        this.triggered = false;
        break;
      }
    }
  };

  // Based off Lo-Dash's excellent UMD wrapper (slightly modified) - https://github.com/bestiejs/lodash/blob/master/lodash.js#L5515-L5543
  // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
  window.Hammer = Hammer;
})(this);

/*! iScroll v5.0.6 ~ (c) 2008-2013 Matteo Spinelli ~ http://cubiq.org/license */
var IScroll = (function (window, document, Math) {
var rAF = window.requestAnimationFrame	||
	window.webkitRequestAnimationFrame	||
	window.mozRequestAnimationFrame		||
	window.oRequestAnimationFrame		||
	window.msRequestAnimationFrame		||
	function (callback) { window.setTimeout(callback, 1000 / 60); };

var utils = (function () {
	var me = {};

	var _elementStyle = document.createElement('div').style;
	var _vendor = (function () {
		var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
			transform,
			i = 0,
			l = vendors.length;

		for ( ; i < l; i++ ) {
			transform = vendors[i] + 'ransform';
			if ( transform in _elementStyle ) return vendors[i].substr(0, vendors[i].length-1);
		}

		return false;
	})();

	function _prefixStyle (style) {
		if ( _vendor === false ) return false;
		if ( _vendor === '' ) return style;
		return _vendor + style.charAt(0).toUpperCase() + style.substr(1);
	}

	me.getTime = Date.now || function getTime () { return new Date().getTime(); };

	me.extend = function (target, obj) {
		for ( var i in obj ) {
			target[i] = obj[i];
		}
	};

	me.addEvent = function (el, type, fn, capture) {
		el.addEventListener(type, fn, !!capture);
	};

	me.removeEvent = function (el, type, fn, capture) {
		el.removeEventListener(type, fn, !!capture);
	};

	me.momentum = function (current, start, time, lowerMargin, wrapperSize) {
		var distance = current - start,
			speed = Math.abs(distance) / time,
			destination,
			duration,
			deceleration = 0.0006;

		destination = current + ( speed * speed ) / ( 2 * deceleration ) * ( distance < 0 ? -1 : 1 );
		duration = speed / deceleration;

		if ( destination < lowerMargin ) {
			destination = wrapperSize ? lowerMargin - ( wrapperSize / 2.5 * ( speed / 8 ) ) : lowerMargin;
			distance = Math.abs(destination - current);
			duration = distance / speed;
		} else if ( destination > 0 ) {
			destination = wrapperSize ? wrapperSize / 2.5 * ( speed / 8 ) : 0;
			distance = Math.abs(current) + destination;
			duration = distance / speed;
		}

		return {
			destination: Math.round(destination),
			duration: duration
		};
	};

	var _transform = _prefixStyle('transform');

	me.extend(me, {
		hasTransform: _transform !== false,
		hasPerspective: _prefixStyle('perspective') in _elementStyle,
		hasTouch: 'ontouchstart' in window,
		hasPointer: navigator.msPointerEnabled,
		hasTransition: _prefixStyle('transition') in _elementStyle
	});

	me.isAndroidBrowser = /Android/.test(window.navigator.appVersion) && /Version\/\d/.test(window.navigator.appVersion);

	me.extend(me.style = {}, {
		transform: _transform,
		transitionTimingFunction: _prefixStyle('transitionTimingFunction'),
		transitionDuration: _prefixStyle('transitionDuration'),
		transformOrigin: _prefixStyle('transformOrigin')
	});

	me.hasClass = function (e, c) {
		var re = new RegExp("(^|\\s)" + c + "(\\s|$)");
		return re.test(e.className);
	};

	me.addClass = function (e, c) {
		if ( me.hasClass(e, c) ) {
			return;
		}

		var newclass = e.className.split(' ');
		newclass.push(c);
		e.className = newclass.join(' ');
	};

	me.removeClass = function (e, c) {
		if ( !me.hasClass(e, c) ) {
			return;
		}

		var re = new RegExp("(^|\\s)" + c + "(\\s|$)", 'g');
		e.className = e.className.replace(re, ' ');
	};

	me.offset = function (el) {
		var left = -el.offsetLeft,
			top = -el.offsetTop;

		// jshint -W084
		while (el = el.offsetParent) {
			left -= el.offsetLeft;
			top -= el.offsetTop;
		}
		// jshint +W084

		return {
			left: left,
			top: top
		};
	};

	me.preventDefaultException = function (el, exceptions) {
		for ( var i in exceptions ) {
			if ( exceptions[i].test(el[i]) ) {
				return true;
			}
		}

		return false;
	};

	me.extend(me.eventType = {}, {
		touchstart: 1,
		touchmove: 1,
		touchend: 1,

		mousedown: 2,
		mousemove: 2,
		mouseup: 2,

		MSPointerDown: 3,
		MSPointerMove: 3,
		MSPointerUp: 3
	});

	me.extend(me.ease = {}, {
		quadratic: {
			style: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
			fn: function (k) {
				return k * ( 2 - k );
			}
		},
		circular: {
			style: 'cubic-bezier(0.1, 0.57, 0.1, 1)',	// Not properly "circular" but this looks better, it should be (0.075, 0.82, 0.165, 1)
			fn: function (k) {
				return Math.sqrt( 1 - ( --k * k ) );
			}
		},
		back: {
			style: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
			fn: function (k) {
				var b = 4;
				return ( k = k - 1 ) * k * ( ( b + 1 ) * k + b ) + 1;
			}
		},
		bounce: {
			style: '',
			fn: function (k) {
				if ( ( k /= 1 ) < ( 1 / 2.75 ) ) {
					return 7.5625 * k * k;
				} else if ( k < ( 2 / 2.75 ) ) {
					return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;
				} else if ( k < ( 2.5 / 2.75 ) ) {
					return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;
				} else {
					return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;
				}
			}
		},
		elastic: {
			style: '',
			fn: function (k) {
				var f = 0.22,
					e = 0.4;

				if ( k === 0 ) { return 0; }
				if ( k == 1 ) { return 1; }

				return ( e * Math.pow( 2, - 10 * k ) * Math.sin( ( k - f / 4 ) * ( 2 * Math.PI ) / f ) + 1 );
			}
		}
	});

	me.tap = function (e, eventName) {
		var ev = document.createEvent('Event');
		ev.initEvent(eventName, true, true);
		ev.pageX = e.pageX;
		ev.pageY = e.pageY;
		e.target.dispatchEvent(ev);
	};

	me.click = function (e) {
		var target = e.target,
			ev;

		if (target.tagName != 'SELECT' && target.tagName != 'INPUT' && target.tagName != 'TEXTAREA') {
			ev = document.createEvent('MouseEvents');
			ev.initMouseEvent('click', true, true, e.view, 1,
				target.screenX, target.screenY, target.clientX, target.clientY,
				e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
				0, null);

			ev._constructed = true;
			target.dispatchEvent(ev);
		}
	};

	return me;
})();

function IScroll (el, options) {
	this.wrapper = typeof el == 'string' ? document.querySelector(el) : el;
	this.scroller = this.wrapper.children[0];
	this.scrollerStyle = this.scroller.style;		// cache style for better performance

	this.options = {

// INSERT POINT: OPTIONS 

		startX: 0,
		startY: 0,
		scrollY: true,
		directionLockThreshold: 5,
		momentum: true,

		bounce: true,
		bounceTime: 600,
		bounceEasing: '',

		preventDefault: true,
		preventDefaultException: { tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/ },

		HWCompositing: true,
		useTransition: true,
		useTransform: true
	};

	for ( var i in options ) {
		this.options[i] = options[i];
	}

	// Normalize options
	this.translateZ = this.options.HWCompositing && utils.hasPerspective ? ' translateZ(0)' : '';

	this.options.useTransition = utils.hasTransition && this.options.useTransition;
	this.options.useTransform = utils.hasTransform && this.options.useTransform;

	this.options.eventPassthrough = this.options.eventPassthrough === true ? 'vertical' : this.options.eventPassthrough;
	this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault;

	// If you want eventPassthrough I have to lock one of the axes
	this.options.scrollY = this.options.eventPassthrough == 'vertical' ? false : this.options.scrollY;
	this.options.scrollX = this.options.eventPassthrough == 'horizontal' ? false : this.options.scrollX;

	// With eventPassthrough we also need lockDirection mechanism
	this.options.freeScroll = this.options.freeScroll && !this.options.eventPassthrough;
	this.options.directionLockThreshold = this.options.eventPassthrough ? 0 : this.options.directionLockThreshold;

	this.options.bounceEasing = typeof this.options.bounceEasing == 'string' ? utils.ease[this.options.bounceEasing] || utils.ease.circular : this.options.bounceEasing;

	this.options.resizePolling = this.options.resizePolling === undefined ? 60 : this.options.resizePolling;

	if ( this.options.tap === true ) {
		this.options.tap = 'tap';
	}

// INSERT POINT: NORMALIZATION

	// Some defaults	
	this.x = 0;
	this.y = 0;
	this.directionX = 0;
	this.directionY = 0;
	this._events = {};

// INSERT POINT: DEFAULTS

	this._init();
	this.refresh();

	this.scrollTo(this.options.startX, this.options.startY);
	this.enable();
}

IScroll.prototype = {
	version: '5.0.6',

	_init: function () {
		this._initEvents();

// INSERT POINT: _init

	},

	destroy: function () {
		this._initEvents(true);

		this._execEvent('destroy');
	},

	_transitionEnd: function (e) {
		if ( e.target != this.scroller ) {
			return;
		}

		this._transitionTime(0);
		if ( !this.resetPosition(this.options.bounceTime) ) {
			this._execEvent('scrollEnd');
		}
	},

	_start: function (e) {
		// React to left mouse button only
		if ( utils.eventType[e.type] != 1 ) {
			if ( e.button !== 0 ) {
				return;
			}
		}

		if ( !this.enabled || (this.initiated && utils.eventType[e.type] !== this.initiated) ) {
			return;
		}

		if ( this.options.preventDefault && !utils.isAndroidBrowser && !utils.preventDefaultException(e.target, this.options.preventDefaultException) ) {
			e.preventDefault();		// This seems to break default Android browser
		}

		var point = e.touches ? e.touches[0] : e,
			pos;

		this.initiated	= utils.eventType[e.type];
		this.moved		= false;
		this.distX		= 0;
		this.distY		= 0;
		this.directionX = 0;
		this.directionY = 0;
		this.directionLocked = 0;

		this._transitionTime();

		this.isAnimating = false;
		this.startTime = utils.getTime();

		if ( this.options.useTransition && this.isInTransition ) {
			pos = this.getComputedPosition();

			this._translate(Math.round(pos.x), Math.round(pos.y));
			this._execEvent('scrollEnd');
			this.isInTransition = false;
		}

		this.startX    = this.x;
		this.startY    = this.y;
		this.absStartX = this.x;
		this.absStartY = this.y;
		this.pointX    = point.pageX;
		this.pointY    = point.pageY;

		this._execEvent('beforeScrollStart');
	},

	_move: function (e) {
		if ( !this.enabled || utils.eventType[e.type] !== this.initiated ) {
			return;
		}

		if ( this.options.preventDefault ) {	// increases performance on Android? TODO: check!
			e.preventDefault();
		}

		var point		= e.touches ? e.touches[0] : e,
			deltaX		= point.pageX - this.pointX,
			deltaY		= point.pageY - this.pointY,
			timestamp	= utils.getTime(),
			newX, newY,
			absDistX, absDistY;

		this.pointX		= point.pageX;
		this.pointY		= point.pageY;

		this.distX		+= deltaX;
		this.distY		+= deltaY;
		absDistX		= Math.abs(this.distX);
		absDistY		= Math.abs(this.distY);

		// We need to move at least 10 pixels for the scrolling to initiate
		if ( timestamp - this.endTime > 300 && (absDistX < 10 && absDistY < 10) ) {
			return;
		}

		// If you are scrolling in one direction lock the other
		if ( !this.directionLocked && !this.options.freeScroll ) {
			if ( absDistX > absDistY + this.options.directionLockThreshold ) {
				this.directionLocked = 'h';		// lock horizontally
			} else if ( absDistY >= absDistX + this.options.directionLockThreshold ) {
				this.directionLocked = 'v';		// lock vertically
			} else {
				this.directionLocked = 'n';		// no lock
			}
		}

		if ( this.directionLocked == 'h' ) {
			if ( this.options.eventPassthrough == 'vertical' ) {
				e.preventDefault();
			} else if ( this.options.eventPassthrough == 'horizontal' ) {
				this.initiated = false;
				return;
			}

			deltaY = 0;
		} else if ( this.directionLocked == 'v' ) {
			if ( this.options.eventPassthrough == 'horizontal' ) {
				e.preventDefault();
			} else if ( this.options.eventPassthrough == 'vertical' ) {
				this.initiated = false;
				return;
			}

			deltaX = 0;
		}

		deltaX = this.hasHorizontalScroll ? deltaX : 0;
		deltaY = this.hasVerticalScroll ? deltaY : 0;

		newX = this.x + deltaX;
		newY = this.y + deltaY;

		// Slow down if outside of the boundaries
		if ( newX > 0 || newX < this.maxScrollX ) {
			newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX;
		}
		if ( newY > 0 || newY < this.maxScrollY ) {
			newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY;
		}

		this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
		this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

		if ( !this.moved ) {
			this._execEvent('scrollStart');
		}

		this.moved = true;

		this._translate(newX, newY);

/* REPLACE START: _move */

		if ( timestamp - this.startTime > 300 ) {
			this.startTime = timestamp;
			this.startX = this.x;
			this.startY = this.y;
		}

/* REPLACE END: _move */

	},

	_end: function (e) {
		if ( !this.enabled || utils.eventType[e.type] !== this.initiated ) {
			return;
		}

		if ( this.options.preventDefault && !utils.preventDefaultException(e.target, this.options.preventDefaultException) ) {
			e.preventDefault();
		}

		var point = e.changedTouches ? e.changedTouches[0] : e,
			momentumX,
			momentumY,
			duration = utils.getTime() - this.startTime,
			newX = Math.round(this.x),
			newY = Math.round(this.y),
			distanceX = Math.abs(newX - this.startX),
			distanceY = Math.abs(newY - this.startY),
			time = 0,
			easing = '';

		this.scrollTo(newX, newY);	// ensures that the last position is rounded

		this.isInTransition = 0;
		this.initiated = 0;
		this.endTime = utils.getTime();

		// reset if we are outside of the boundaries
		if ( this.resetPosition(this.options.bounceTime) ) {
			return;
		}

		// we scrolled less than 10 pixels
		if ( !this.moved ) {
			if ( this.options.tap ) {
				utils.tap(e, this.options.tap);
			}

			if ( this.options.click ) {
				utils.click(e);
			}

			return;
		}

		if ( this._events.flick && duration < 200 && distanceX < 100 && distanceY < 100 ) {
			this._execEvent('flick');
			return;
		}

		// start momentum animation if needed
		if ( this.options.momentum && duration < 300 ) {
			momentumX = this.hasHorizontalScroll ? utils.momentum(this.x, this.startX, duration, this.maxScrollX, this.options.bounce ? this.wrapperWidth : 0) : { destination: newX, duration: 0 };
			momentumY = this.hasVerticalScroll ? utils.momentum(this.y, this.startY, duration, this.maxScrollY, this.options.bounce ? this.wrapperHeight : 0) : { destination: newY, duration: 0 };
			newX = momentumX.destination;
			newY = momentumY.destination;
			time = Math.max(momentumX.duration, momentumY.duration);
			this.isInTransition = 1;
		}

// INSERT POINT: _end

		if ( newX != this.x || newY != this.y ) {
			// change easing function when scroller goes out of the boundaries
			if ( newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY ) {
				easing = utils.ease.quadratic;
			}

			this.scrollTo(newX, newY, time, easing);
			return;
		}

		this._execEvent('scrollEnd');
	},

	_resize: function () {
		var that = this;

		clearTimeout(this.resizeTimeout);

		this.resizeTimeout = setTimeout(function () {
			that.refresh();
		}, this.options.resizePolling);
	},

	resetPosition: function (time) {
		var x = this.x,
			y = this.y;

		time = time || 0;

		if ( !this.hasHorizontalScroll || this.x > 0 ) {
			x = 0;
		} else if ( this.x < this.maxScrollX ) {
			x = this.maxScrollX;
		}

		if ( !this.hasVerticalScroll || this.y > 0 ) {
			y = 0;
		} else if ( this.y < this.maxScrollY ) {
			y = this.maxScrollY;
		}

		if ( x == this.x && y == this.y ) {
			return false;
		}

		this.scrollTo(x, y, time, this.options.bounceEasing);

		return true;
	},

	disable: function () {
		this.enabled = false;
	},

	enable: function () {
		this.enabled = true;
	},

	refresh: function () {
		var rf = this.wrapper.offsetHeight;		// Force reflow

		this.wrapperWidth	= this.wrapper.clientWidth;
		this.wrapperHeight	= this.wrapper.clientHeight;

/* REPLACE START: refresh */

		this.scrollerWidth	= this.scroller.offsetWidth;
		this.scrollerHeight	= this.scroller.offsetHeight;

/* REPLACE END: refresh */

		this.maxScrollX		= this.wrapperWidth - this.scrollerWidth;
		this.maxScrollY		= this.wrapperHeight - this.scrollerHeight;

		this.hasHorizontalScroll	= this.options.scrollX && this.maxScrollX < 0;
		this.hasVerticalScroll		= this.options.scrollY && this.maxScrollY < 0;

		if ( !this.hasHorizontalScroll ) {
			this.maxScrollX = 0;
			this.scrollerWidth = this.wrapperWidth;
		}

		if ( !this.hasVerticalScroll ) {
			this.maxScrollY = 0;
			this.scrollerHeight = this.wrapperHeight;
		}

		this.endTime = 0;
		this.directionX = 0;
		this.directionY = 0;

		this.wrapperOffset = utils.offset(this.wrapper);

		this._execEvent('refresh');

		this.resetPosition();

// INSERT POINT: _refresh

	},

	on: function (type, fn) {
		if ( !this._events[type] ) {
			this._events[type] = [];
		}

		this._events[type].push(fn);
	},

	_execEvent: function (type) {
		if ( !this._events[type] ) {
			return;
		}

		var i = 0,
			l = this._events[type].length;

		if ( !l ) {
			return;
		}

		for ( ; i < l; i++ ) {
			this._events[type][i].call(this);
		}
	},

	scrollBy: function (x, y, time, easing) {
		x = this.x + x;
		y = this.y + y;
		time = time || 0;

		this.scrollTo(x, y, time, easing);
	},

	scrollTo: function (x, y, time, easing) {
		easing = easing || utils.ease.circular;

		if ( !time || (this.options.useTransition && easing.style) ) {
			this._transitionTimingFunction(easing.style);
			this._transitionTime(time);
			this._translate(x, y);
		} else {
			this._animate(x, y, time, easing.fn);
		}
	},

	scrollToElement: function (el, time, offsetX, offsetY, easing) {
		el = el.nodeType ? el : this.scroller.querySelector(el);

		if ( !el ) {
			return;
		}

		var pos = utils.offset(el);

		pos.left -= this.wrapperOffset.left;
		pos.top  -= this.wrapperOffset.top;

		// if offsetX/Y are true we center the element to the screen
		if ( offsetX === true ) {
			offsetX = Math.round(el.offsetWidth / 2 - this.wrapper.offsetWidth / 2);
		}
		if ( offsetY === true ) {
			offsetY = Math.round(el.offsetHeight / 2 - this.wrapper.offsetHeight / 2);
		}

		pos.left -= offsetX || 0;
		pos.top  -= offsetY || 0;

		pos.left = pos.left > 0 ? 0 : pos.left < this.maxScrollX ? this.maxScrollX : pos.left;
		pos.top  = pos.top  > 0 ? 0 : pos.top  < this.maxScrollY ? this.maxScrollY : pos.top;

		time = time === undefined || time === null || time === 'auto' ? Math.max(Math.abs(this.x-pos.left), Math.abs(this.y-pos.top)) : time;

		this.scrollTo(pos.left, pos.top, time, easing);
	},

	_transitionTime: function (time) {
		time = time || 0;
		this.scrollerStyle[utils.style.transitionDuration] = time + 'ms';

// INSERT POINT: _transitionTime

	},

	_transitionTimingFunction: function (easing) {
		this.scrollerStyle[utils.style.transitionTimingFunction] = easing;

// INSERT POINT: _transitionTimingFunction

	},

	_translate: function (x, y) {
		if ( this.options.useTransform ) {

/* REPLACE START: _translate */

			this.scrollerStyle[utils.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.translateZ;

/* REPLACE END: _translate */

		} else {
			x = Math.round(x);
			y = Math.round(y);
			this.scrollerStyle.left = x + 'px';
			this.scrollerStyle.top = y + 'px';
		}

		this.x = x;
		this.y = y;

// INSERT POINT: _translate

	},

	_initEvents: function (remove) {
		var eventType = remove ? utils.removeEvent : utils.addEvent,
			target = this.options.bindToWrapper ? this.wrapper : window;

		eventType(window, 'orientationchange', this);
		eventType(window, 'resize', this);

		if ( this.options.click ) {
			eventType(this.wrapper, 'click', this, true);
		}

		if ( !this.options.disableMouse ) {
			eventType(this.wrapper, 'mousedown', this);
			eventType(target, 'mousemove', this);
			eventType(target, 'mousecancel', this);
			eventType(target, 'mouseup', this);
		}

		if ( utils.hasPointer && !this.options.disablePointer ) {
			eventType(this.wrapper, 'MSPointerDown', this);
			eventType(target, 'MSPointerMove', this);
			eventType(target, 'MSPointerCancel', this);
			eventType(target, 'MSPointerUp', this);
		}

		if ( utils.hasTouch && !this.options.disableTouch ) {
			eventType(this.wrapper, 'touchstart', this);
			eventType(target, 'touchmove', this);
			eventType(target, 'touchcancel', this);
			eventType(target, 'touchend', this);
		}

		eventType(this.scroller, 'transitionend', this);
		eventType(this.scroller, 'webkitTransitionEnd', this);
		eventType(this.scroller, 'oTransitionEnd', this);
		eventType(this.scroller, 'MSTransitionEnd', this);
	},

	getComputedPosition: function () {
		var matrix = window.getComputedStyle(this.scroller, null),
			x, y;

		if ( this.options.useTransform ) {
			matrix = matrix[utils.style.transform].split(')')[0].split(', ');
			x = +(matrix[12] || matrix[4]);
			y = +(matrix[13] || matrix[5]);
		} else {
			x = +matrix.left.replace(/[^-\d]/g, '');
			y = +matrix.top.replace(/[^-\d]/g, '');
		}

		return { x: x, y: y };
	},

	_animate: function (destX, destY, duration, easingFn) {
		var that = this,
			startX = this.x,
			startY = this.y,
			startTime = utils.getTime(),
			destTime = startTime + duration;

		function step () {
			var now = utils.getTime(),
				newX, newY,
				easing;

			if ( now >= destTime ) {
				that.isAnimating = false;
				that._translate(destX, destY);

				if ( !that.resetPosition(that.options.bounceTime) ) {
					that._execEvent('scrollEnd');
				}

				return;
			}

			now = ( now - startTime ) / duration;
			easing = easingFn(now);
			newX = ( destX - startX ) * easing + startX;
			newY = ( destY - startY ) * easing + startY;
			that._translate(newX, newY);

			if ( that.isAnimating ) {
				rAF(step);
			}
		}

		this.isAnimating = true;
		step();
	},
	handleEvent: function (e) {
		switch ( e.type ) {
			case 'touchstart':
			case 'MSPointerDown':
			case 'mousedown':
				this._start(e);
				break;
			case 'touchmove':
			case 'MSPointerMove':
			case 'mousemove':
				this._move(e);
				break;
			case 'touchend':
			case 'MSPointerUp':
			case 'mouseup':
			case 'touchcancel':
			case 'MSPointerCancel':
			case 'mousecancel':
				this._end(e);
				break;
			case 'orientationchange':
			case 'resize':
				this._resize();
				break;
			case 'transitionend':
			case 'webkitTransitionEnd':
			case 'oTransitionEnd':
			case 'MSTransitionEnd':
				this._transitionEnd(e);
				break;
			case 'DOMMouseScroll':
			case 'mousewheel':
				this._wheel(e);
				break;
			case 'keydown':
				this._key(e);
				break;
			case 'click':
				if ( !e._constructed ) {
					e.preventDefault();
					e.stopPropagation();
				}
				break;
		}
	}
};
IScroll.ease = utils.ease;

return IScroll;

})(window, document, Math);
/**
 * MicroEvent - to make any js object an event emitter (server or browser)
 * 
 * - pure javascript - server compatible, browser compatible
 * - dont rely on the browser doms
 * - super simple - you get it immediatly, no mistery, no magic involved
 *
 * - create a MicroEventDebug with goodies to debug
 *   - make it safer to use
*/

/** NOTE: This library is customized for Onsen UI. */

var MicroEvent  = function(){};
MicroEvent.prototype  = {
  on  : function(event, fct){
    this._events = this._events || {};
    this._events[event] = this._events[event] || [];
    this._events[event].push(fct);
  },
  once : function(event, fct){
    var self = this;
    var wrapper = function() {
      self.off(wrapper);
      return fct.apply(null, arguments);
    };
    this.on(event, wrapper);
  },
  off  : function(event, fct){
    this._events = this._events || {};
    if( event in this._events === false  )  return;
    this._events[event].splice(this._events[event].indexOf(fct), 1);
  },
  emit : function(event /* , args... */){
    this._events = this._events || {};
    if( event in this._events === false  )  return;
    for(var i = 0; i < this._events[event].length; i++){
      this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
    }
  }
};

/**
 * mixin will delegate all MicroEvent.js function in the destination object
 *
 * - require('MicroEvent').mixin(Foobar) will make Foobar able to use MicroEvent
 *
 * @param {Object} the object which will support MicroEvent
*/
MicroEvent.mixin  = function(destObject){
  var props = ['on', 'once', 'off', 'emit'];
  for(var i = 0; i < props.length; i ++){
    if( typeof destObject === 'function' ){
      destObject.prototype[props[i]]  = MicroEvent.prototype[props[i]];
    }else{
      destObject[props[i]] = MicroEvent.prototype[props[i]];
    }
  }
}

// export in common js
if( typeof module !== "undefined" && ('exports' in module)){
  module.exports  = MicroEvent;
}

/* Modernizr 2.6.2 (Custom Build) | MIT & BSD
 * Build: http://modernizr.com/download/#-borderradius-boxshadow-cssanimations-csstransforms-csstransforms3d-csstransitions-canvas-svg-shiv-cssclasses-teststyles-testprop-testallprops-prefixes-domprefixes-load
 */
;



window.Modernizr = (function( window, document, undefined ) {

    var version = '2.6.2',

    Modernizr = {},

    enableClasses = true,

    docElement = document.documentElement,

    mod = 'modernizr',
    modElem = document.createElement(mod),
    mStyle = modElem.style,

    inputElem  ,


    toString = {}.toString,

    prefixes = ' -webkit- -moz- -o- -ms- '.split(' '),



    omPrefixes = 'Webkit Moz O ms',

    cssomPrefixes = omPrefixes.split(' '),

    domPrefixes = omPrefixes.toLowerCase().split(' '),

    ns = {'svg': 'http://www.w3.org/2000/svg'},

    tests = {},
    inputs = {},
    attrs = {},

    classes = [],

    slice = classes.slice,

    featureName, 


    injectElementWithStyles = function( rule, callback, nodes, testnames ) {

      var style, ret, node, docOverflow,
          div = document.createElement('div'),
                body = document.body,
                fakeBody = body || document.createElement('body');

      if ( parseInt(nodes, 10) ) {
                      while ( nodes-- ) {
              node = document.createElement('div');
              node.id = testnames ? testnames[nodes] : mod + (nodes + 1);
              div.appendChild(node);
          }
      }

                style = ['&#173;','<style id="s', mod, '">', rule, '</style>'].join('');
      div.id = mod;
          (body ? div : fakeBody).innerHTML += style;
      fakeBody.appendChild(div);
      if ( !body ) {
                fakeBody.style.background = '';
                fakeBody.style.overflow = 'hidden';
          docOverflow = docElement.style.overflow;
          docElement.style.overflow = 'hidden';
          docElement.appendChild(fakeBody);
      }

      ret = callback(div, rule);
        if ( !body ) {
          fakeBody.parentNode.removeChild(fakeBody);
          docElement.style.overflow = docOverflow;
      } else {
          div.parentNode.removeChild(div);
      }

      return !!ret;

    },
    _hasOwnProperty = ({}).hasOwnProperty, hasOwnProp;

    if ( !is(_hasOwnProperty, 'undefined') && !is(_hasOwnProperty.call, 'undefined') ) {
      hasOwnProp = function (object, property) {
        return _hasOwnProperty.call(object, property);
      };
    }
    else {
      hasOwnProp = function (object, property) { 
        return ((property in object) && is(object.constructor.prototype[property], 'undefined'));
      };
    }


    if (!Function.prototype.bind) {
      Function.prototype.bind = function bind(that) {

        var target = this;

        if (typeof target != "function") {
            throw new TypeError();
        }

        var args = slice.call(arguments, 1),
            bound = function () {

            if (this instanceof bound) {

              var F = function(){};
              F.prototype = target.prototype;
              var self = new F();

              var result = target.apply(
                  self,
                  args.concat(slice.call(arguments))
              );
              if (Object(result) === result) {
                  return result;
              }
              return self;

            } else {

              return target.apply(
                  that,
                  args.concat(slice.call(arguments))
              );

            }

        };

        return bound;
      };
    }

    function setCss( str ) {
        mStyle.cssText = str;
    }

    function setCssAll( str1, str2 ) {
        return setCss(prefixes.join(str1 + ';') + ( str2 || '' ));
    }

    function is( obj, type ) {
        return typeof obj === type;
    }

    function contains( str, substr ) {
        return !!~('' + str).indexOf(substr);
    }

    function testProps( props, prefixed ) {
        for ( var i in props ) {
            var prop = props[i];
            if ( !contains(prop, "-") && mStyle[prop] !== undefined ) {
                return prefixed == 'pfx' ? prop : true;
            }
        }
        return false;
    }

    function testDOMProps( props, obj, elem ) {
        for ( var i in props ) {
            var item = obj[props[i]];
            if ( item !== undefined) {

                            if (elem === false) return props[i];

                            if (is(item, 'function')){
                                return item.bind(elem || obj);
                }

                            return item;
            }
        }
        return false;
    }

    function testPropsAll( prop, prefixed, elem ) {

        var ucProp  = prop.charAt(0).toUpperCase() + prop.slice(1),
            props   = (prop + ' ' + cssomPrefixes.join(ucProp + ' ') + ucProp).split(' ');

            if(is(prefixed, "string") || is(prefixed, "undefined")) {
          return testProps(props, prefixed);

            } else {
          props = (prop + ' ' + (domPrefixes).join(ucProp + ' ') + ucProp).split(' ');
          return testDOMProps(props, prefixed, elem);
        }
    }



    tests['canvas'] = function() {
        var elem = document.createElement('canvas');
        return !!(elem.getContext && elem.getContext('2d'));
    };
    tests['borderradius'] = function() {
        return testPropsAll('borderRadius');
    };

    tests['boxshadow'] = function() {
        return testPropsAll('boxShadow');
    };
    tests['cssanimations'] = function() {
        return testPropsAll('animationName');
    };



    tests['csstransforms'] = function() {
        return !!testPropsAll('transform');
    };


    tests['csstransforms3d'] = function() {

        var ret = !!testPropsAll('perspective');

                        if ( ret && 'webkitPerspective' in docElement.style ) {

                      injectElementWithStyles('@media (transform-3d),(-webkit-transform-3d){#modernizr{left:9px;position:absolute;height:3px;}}', function( node, rule ) {
            ret = node.offsetLeft === 9 && node.offsetHeight === 3;
          });
        }
        return ret;
    };


    tests['csstransitions'] = function() {
        return testPropsAll('transition');
    };



    tests['svg'] = function() {
        return !!document.createElementNS && !!document.createElementNS(ns.svg, 'svg').createSVGRect;
    };
    for ( var feature in tests ) {
        if ( hasOwnProp(tests, feature) ) {
                                    featureName  = feature.toLowerCase();
            Modernizr[featureName] = tests[feature]();

            classes.push((Modernizr[featureName] ? '' : 'no-') + featureName);
        }
    }



     Modernizr.addTest = function ( feature, test ) {
       if ( typeof feature == 'object' ) {
         for ( var key in feature ) {
           if ( hasOwnProp( feature, key ) ) {
             Modernizr.addTest( key, feature[ key ] );
           }
         }
       } else {

         feature = feature.toLowerCase();

         if ( Modernizr[feature] !== undefined ) {
                                              return Modernizr;
         }

         test = typeof test == 'function' ? test() : test;

         if (typeof enableClasses !== "undefined" && enableClasses) {
           docElement.className += ' ' + (test ? '' : 'no-') + feature;
         }
         Modernizr[feature] = test;

       }

       return Modernizr; 
     };


    setCss('');
    modElem = inputElem = null;

    ;(function(window, document) {
        var options = window.html5 || {};

        var reSkip = /^<|^(?:button|map|select|textarea|object|iframe|option|optgroup)$/i;

        var saveClones = /^(?:a|b|code|div|fieldset|h1|h2|h3|h4|h5|h6|i|label|li|ol|p|q|span|strong|style|table|tbody|td|th|tr|ul)$/i;

        var supportsHtml5Styles;

        var expando = '_html5shiv';

        var expanID = 0;

        var expandoData = {};

        var supportsUnknownElements;

      (function() {
        try {
            var a = document.createElement('a');
            a.innerHTML = '<xyz></xyz>';
                    supportsHtml5Styles = ('hidden' in a);

            supportsUnknownElements = a.childNodes.length == 1 || (function() {
                        (document.createElement)('a');
              var frag = document.createDocumentFragment();
              return (
                typeof frag.cloneNode == 'undefined' ||
                typeof frag.createDocumentFragment == 'undefined' ||
                typeof frag.createElement == 'undefined'
              );
            }());
        } catch(e) {
          supportsHtml5Styles = true;
          supportsUnknownElements = true;
        }

      }());        function addStyleSheet(ownerDocument, cssText) {
        var p = ownerDocument.createElement('p'),
            parent = ownerDocument.getElementsByTagName('head')[0] || ownerDocument.documentElement;

        p.innerHTML = 'x<style>' + cssText + '</style>';
        return parent.insertBefore(p.lastChild, parent.firstChild);
      }

        function getElements() {
        var elements = html5.elements;
        return typeof elements == 'string' ? elements.split(' ') : elements;
      }

          function getExpandoData(ownerDocument) {
        var data = expandoData[ownerDocument[expando]];
        if (!data) {
            data = {};
            expanID++;
            ownerDocument[expando] = expanID;
            expandoData[expanID] = data;
        }
        return data;
      }

        function createElement(nodeName, ownerDocument, data){
        if (!ownerDocument) {
            ownerDocument = document;
        }
        if(supportsUnknownElements){
            return ownerDocument.createElement(nodeName);
        }
        if (!data) {
            data = getExpandoData(ownerDocument);
        }
        var node;

        if (data.cache[nodeName]) {
            node = data.cache[nodeName].cloneNode();
        } else if (saveClones.test(nodeName)) {
            node = (data.cache[nodeName] = data.createElem(nodeName)).cloneNode();
        } else {
            node = data.createElem(nodeName);
        }

                                    return node.canHaveChildren && !reSkip.test(nodeName) ? data.frag.appendChild(node) : node;
      }

        function createDocumentFragment(ownerDocument, data){
        if (!ownerDocument) {
            ownerDocument = document;
        }
        if(supportsUnknownElements){
            return ownerDocument.createDocumentFragment();
        }
        data = data || getExpandoData(ownerDocument);
        var clone = data.frag.cloneNode(),
            i = 0,
            elems = getElements(),
            l = elems.length;
        for(;i<l;i++){
            clone.createElement(elems[i]);
        }
        return clone;
      }

        function shivMethods(ownerDocument, data) {
        if (!data.cache) {
            data.cache = {};
            data.createElem = ownerDocument.createElement;
            data.createFrag = ownerDocument.createDocumentFragment;
            data.frag = data.createFrag();
        }


        ownerDocument.createElement = function(nodeName) {
                if (!html5.shivMethods) {
              return data.createElem(nodeName);
          }
          return createElement(nodeName, ownerDocument, data);
        };

        ownerDocument.createDocumentFragment = Function('h,f', 'return function(){' +
          'var n=f.cloneNode(),c=n.createElement;' +
          'h.shivMethods&&(' +
                    getElements().join().replace(/\w+/g, function(nodeName) {
              data.createElem(nodeName);
              data.frag.createElement(nodeName);
              return 'c("' + nodeName + '")';
            }) +
          ');return n}'
        )(html5, data.frag);
      }        function shivDocument(ownerDocument) {
        if (!ownerDocument) {
            ownerDocument = document;
        }
        var data = getExpandoData(ownerDocument);

        if (html5.shivCSS && !supportsHtml5Styles && !data.hasCSS) {
          data.hasCSS = !!addStyleSheet(ownerDocument,
                    'article,aside,figcaption,figure,footer,header,hgroup,nav,section{display:block}' +
                    'mark{background:#FF0;color:#000}'
          );
        }
        if (!supportsUnknownElements) {
          shivMethods(ownerDocument, data);
        }
        return ownerDocument;
      }        var html5 = {

            'elements': options.elements || 'abbr article aside audio bdi canvas data datalist details figcaption figure footer header hgroup mark meter nav output progress section summary time video',

            'shivCSS': (options.shivCSS !== false),

            'supportsUnknownElements': supportsUnknownElements,

            'shivMethods': (options.shivMethods !== false),

            'type': 'default',

            'shivDocument': shivDocument,

            createElement: createElement,

            createDocumentFragment: createDocumentFragment
      };        window.html5 = html5;

        shivDocument(document);

    }(this, document));

    Modernizr._version      = version;

    Modernizr._prefixes     = prefixes;
    Modernizr._domPrefixes  = domPrefixes;
    Modernizr._cssomPrefixes  = cssomPrefixes;



    Modernizr.testProp      = function(prop){
        return testProps([prop]);
    };

    Modernizr.testAllProps  = testPropsAll;


    Modernizr.testStyles    = injectElementWithStyles;    docElement.className = docElement.className.replace(/(^|\s)no-js(\s|$)/, '$1$2') +

                                                    (enableClasses ? ' js ' + classes.join(' ') : '');

    return Modernizr;

})(this, this.document);
/*yepnope1.5.4|WTFPL*/
(function(a,b,c){function d(a){return"[object Function]"==o.call(a)}function e(a){return"string"==typeof a}function f(){}function g(a){return!a||"loaded"==a||"complete"==a||"uninitialized"==a}function h(){var a=p.shift();q=1,a?a.t?m(function(){("c"==a.t?B.injectCss:B.injectJs)(a.s,0,a.a,a.x,a.e,1)},0):(a(),h()):q=0}function i(a,c,d,e,f,i,j){function k(b){if(!o&&g(l.readyState)&&(u.r=o=1,!q&&h(),l.onload=l.onreadystatechange=null,b)){"img"!=a&&m(function(){t.removeChild(l)},50);for(var d in y[c])y[c].hasOwnProperty(d)&&y[c][d].onload()}}var j=j||B.errorTimeout,l=b.createElement(a),o=0,r=0,u={t:d,s:c,e:f,a:i,x:j};1===y[c]&&(r=1,y[c]=[]),"object"==a?l.data=c:(l.src=c,l.type=a),l.width=l.height="0",l.onerror=l.onload=l.onreadystatechange=function(){k.call(this,r)},p.splice(e,0,u),"img"!=a&&(r||2===y[c]?(t.insertBefore(l,s?null:n),m(k,j)):y[c].push(l))}function j(a,b,c,d,f){return q=0,b=b||"j",e(a)?i("c"==b?v:u,a,b,this.i++,c,d,f):(p.splice(this.i++,0,a),1==p.length&&h()),this}function k(){var a=B;return a.loader={load:j,i:0},a}var l=b.documentElement,m=a.setTimeout,n=b.getElementsByTagName("script")[0],o={}.toString,p=[],q=0,r="MozAppearance"in l.style,s=r&&!!b.createRange().compareNode,t=s?l:n.parentNode,l=a.opera&&"[object Opera]"==o.call(a.opera),l=!!b.attachEvent&&!l,u=r?"object":l?"script":"img",v=l?"script":u,w=Array.isArray||function(a){return"[object Array]"==o.call(a)},x=[],y={},z={timeout:function(a,b){return b.length&&(a.timeout=b[0]),a}},A,B;B=function(a){function b(a){var a=a.split("!"),b=x.length,c=a.pop(),d=a.length,c={url:c,origUrl:c,prefixes:a},e,f,g;for(f=0;f<d;f++)g=a[f].split("="),(e=z[g.shift()])&&(c=e(c,g));for(f=0;f<b;f++)c=x[f](c);return c}function g(a,e,f,g,h){var i=b(a),j=i.autoCallback;i.url.split(".").pop().split("?").shift(),i.bypass||(e&&(e=d(e)?e:e[a]||e[g]||e[a.split("/").pop().split("?")[0]]),i.instead?i.instead(a,e,f,g,h):(y[i.url]?i.noexec=!0:y[i.url]=1,f.load(i.url,i.forceCSS||!i.forceJS&&"css"==i.url.split(".").pop().split("?").shift()?"c":c,i.noexec,i.attrs,i.timeout),(d(e)||d(j))&&f.load(function(){k(),e&&e(i.origUrl,h,g),j&&j(i.origUrl,h,g),y[i.url]=2})))}function h(a,b){function c(a,c){if(a){if(e(a))c||(j=function(){var a=[].slice.call(arguments);k.apply(this,a),l()}),g(a,j,b,0,h);else if(Object(a)===a)for(n in m=function(){var b=0,c;for(c in a)a.hasOwnProperty(c)&&b++;return b}(),a)a.hasOwnProperty(n)&&(!c&&!--m&&(d(j)?j=function(){var a=[].slice.call(arguments);k.apply(this,a),l()}:j[n]=function(a){return function(){var b=[].slice.call(arguments);a&&a.apply(this,b),l()}}(k[n])),g(a[n],j,b,n,h))}else!c&&l()}var h=!!a.test,i=a.load||a.both,j=a.callback||f,k=j,l=a.complete||f,m,n;c(h?a.yep:a.nope,!!i),i&&c(i)}var i,j,l=this.yepnope.loader;if(e(a))g(a,0,l,0);else if(w(a))for(i=0;i<a.length;i++)j=a[i],e(j)?g(j,0,l,0):w(j)?B(j):Object(j)===j&&h(j,l);else Object(a)===a&&h(a,l)},B.addPrefix=function(a,b){z[a]=b},B.addFilter=function(a){x.push(a)},B.errorTimeout=1e4,null==b.readyState&&b.addEventListener&&(b.readyState="loading",b.addEventListener("DOMContentLoaded",A=function(){b.removeEventListener("DOMContentLoaded",A,0),b.readyState="complete"},0)),a.yepnope=k(),a.yepnope.executeStack=h,a.yepnope.injectJs=function(a,c,d,e,i,j){var k=b.createElement("script"),l,o,e=e||B.errorTimeout;k.src=a;for(o in d)k.setAttribute(o,d[o]);c=j?h:c||f,k.onreadystatechange=k.onload=function(){!l&&g(k.readyState)&&(l=1,c(),k.onload=k.onreadystatechange=null)},m(function(){l||(l=1,c(1))},e),i?k.onload():n.parentNode.insertBefore(k,n)},a.yepnope.injectCss=function(a,c,d,e,g,i){var e=b.createElement("link"),j,c=i?h:c||f;e.href=a,e.rel="stylesheet",e.type="text/css";for(j in d)e.setAttribute(j,d[j]);g||(n.parentNode.insertBefore(e,n),m(c,0))}})(this,document);
Modernizr.load=function(){yepnope.apply(window,[].slice.call(arguments,0));};
;
(function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
/*
Copyright (c) 2012 Barnesandnoble.com, llc, Donavon West, and Domenic Denicola

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var setImmediate;

    function addFromSetImmediateArguments(args) {
        tasksByHandle[nextHandle] = partiallyApplied.apply(undefined, args);
        return nextHandle++;
    }

    // This function accepts the same arguments as setImmediate, but
    // returns a function that requires no arguments.
    function partiallyApplied(handler) {
        var args = [].slice.call(arguments, 1);
        return function() {
            if (typeof handler === "function") {
                handler.apply(undefined, args);
            } else {
                (new Function("" + handler))();
            }
        };
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(partiallyApplied(runIfPresent, handle), 0);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    task();
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function installNextTickImplementation() {
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            process.nextTick(partiallyApplied(runIfPresent, handle));
            return handle;
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            global.postMessage(messagePrefix + handle, "*");
            return handle;
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            channel.port2.postMessage(handle);
            return handle;
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
            return handle;
        };
    }

    function installSetTimeoutImplementation() {
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            setTimeout(partiallyApplied(runIfPresent, handle), 0);
            return handle;
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(new Function("return this")()));

(function() {
    function Viewport() {

        this.PRE_IOS7_VIEWPORT = "initial-scale=1, maximum-scale=1, user-scalable=no";
        this.IOS7_VIEWPORT = "width=device-width, height=device-height, initial-scale=1, maximum-scale=1, user-scalable=no";
        this.DEFAULT_VIEWPORT = "initial-scale=1, maximum-scale=1, user-scalable=no";
        
        this.ensureViewportElement();
        this.platform = {};
        this.platform.name = this.getPlatformName();
        this.platform.version = this.getPlatformVersion();

        return this;
    };

    Viewport.prototype.ensureViewportElement = function(){
        this.viewportElement = document.querySelector('meta[name=viewport]');
        if(!this.viewportElement){
            this.viewportElement = document.createElement('meta');
            this.viewportElement.name = "viewport";
            document.head.appendChild(this.viewportElement);
        }        
    },

    Viewport.prototype.setup = function() {
        if (!this.viewportElement) {
            return;
        }

        if (this.viewportElement.getAttribute('data-no-adjust') == "true") {
            return;
        }

        if (this.platform.name == 'ios') {
            if (this.platform.version >= 7 && isWebView()) {
                this.viewportElement.setAttribute('content', this.IOS7_VIEWPORT);
            } else {
                this.viewportElement.setAttribute('content', this.PRE_IOS7_VIEWPORT);
            }
        } else {
            this.viewportElement.setAttribute('content', this.DEFAULT_VIEWPORT);
        }

        function isWebView() {
            return !!(window.cordova || window.phonegap || window.PhoneGap);
        }
    };

    Viewport.prototype.getPlatformName = function() {
        if (navigator.userAgent.match(/Android/i)) {
            return "android";
        }

        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            return "ios";
        }

        // unknown
        return undefined;
    };

    Viewport.prototype.getPlatformVersion = function() {
        var start = window.navigator.userAgent.indexOf('OS ');
        return window.Number(window.navigator.userAgent.substr(start + 3, 3).replace('_', '.'));
    };

    window.Viewport = Viewport;
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/back_button.tpl",
    "<span class=\"icon-button--quiet {{modifierTemplater('icon-button--quiet--*')}}\" ng-click=\"$root.ons.getDirectiveObject('ons-navigator', $event).popPage()\" style=\"height: 44px; line-height: 0; padding: 0; position: relative;\">\n" +
    "  <i class=\"fa fa-angle-left ons-back-button__icon\" style=\"vertical-align: top; line-height: 44px; font-size: 36px; padding-left: 8px; padding-right: 4px; height: 44px; width: 14px;\"></i><span style=\"vertical-align: top; display: inline-block; line-height: 44px; height: 44px;\" class=\"back-button__label\"></span>\n" +
    "</span>\n" +
    "");
}]);
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/button.tpl",
    "<button class=\"{{item.animation}} button--{{onsType}} effeckt-button button no-select {{modifierTemplater('button--*')}}\">\n" +
    "  <span class=\"label ons-button-inner\" ng-transclude></span>\n" +
    "  <span class=\"spinner button__spinner {{modifierTemplater('button--*__spinner')}}\"></span>\n" +
    "</button>\n" +
    "");
}]);
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/icon.tpl",
    "<i class=\"fa fa-{{icon}} fa-{{spin}} fa-{{fixedWidth}} fa-rotate-{{rotate}} fa-flip-{{flip}}\" ng-class=\"sizeClass\" ng-style=\"style\"></i>\n" +
    "");
}]);
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/row.tpl",
    "<div class=\"row row-{{align}} ons-row-inner\"></div>\n" +
    "");
}]);
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/screen.tpl",
    "<div class=\"ons-screen\"></div>\n" +
    "");
}]);
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/scroller.tpl",
    "<div class=\"ons-scroller__content ons-scroller-inner\" ng-transclude></div>\n" +
    "");
}]);
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/sliding_menu.tpl",
    "<div class=\"onsen-sliding-menu__behind ons-sliding-menu-inner\"></div>\n" +
    "<div class=\"onsen-sliding-menu__above ons-sliding-menu-inner\"></div>\n" +
    "");
}]);
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/split_view.tpl",
    "<div class=\"onsen-split-view__secondary full-screen ons-split-view-inner\"></div>\n" +
    "<div class=\"onsen-split-view__main full-screen ons-split-view-inner\"></div>\n" +
    "");
}]);
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/switch.tpl",
    "<label class=\"switch {{modifierTemplater('switch--*')}}\">\n" +
    "  <input type=\"checkbox\" class=\"switch__input {{modifierTemplater('switch--*__input')}}\" ng-model=\"model\">\n" +
    "  <div class=\"switch__toggle {{modifierTemplater('switch--*__toggle')}}\"></div>\n" +
    "</label>\n" +
    "");
}]);
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/tab_bar.tpl",
    "<div style=\"margin-bottom: {{tabbarHeight}}\" class=\"ons-tab-bar__content\"></div>\n" +
    "<div ng-hide=\"hideTabs\" class=\"tab-bar ons-tab-bar__footer {{modifierTemplater('tab-bar--*')}} ons-tabbar-inner\" ng-transclude></div>\n" +
    "");
}]);
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/tab_bar_item.tpl",
    "<label class=\"tab-bar__item {{tabbarModifierTemplater('tab-bar--*__item')}} {{modifierTemplater('tab-bar__item--*')}}\">\n" +
    "  <input type=\"radio\" name=\"tab-bar-{{tabbarId}}\" ng-click=\"setActive()\">\n" +
    "  <button class=\"tab-bar__button {{tabbarModifierTemplater('tab-bar--*__button')}} {{modifierTemplater('tab-bar__button--*')}}\" ng-click=\"setActive()\">\n" +
    "    <i ng-show=\"icon != undefined\" class=\"tab-bar__icon fa fa-2x fa-{{tabIcon}} {{tabIcon}}\"></i>\n" +
    "    <div class=\"tab-bar__label\">{{label}}</div>\n" +
    "  </button>\n" +
    "</label>\n" +
    "");
}]);
})();

(function(module) {
try { app = angular.module("templates-main"); }
catch(err) { app = angular.module("templates-main", []); }
app.run(["$templateCache", function($templateCache) {
  "use strict";
  $templateCache.put("templates/toolbar_button.tpl",
    "<span class=\"icon-button--quiet {{modifierTemplater('icon-button--quiet--*')}} navigation-bar__line-height\" ng-transclude></span>\n" +
    "");
}]);
})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/


window.DoorLock = (function() {
  /**
   * Door locking system.
   *
   * @param {Object} [options]
   * @param {Function} [options.log]
   */
  var DoorLock = function(options) {
    options = options || {};
    this._lockList = [];
    this._waitList = [];
    this._log = options.log || function() {};
  };

  DoorLock.generateId = (function() {
    var i = 0;
    return function() {
      return i++;
    };
  })();

  DoorLock.prototype = {
    /**
     * Register a lock.
     *
     * @return {Function} Callback for unlocking.
     */
    lock: function() {
      var self = this;
      var unlock = function() {
        self._unlock(unlock);
      };
      unlock.id = DoorLock.generateId();
      this._lockList.push(unlock);
      this._log('lock: ' + (unlock.id));

      return unlock;
    },

    _unlock: function(fn) {
      var index = this._lockList.indexOf(fn);
      if (index === -1) {
        throw new Error('This function is not registered in the lock list.');
      }

      this._lockList.splice(index, 1);
      this._log('unlock: ' + fn.id);

      this._tryToFreeWaitList();
    },

    _tryToFreeWaitList: function() {
      while (!this.isLocked() && this._waitList.length > 0) {
        this._waitList.shift()();
      }
    },

    /**
     * Register a callback for waiting unlocked door.
     *
     * @params {Function} callback Callback on unlocking the door completely.
     */
    waitUnlock: function(callback) {
      if (!(callback instanceof Function)) {
        throw new Error('The callback param must be a function.');
      }

      if (this.isLocked()) {
        this._waitList.push(callback);
      } else {
        callback();
      }
    },

    /**
     * @return {Boolean}
     */
    isLocked: function() {
      return this._lockList.length > 0;
    }
  };

  return DoorLock;

})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function(){
  'use strict';

  var module = angular.module('onsen', ['templates-main']);

  var readyLock = new DoorLock();

  var unlockOnsenUI = readyLock.lock();

  // for BC
  angular.module('onsen.directives', ['onsen']);

  var onsenService;
  module.run(function($compile, $rootScope, $onsen) {
    onsenService = $onsen;

    $rootScope.ons = window.ons;
    $rootScope.console = window.console;
    $rootScope.alert = window.alert;

    ons.$compile = $compile;
    $rootScope.$on('$ons-ready', function() {
      unlockOnsenUI();
    });

    // for initialization hook.
    if (document.readyState === 'loading' || document.readyState == 'uninitialized') {
      angular.element(document.body).on('DOMContentLoaded', function() {
        var dom = document.createElement('ons-dummy-for-init');
        document.body.appendChild(dom);
      });
    } else if (document.body) {
      var dom = document.createElement('ons-dummy-for-init');
      document.body.appendChild(dom);
    } else {
      throw new Error('Invalid initialization state.');
    }

    if (document.body) {
      angular.element(document.body).attr('ng-cloak', 'ng-cloak');
    }

  });

  // JS Global facade for Onsen UI.
  var ons = window.ons = {

    _readyLock: readyLock,

    _unlockersDict: {},

    /**
     * Bootstrap this document as a Onsen UI application.
     *
     * If you want use your AngularJS module, use "ng-app" directive and "angular.module()" manually.
     */
    bootstrap : function() {
      var doc = window.document;
      if (doc.readyState == 'loading' || doc.readyState == 'uninitialized') {
        doc.addEventListener('DOMContentLoaded', function() {
          angular.bootstrap(doc.documentElement, ['onsen']);
        }, false);
      } else if (doc.documentElement) {
        angular.bootstrap(doc.documentElement, ['onsen']);
      } else {
        throw new Error('Invalid state');
      }
    },

    /**
     * @param {String} name
     * @param {Object/jqLite/HTMLElement} dom $event object or jqLite object or HTMLElement object.
     * @return {Object}
     */
    getDirectiveObject: function(name, dom) {
      var element;
      if (dom instanceof HTMLElement) {
        element = angular.element(dom);
      } else if (dom instanceof angular.element) {
        element = dom;
      } else if (dom.target) {
        element = angular.element(dom.target);
      }

      return element.inheritedData(name);
    },

    /**
     * @return {Boolean}
     */
    isReady: function() {
      return !readyLock.isLocked();
    },

    /**
     * @param {HTMLElement} dom
     */
    compile : function(dom) {
      if (!ons.$compile) {
        throw new Error('ons.$compile() is not ready. Wait for initialization with ons.ready().');
      }

      if (!(dom instanceof HTMLElement)) {
        throw new Error('First argument must be an instance of HTMLElement.');
      }

      var scope = angular.element(dom).scope();
      if (!scope) {
        throw new Error('AngularJS Scope is null. Argument DOM element must be attached in DOM document.');
      }

      ons.$compile(dom)(scope);
    },

    /**
     * @return {BackButtonHandlerStack}
     */
    getBackButtonHandlerStack: function() {
      return this._getOnsenService().backButtonHandlerStack;
    },

    _getOnsenService: function() {
      if (!onsenService) {
        throw new Error('$onsen is not loaded, wait for ons.ready().');
      }

      return onsenService;
    },

    /**
     * @param {Array} [dependencies]
     * @param {Function} callback
     */
    ready : function(/* dependencies, */callback) {
      if (callback instanceof Function) {
        if (ons.isReady()) {
          callback();
        } else {
          readyLock.waitUnlock(callback);
        }
      } else if (angular.isArray(callback) && arguments[1] instanceof Function) {
        var dependencies = callback;
        callback = arguments[1];

        ons.ready(function() {
          var $onsen = ons._getOnsenService();
          $onsen.waitForVariables(dependencies, callback);
        });
      }
    },

    /**
     * @return {Boolean}
     */
    isWebView: function() {

      if (document.readyState === 'loading' || document.readyState == 'uninitialized') {
        throw new Error('isWebView() method is available after dom contents loaded.');
      }

      return !!(window.cordova || window.phonegap || window.PhoneGap);
    }
  };


  var unlockDeviceReady = readyLock.lock();
  window.addEventListener('DOMContentLoaded', function() {
    if (ons.isWebView()) {
      window.document.addEventListener('deviceready', unlockDeviceReady, false);
    } else {
      unlockDeviceReady();
    }
  }, false);

})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict;';

  var module = angular.module('onsen');

  module.factory('FadeTransitionAnimator', function(NavigatorTransitionAnimator) {

    /**
     * Fade-in screen transition.
     */
    var FadeTransitionAnimator = NavigatorTransitionAnimator.extend({

      /**
       * @param {Object} enterPage
       * @param {Object} leavePage
       * @param {Function} callback
       */
      push: function(enterPage, leavePage, callback) {

        animit.runAll(

          animit(enterPage.controller.getContentElement())
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
                opacity: 0
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
                opacity: 1
              },
              duration: 0.4,
              timing: 'linear'
            })
            .resetStyle()
            .queue(function(done) {
              callback();
              done();
            }),

          animit(enterPage.controller.getToolbarElement())
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
                opacity: 0
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
                opacity: 1
              },
              duration: 0.4,
              timing: 'linear'
            })
            .resetStyle()
        );

      },

      /**
       * @param {Object} enterPage
       * @param {Object} leavePage
       * @param {Function} done
       */
      pop: function(enterPage, leavePage, callback) {
        animit.runAll(

          animit(leavePage.controller.getContentElement())
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
                opacity: 1
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
                opacity: 0
              },
              duration: 0.4,
              timing: 'linear'
            })
            .queue(function(done) {
              callback();
              done();
            }),

          animit(leavePage.controller.getToolbarElement())
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
                opacity: 1
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
                opacity: 0
              },
              duration: 0.4,
              timing: 'linear'
            })

        );
      }
    });

    return FadeTransitionAnimator;
  });

})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict;';

  var module = angular.module('onsen');

  /**
   * Fade-in screen transition.
   */
  module.factory('IOSSlideTransitionAnimator', function(NavigatorTransitionAnimator) {

    /**
     * Slide animator for navigator transition like iOS's screen slide transition.
     */
    var IOSSlideTransitionAnimator = NavigatorTransitionAnimator.extend({

      /** Black mask */
      backgroundMask : angular.element(
        '<div style="position: absolute; width: 100%;' +
        'height: 100%; background-color: black; opacity: 0;"></div>'
      ),

      _decompose: function(page) {
        var elements = [];

        var left = page.controller.getToolbarLeftItemsElement();
        var right = page.controller.getToolbarRightItemsElement();

        var other = []
          .concat(left.children.length === 0 ? left : excludeBackButtonLabel(left.children))
          .concat(right.children.length === 0 ? right : excludeBackButtonLabel(right.children));


        var pageLabels = [
          page.controller.getToolbarCenterItemsElement(),
          page.controller.getToolbarBackButtonLabelElement()
        ];

        return {
          pageLabels: pageLabels,
          other: other,
          content: page.controller.getContentElement(),
          toolbar: page.controller.getToolbarElement(),
          bottomToolbar: page.controller.getBottomToolbarElement()
        };

        function excludeBackButtonLabel(elements) {
          var result = [];

          for (var i = 0; i < elements.length; i++) {
            if (elements[i].nodeName.toLowerCase() === 'ons-back-button') {
              result.push(elements[i].querySelector('.ons-back-button__icon'));
            } else {
              result.push(elements[i]);
            }
          }

          return result;
        }
      },

      /**
       * @param {Object} enterPage
       * @param {Object} leavePage
       * @param {Function} callback
       */
      push: function(enterPage, leavePage, callback) {
        var mask = this.backgroundMask.remove();
        leavePage.element[0].parentNode.insertBefore(mask[0], leavePage.element[0].nextSibling);

        var enterPageDecomposition = this._decompose(enterPage);
        var leavePageDecomposition = this._decompose(leavePage);

        var delta = (function() {
          var rect = leavePage.element[0].getBoundingClientRect();
          return Math.round(((rect.right - rect.left) / 2) * 0.6);
        })();

        var maskClear = animit(mask[0])
          .queue({
            opacity: 0,
            transform: 'translate3d(0, 0, 0)'
          })
          .queue({
            opacity: 0.1
          }, {
            duration: 0.4,
            timing: 'cubic-bezier(.1, .7, .1, 1)'
          })
          .resetStyle()
          .queue(function(done) {
            mask.remove();
            done();
          });

        var bothPageHasToolbar =
          enterPage.controller.hasToolbarElement() &&
          leavePage.controller.hasToolbarElement();

        var isToolbarNothing = 
          !enterPage.controller.hasToolbarElement() &&
          !leavePage.controller.hasToolbarElement();

        if (bothPageHasToolbar) {
          animit.runAll(

            maskClear,

            animit([enterPageDecomposition.content, enterPageDecomposition.bottomToolbar])
              .queue({
                css: {
                  transform: 'translate3D(100%, 0px, 0px)',
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3D(0px, 0px, 0px)',
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle(),

            animit(enterPageDecomposition.toolbar)
              .queue({
                css: {
                  background: 'none',
                  backgroundColor: 'rgba(0, 0, 0, 0)',
                  borderColor: 'rgba(0, 0, 0, 0)'
                },
                duration: 0
              })
              .wait(0.3)
              .resetStyle({
                duration: 0.1,
                transition:
                  'background 0.1s linear, ' +
                  'background-color 0.1s linear, ' + 
                  'border-color 0.1s linear'
              }),

            animit(enterPageDecomposition.pageLabels)
              .queue({
                css: {
                  transform: 'translate3d(' + delta + 'px, 0, 0)',
                  opacity: 0
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3d(0, 0, 0)',
                  opacity: 1.0
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle(),

            animit(enterPageDecomposition.other)
              .queue({
                css: {opacity: 0},
                duration: 0
              })
              .queue({
                css: {opacity: 1},
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle(),

            animit([leavePageDecomposition.content, leavePageDecomposition.bottomToolbar])
              .queue({
                css: {
                  transform: 'translate3D(0, 0, 0)',
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3D(-25%, 0px, 0px)',
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle()
              .queue(function(done) {
                callback();
                done();
              }),

            animit(leavePageDecomposition.pageLabels)
              .queue({
                css: {
                  transform: 'translate3d(0, 0, 0)',
                  opacity: 1.0
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3d(-' + delta + 'px, 0, 0)',
                  opacity: 0,
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle(),

            animit(leavePageDecomposition.other)
              .queue({
                css: {opacity: 1},
                duration: 0
              })
              .queue({
                css: {opacity: 0},
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle()

          );

        } else {

          animit.runAll(

            maskClear,

            animit(enterPage.element[0])
              .queue({
                css: {
                  transform: 'translate3D(100%, 0px, 0px)',
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3D(0px, 0px, 0px)',
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle(),

            animit(leavePage.element[0])
              .queue({
                css: {
                  transform: 'translate3D(0, 0, 0)'
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3D(-25%, 0px, 0px)'
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle()
              .queue(function(done) {
                callback();
                done();
              })
          );

        }
      },

      /**
       * @param {Object} enterPage
       * @param {Object} leavePage
       * @param {Function} done
       */
      pop: function(enterPage, leavePage, done) {
        var mask = this.backgroundMask.remove();
        enterPage.element[0].parentNode.insertBefore(mask[0], enterPage.element[0].nextSibling);

        var enterPageDecomposition = this._decompose(enterPage);
        var leavePageDecomposition = this._decompose(leavePage);

        var delta = (function() {
          var rect = leavePage.element[0].getBoundingClientRect();
          return Math.round(((rect.right - rect.left) / 2) * 0.6);
        })();

        var maskClear = animit(mask[0])
          .queue({
            opacity: 0.1,
            transform: 'translate3d(0, 0, 0)'
          })
          .queue({
            opacity: 0
          }, {
            duration: 0.4,
            timing: 'cubic-bezier(.1, .7, .1, 1)'
          })
          .resetStyle()
          .queue(function(done) {
            mask.remove();
            done();
          });


        var bothPageHasToolbar =
          enterPage.controller.hasToolbarElement() &&
          leavePage.controller.hasToolbarElement();

        var isToolbarNothing = 
          !enterPage.controller.hasToolbarElement() &&
          !leavePage.controller.hasToolbarElement();

        if (bothPageHasToolbar || isToolbarNothing) {
          animit.runAll(

            maskClear,

            animit([enterPageDecomposition.content, enterPageDecomposition.bottomToolbar])
              .queue({
                css: {
                  transform: 'translate3D(-25%, 0px, 0px)',
                  opacity: 0.9
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3D(0px, 0px, 0px)',
                  opacity: 1.0
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle(),

            animit(enterPageDecomposition.pageLabels)
              .queue({
                css: {
                  transform: 'translate3d(-' + delta + 'px, 0, 0)',
                  opacity: 0
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3d(0, 0, 0)',
                  opacity: 1.0
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle(),

            animit(enterPageDecomposition.toolbar)
              .queue({
                css: {
                  transform: 'translate3d(0, 0, 0)',
                  opacity: 1.0
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3d(0, 0, 0)',
                  opacity: 1.0
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle(),

            animit(enterPageDecomposition.other)
              .queue({
                css: {opacity: 0},
                duration: 0
              })
              .queue({
                css: {opacity: 1},
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle(),

            animit([leavePageDecomposition.content, leavePageDecomposition.bottomToolbar])
              .queue({
                css: {
                  transform: 'translate3D(0px, 0px, 0px)'
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3D(100%, 0px, 0px)'
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .wait(0)
              .queue(function(finish) {
                done();
                finish();
              }),

            animit(leavePageDecomposition.other)
              .queue({
                css: {
                  transform: 'translate3d(0, 0, 0)',
                  opacity: 1
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3d(0, 0, 0)',
                  opacity: 0,
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              }),

            animit(leavePageDecomposition.toolbar)
              .queue({
                css: {
                  background: 'none',
                  backgroundColor: 'rgba(0, 0, 0, 0)',
                  borderColor: 'rgba(0, 0, 0, 0)'
                },
                duration: 0
              }),

            animit(leavePageDecomposition.pageLabels)
              .queue({
                css: {
                  transform: 'translate3d(0, 0, 0)',
                  opacity: 1.0
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3d(' + delta + 'px, 0, 0)',
                  opacity: 0,
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
          );
        } else {

          animit.runAll(

            maskClear,

            animit(enterPage.element[0])
              .queue({
                css: {
                  transform: 'translate3D(-25%, 0px, 0px)',
                  opacity: 0.9
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3D(0px, 0px, 0px)',
                  opacity: 1.0
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .resetStyle(),

            animit(leavePage.element[0])
              .queue({
                css: {
                  transform: 'translate3D(0px, 0px, 0px)'
                },
                duration: 0
              })
              .queue({
                css: {
                  transform: 'translate3D(100%, 0px, 0px)'
                },
                duration: 0.4,
                timing: 'cubic-bezier(.1, .7, .1, 1)'
              })
              .queue(function(finish) {
                done();
                finish();
              })
          );
        }
      }
    });

    return IOSSlideTransitionAnimator;
  });

})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict;';

  var module = angular.module('onsen');

  module.factory('LiftTransitionAnimator', function(NavigatorTransitionAnimator) {

    /**
     * Lift screen transition.
     */
    var LiftTransitionAnimator = NavigatorTransitionAnimator.extend({

      /** Black mask */
      backgroundMask : angular.element(
        '<div style="position: absolute; width: 100%;' +
        'height: 100%; background-color: black;"></div>'
      ),

      /**
       * @param {Object} enterPage
       * @param {Object} leavePage
       * @param {Function} callback
       */
      push: function(enterPage, leavePage, callback) {
        var mask = this.backgroundMask.remove();
        leavePage.element[0].parentNode.insertBefore(mask[0], leavePage.element[0]);

        var maskClear = animit(mask[0])
          .wait(0.6)
          .queue(function(done) {
            mask.remove();
            done();
          });

        animit.runAll(

          maskClear,

          animit(enterPage.element[0])
            .queue({
              css: {
                transform: 'translate3D(0, 100%, 0)',
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
              },
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .wait(0.2)
            .resetStyle()
            .queue(function(done) {
              callback();
              done();
            }),

          animit(leavePage.element[0])
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
                opacity: 1.0
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(0, -10%, 0)',
                opacity: 0.9
              },
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
        );

      },

      /**
       * @param {Object} enterPage
       * @param {Object} leavePage
       * @param {Function} callback
       */
      pop: function(enterPage, leavePage, callback) {
        var mask = this.backgroundMask.remove();
        enterPage.element[0].parentNode.insertBefore(mask[0], enterPage.element[0]);

        animit.runAll(

          animit(mask[0])
            .wait(0.4)
            .queue(function(done) {
              mask.remove();
              done();
            }),

          animit(enterPage.element[0])
            .queue({
              css: {
                transform: 'translate3D(0, -10%, 0)',
                opacity: 0.9
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
                opacity: 1.0
              },
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .resetStyle()
            .wait(0.4)
            .queue(function(done) {
              callback();
              done();
            }),

          animit(leavePage.element[0])
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)'
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(0, 100%, 0)'
              },
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            
        );
      }
    });

    return LiftTransitionAnimator;
  });

})();


/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict;';

  var module = angular.module('onsen');

  module.factory('NavigatorView', function($http, $parse, $templateCache, $compile, $onsen,
    SimpleSlideTransitionAnimator, NavigatorTransitionAnimator, LiftTransitionAnimator,
    NullTransitionAnimator, IOSSlideTransitionAnimator, FadeTransitionAnimator) {

    /**
     * Manages the page navigation backed by page stack.
     *
     * @class NavigatorView
     */
    var NavigatorView = Class.extend({

      /**
       * @member jqLite Object
       */
      _element: undefined,

      /**
       * @member {Array}
       */
      pages: undefined,

      /**
       * @member {Object}
       */
      _scope: undefined,

      /**
       * @member {DoorLock}
       */
      _doorLock: undefined,

      /**
       * @member {Boolean}
       */
      _profiling: false,

      /**
       * @param {Object} options
       * @param options.element jqLite Object to manage with navigator
       * @param options.scope Angular.js scope object
       */
      init: function(options) {
        options = options || options;

        this._element = options.element || angular.element(window.document.body);
        this._scope = options.scope || this._element.scope();
        this._doorLock = new DoorLock();
        this.pages = [];

        this._backButtonHandler = $onsen.backButtonHandlerStack.push(this._onBackButton.bind(this));
        this._scope.$on('$destroy', this._destroy.bind(this));
      },

      _destroy: function() {
        this.emit('destroy', {navigator: this});

        this.pages.forEach(function(page) {
          page.destroy();
        });

        this._backButtonHandler.remove();
        this._backButtonHandler = null;
      },

      _onBackButton: function() {
        if (this.pages.length > 1) {
          this.popPage();
          return true;
        }

        return false;
      },

      /**
       * @param element jqLite Object
       * @return jqLite Object
       */
      _normalizePageElement: function(element) {
        for (var i = 0; i < element.length; i++) {
          if (element[i].nodeType === 1) {
            return angular.element(element[i]);
          }
        }

        throw new Error('invalid state');
      },

      /**
       * Pushes the specified pageUrl into the page stack and
       * if options object is specified, apply the options.
       *
       * @param {String} page
       * @param {Object} [options]
       * @param {String/NavigatorTransitionAnimator} [options.animation]
       * @param {Function} [options.onTransitionEnd]
       */
      pushPage: function(page, options) {
        if (this._profiling) {
          console.time('pushPage');
        }

        options = options || {};

        if (options && typeof options != 'object') {
          throw new Error('options must be an objected. You supplied ' + options);
        }

        if (this._emitPrePushEvent()) {
          return;
        }

        options.animator = getAnimatorOption();

        var self = this;
        this._doorLock.waitUnlock(function() {
          var unlock = self._doorLock.lock();
          var done = function() {
            unlock();
            if (self._profiling) {
              console.timeEnd('pushPage');
            }
          };

          $onsen.getPageHTMLAsync(page).then(function(templateHTML) {
            var pageScope = self._createPageScope();
            var pageElement = createPageElement(templateHTML, pageScope);

            setImmediate(function() {
              self._pushPageDOM(page, pageElement, pageScope, options, done);
            });

          }, function() {
            unlock();
            if (self._profiling) {
              console.timeEnd('pushPage');
            }
            throw new Error('Page is not found: ' + page);
          });
        });

        function createPageElement(templateHTML, pageScope, done) {
          var div = document.createElement('div');
          div.innerHTML = templateHTML.trim();
          var pageElement = angular.element(div);

          var hasPage = div.childElementCount === 1 &&
            div.childNodes[0].nodeName.toLowerCase() === 'ons-page';
          if (hasPage) {
            pageElement = angular.element(div.childNodes[0]);
          } else {
            throw new Error('You can not supply no "ons-page" element to "ons-navigator".');
          }

          var element = $compile(pageElement)(pageScope);
          return element;
        }

        function getAnimatorOption() {
          var animator = null;

          if (options.animation instanceof NavigatorTransitionAnimator) {
            return options.animation;
          }

          if (typeof options.animation === 'string') {
            animator = NavigatorView._transitionAnimatorDict[options.animation];
          }

          if (!animator) {
            animator = NavigatorView._transitionAnimatorDict['default'];
          }

          if (!(animator instanceof NavigatorTransitionAnimator)) {
            throw new Error('"animator" is not an instance of NavigatorTransitionAnimator.');
          }

          return animator;
        }
      },


      _createPageScope: function() {
         return this._scope.$new();
      },

      /**
       * @param {String} page Page name.
       * @param {Object} element Compiled page element.
       * @param {Object} pageScope
       * @param {Object} options
       * @param {Function} [unlock]
       */
      _pushPageDOM: function(page, element, pageScope, options, unlock) {
        if (this._profiling) {
          console.time('pushPageDOM');
        }
        unlock = unlock || function() {};
        options = options || {};
        element = this._normalizePageElement(element);

        var pageController = element.inheritedData('ons-page');
        if (!pageController) {
          throw new Error('Fail to fetch $onsPageController.');
        }

        var self = this;

        var pageObject = {
          page: page,
          name: page,
          element: element,
          pageScope: pageScope,
          controller: pageController,
          options: options,
          destroy: function() {
            pageObject.element.remove();
            pageObject.pageScope.$destroy();

            pageObject.controller = null;
            pageObject.element = null;
            pageObject.pageScope = null;
            pageObject.options = null;

            var index = self.pages.indexOf(this);
            if (index !== -1) {
              self.pages.splice(index, 1);
            }
          }
        };

        var event = {
          enterPage: pageObject,
          leagePage: this.pages[this.pages.length - 1],
          navigator: this
        };

        this.pages.push(pageObject);

        var done = function() {
          if (self.pages[self.pages.length - 2]) {
            self.pages[self.pages.length - 2].element.css('display', 'none');
          }

          if (self._profiling) {
            console.timeEnd('pushPageDOM');
          }

          unlock();

          self.emit('postpush', event);

          if (typeof options.onTransitionEnd === 'function') {
            options.onTransitionEnd();
          }
        };

        if (this.pages.length > 1) {
          var leavePage = this.pages.slice(-2)[0];
          var enterPage = this.pages.slice(-1)[0];

          options.animator.push(enterPage, leavePage, done);
          this._element.append(element);

        } else {
          this._element.append(element);
          done();
        }
      },

      /**
       * @return {Boolean} Whether if event is canceled.
       */
      _emitPrePushEvent: function() {
        var isCanceled = false;
        var prePushEvent = {
          navigator: this,
          currentPage: this.getCurrentPage(),
          cancel: function() {
            isCanceled = true;
          }
        };

        this.emit('prepush', prePushEvent);

        return isCanceled;
      },

      /**
       * @return {Boolean} Whether if event is canceled.
       */
      _emitPrePopEvent: function() {
        var isCanceled = false;
        var prePopEvent = {
          navigator: this,
          currentPage: this.getCurrentPage(),
          cancel: function() {
            isCanceled = true;
          }
        };

        this.emit('prepop', prePopEvent);

        return isCanceled;
      },

      /**
       * Pops current page from the page stack.
       * @param {Object} [options]
       * @param {Function} [options.onTransitionEnd]
       */
      popPage: function(options) {
        options = options || {};

        if (this.pages.length <= 1) {
          throw new Error('NavigatorView\'s page stack is empty.');
        }

        if (this._emitPrePopEvent()) {
          return;
        }

        var self = this;
        this._doorLock.waitUnlock(function() {
          var unlock = self._doorLock.lock();

          var leavePage = self.pages.pop();

          if (self.pages[self.pages.length - 1]) {
            self.pages[self.pages.length - 1].element.css('display', 'block');
          }

          var enterPage = self.pages[self.pages.length -1];

          var event = {
            leavePage: leavePage,
            enterPage: self.pages[self.pages.length - 1],
            navigator: self
          };

          var callback = function() {
            leavePage.destroy();
            unlock();
            self.emit('postpop', event);
            if (typeof options.onTransitionEnd === 'function') {
              options.onTransitionEnd();
            }
          };
          leavePage.options.animator.pop(enterPage, leavePage, callback);
        });
      },

      /**
       * Clears page stack and add the specified pageUrl to the page stack.
       * If options object is specified, apply the options.
       * the options object include all the attributes of this navigator.
       *
       * @param {String} page
       * @param {Object} [options]
       */
      resetToPage: function(page, options) {
        options = options || {};

        if (!options.animator && !options.animation) {
          options.animation = 'none';
        }

        var onTransitionEnd = options.onTransitionEnd || function() {};
        var self = this;

        options.onTransitionEnd = function() {
          while (self.pages.length > 1) {
            self.pages.shift().destroy();
          }
          onTransitionEnd();
        };

        this.pushPage(page, options);
      },

      /**
       * Get current page's navigator item.
       *
       * Use this method to access options passed by pushPage() or resetToPage() method.
       * eg. ons.navigator.getCurrentPage().options
       *
       * @return {Object} 
       */
      getCurrentPage: function() {
        return this.pages[this.pages.length - 1];
      },

      /**
       * Retrieve the entire page stages of the navigator.
       *
       * @return {Array}
       */
      getPages: function() {
        return this.pages;
      },

      /**
       * @return {Boolean}
       */
      canPopPage: function() {
        return this.pages.length > 1;
      }
    });

    // Preset transition animators.
    NavigatorView._transitionAnimatorDict = {
      'default': $onsen.isAndroid() ? new SimpleSlideTransitionAnimator() : new IOSSlideTransitionAnimator(),
      'slide': $onsen.isAndroid() ? new SimpleSlideTransitionAnimator() : new IOSSlideTransitionAnimator(),
      'lift': new LiftTransitionAnimator(),
      'fade': new FadeTransitionAnimator(),
      'none': new NullTransitionAnimator()
    };

    /**
     * @param {String} name
     * @param {NavigatorTransitionAnimator} animator
     */
    NavigatorView.registerTransitionAnimator = function(name, animator) {
      if (!(animator instanceof NavigatorTransitionAnimator)) {
        throw new Error('"animator" param must be an instance of NavigatorTransitionAnimator');
      }

      this._transitionAnimatorDict[name] = animator;
    };

    MicroEvent.mixin(NavigatorView);

    return NavigatorView;
  });
})();

/*
Copyright 2013-2014 ASIAL CORPORATION

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict;';

  var module = angular.module('onsen');

  module.factory('NavigatorTransitionAnimator', function() {
    var NavigatorTransitionAnimator = Class.extend({
      push: function(enterPage, leavePage, callback) {
        callback();
      },

      pop: function(enterPage, leavePage, callback) {
        callback();
      }
    });

    return NavigatorTransitionAnimator;
  });
})();


/*
Copyright 2013-2014 ASIAL CORPORATION

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict;';

  var module = angular.module('onsen');

  /**
   * Null animator do screen transition with no animations.
   */
  module.factory('NullTransitionAnimator', function(NavigatorTransitionAnimator) {
    var NullTransitionAnimator = NavigatorTransitionAnimator.extend({});
    return NullTransitionAnimator;
  });
})();


/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict';
  var module = angular.module('onsen');

  module.factory('OverlaySlidingMenuAnimator', function(SlidingMenuAnimator) {

    var OverlaySlidingMenuAnimator = SlidingMenuAnimator.extend({

      _blackMask: undefined,

      _isRight: false,
      _element: false,
      _menuPage: false,
      _mainPage: false,
      _width: false,

      /**
       * @param {jqLite} element "ons-sliding-menu" or "ons-split-view" element
       * @param {jqLite} mainPage
       * @param {jqLite} menuPage
       * @param {Object} options
       * @param {String} options.width "width" style value
       * @param {Boolean} options.isRight
       */
      setup: function(element, mainPage, menuPage, options) {
        options = options || {};
        this._width = options.width || '90%';
        this._isRight = !!options.isRight;
        this._element = element;
        this._mainPage = mainPage;
        this._menuPage = menuPage;

        menuPage.css('box-shadow', '0px 0 10px 0px rgba(0, 0, 0, 0.2)');
        menuPage.css({
          width: options.width,
          display: 'none',
          zIndex: 2
        });
        mainPage.css({zIndex: 1});

        if (this._isRight) {
          menuPage.css({
            right: '-' + options.width,
            left: 'auto'
          });
        } else {
          menuPage.css({
            right: 'auto',
            left: '-' + options.width
          });
        }

        this._blackMask = angular.element('<div></div>').css({
          backgroundColor: 'black',
          top: '0px',
          left: '0px',
          right: '0px',
          bottom: '0px',
          position: 'absolute',
          display: 'none',
          zIndex: 0
        });

        element.prepend(this._blackMask);
      },

      /**
       * @param {Object} options
       * @param {String} options.width
       */
      onResized: function(options) {
        this._menuPage.css('width', options.width);

        if (this._isRight) {
          this._menuPage.css({
            right: '-' + options.width,
            left: 'auto'
          });
        } else {
          this._menuPage.css({
            right: 'auto',
            left: '-' + options.width
          });
        }

        if (options.isOpened) {
          var max = this._menuPage[0].clientWidth;
          var menuStyle = this._generateMenuPageStyle(max);
          animit(this._menuPage[0]).queue(menuStyle).play();
        }
      },

      /**
       */
      destroy: function() {
        if (this._blackMask) {
          this._blackMask.remove();
          this._blackMask = null;
        }

        this._mainPage.removeAttr('style');
        this._menuPage.removeAttr('style');

        this._element = this._mainPage = this._menuPage = null;
      },

      /**
       * @param {Function} callback
       */
      openMenu: function(callback) {

        this._menuPage.css('display', 'block');
        this._blackMask.css('display', 'block');

        var max = this._menuPage[0].clientWidth;
        var menuStyle = this._generateMenuPageStyle(max);
        var mainPageStyle = this._generateMainPageStyle(max);

        setTimeout(function() {

          animit(this._mainPage[0])
          .queue(mainPageStyle, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .queue(function(done) {
              callback();
              done();
            })
            .play();

          animit(this._menuPage[0])
            .queue(menuStyle, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .play();

        }.bind(this), 1000 / 60);
      },

      /**
       * @param {Function} callback
       */
      closeMenu: function(callback) {
        this._blackMask.css({display: 'block'});

        var menuPageStyle = this._generateMenuPageStyle(0);
        var mainPageStyle = this._generateMainPageStyle(0);

        setTimeout(function() {

          animit(this._mainPage[0])
            .queue(mainPageStyle, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .queue(function(done) {
              this._menuPage.css('display', 'none');
              callback();
              done();
            }.bind(this))
            .play();

          animit(this._menuPage[0])
            .queue(menuPageStyle, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .play();

        }.bind(this), 1000 / 60);
      },

      /**
       * @param {Object} options
       * @param {Number} options.distance
       * @param {Number} options.maxDistance
       */
      translateMenu: function(options) {

        this._menuPage.css('display', 'block');
        this._blackMask.css({display: 'block'});

        var menuPageStyle = this._generateMenuPageStyle(Math.min(options.maxDistance, options.distance));
        var mainPageStyle = this._generateMainPageStyle(Math.min(options.maxDistance, options.distance));
        delete mainPageStyle.opacity;

        animit(this._menuPage[0])
          .queue(menuPageStyle)
          .play();

        animit(this._mainPage[0])
          .queue(mainPageStyle)
          .play();
      },

      _generateMenuPageStyle: function(distance) {
        var max = this._menuPage[0].clientWidth;

        var x = this._isRight ? -distance : distance;
        var transform = 'translate3d(' + x + 'px, 0, 0)';

        return {
          transform: transform,
          'box-shadow': distance === 0 ? 'none' : '0px 0 10px 0px rgba(0, 0, 0, 0.2)'
        };
      },

      _generateMainPageStyle: function(distance) {
        var max = this._menuPage[0].clientWidth;
        var opacity = 1 - (0.1 * distance / max);

        return {
          opacity: opacity
        };
      },

      copy: function() {
        return new OverlaySlidingMenuAnimator();
      }
    });

    return OverlaySlidingMenuAnimator;
  });

})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict;';

  var module = angular.module('onsen');

  module.factory('PageView', function($onsen) {


    var PageView = Class.extend({
      _registeredToolbarElement : false,
      _registeredBottomToolbarElement : false,

      _nullElement : window.document.createElement('div'),

      _toolbarElement : angular.element(this.nullElement),
      _bottomToolbarElement : angular.element(this.nullElement),

      init: function(scope, element) {

        this._scope = scope;
        this._element = element;

        this._registeredToolbarElement = false;
        this._registeredBottomToolbarElement = false;

        this._nullElement = window.document.createElement('div');

        this._toolbarElement = angular.element(this._nullElement);
        this._bottomToolbarElement = angular.element(this._nullElement);

        scope.$on('$destroy', function() {
          this._destroy();
        }.bind(this));
      },

      /**
       * Register toolbar element to this page.
       *
       * @param {jqLite} element
       */
      registerToolbar : function(element) {
        if (this._registeredToolbarElement) {
          throw new Error('This page\'s toolbar is already registered.');
        }
        
        element.remove();
        var statusFill = this._element[0].querySelector('.page__status-bar-fill');
        if (statusFill) {
          angular.element(statusFill).after(element);
        } else {
          this._element.prepend(element);
        }

        this._toolbarElement = element;
        this._registeredToolbarElement = true;
      },

      /**
       * Register toolbar element to this page.
       *
       * @param {jqLite} element
       */
      registerBottomToolbar : function(element) {
        if (this._registeredBottomToolbarElement) {
          throw new Error('This page\'s bottom-toolbar is already registered.');
        }

        element.remove();

        this._bottomToolbarElement = element;
        this._registeredBottomToolbarElement = true;

        var fill = angular.element(document.createElement('div'));
        fill.addClass('page__bottom-bar-fill');
        fill.css({width: '0px', height: '0px'});

        this._element.prepend(fill);
        this._element.append(element);
      },

      /**
       * @return {Boolean}
       */
      hasToolbarElement : function() {
        return !!this._registeredToolbarElement;
      },

      /**
       * @return {Boolean}
       */
      hasBottomToolbarElement : function() {
        return !!this._registeredBottomToolbarElement;
      },

      /**
       * @return {HTMLElement}
       */
      getContentElement : function() {
        for (var i = 0; i < this._element.length; i++) {
          if (this._element[i].querySelector) {
            var content = this._element[i].querySelector('.page__content');
            if (content) {
              return content;
            }
          }
        }
        throw Error('fail to get ".page__content" element.');
      },

      /**
       * @return {HTMLElement}
       */
      getToolbarElement : function() {
        return this._toolbarElement[0] || this._nullElement;
      },

      /**
       * @return {HTMLElement}
       */
      getBottomToolbarElement : function() {
        return this._bottomToolbarElement[0] || this._nullElement;
      },

      /**
       * @return {HTMLElement}
       */
      getToolbarLeftItemsElement : function() {
        return this._toolbarElement[0].querySelector('.left') || this._nullElement;
      },

      /**
       * @return {HTMLElement}
       */
      getToolbarCenterItemsElement : function() {
        return this._toolbarElement[0].querySelector('.center') || this._nullElement;
      },

      /**
       * @return {HTMLElement}
       */
      getToolbarRightItemsElement : function() {
        return this._toolbarElement[0].querySelector('.right') || this._nullElement;
      },

      /**
       * @return {HTMLElement}
       */
      getToolbarBackButtonLabelElement : function() {
        return this._toolbarElement[0].querySelector('ons-back-button .back-button__label') || this._nullElement;
      },

      _destroy: function() {
        this.emit('destroy', {page: this});
        this._toolbarElement = null;
        this._nullElement = null;
        this._bottomToolbarElement = null;
      }
    });
    MicroEvent.mixin(PageView);

    return PageView;
  });
})();


/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict';
  var module = angular.module('onsen');

  module.factory('PushSlidingMenuAnimator', function(SlidingMenuAnimator) {

    var PushSlidingMenuAnimator = SlidingMenuAnimator.extend({

      _isRight: false,
      _element: undefined,
      _menuPage: undefined,
      _mainPage: undefined,
      _width: undefined,

      /**
       * @param {jqLite} element "ons-sliding-menu" or "ons-split-view" element
       * @param {jqLite} mainPage
       * @param {jqLite} menuPage
       * @param {Object} options
       * @param {String} options.width "width" style value
       * @param {Boolean} options.isRight
       */
      setup: function(element, mainPage, menuPage, options) {
        options = options || {};

        this._element = element;
        this._mainPage = mainPage;
        this._menuPage = menuPage;

        this._isRight = !!options.isRight;
        this._width = options.width || '90%';

        menuPage.css({
          width: options.width,
          display: 'none'
        });

        if (this._isRight) {
          menuPage.css({
            right: '-' + options.width,
            left: 'auto'
          });
        } else {
          menuPage.css({
            right: 'auto',
            left: '-' + options.width
          });
        }
      },

      /**
       * @param {Object} options
       * @param {String} options.width
       * @param {Object} options.isRight
       */
      onResized: function(options) {
        this._menuPage.css('width', options.width);

        if (this._isRight) {
          this._menuPage.css({
            right: '-' + options.width,
            left: 'auto'
          });
        } else {
          this._menuPage.css({
            right: 'auto',
            left: '-' + options.width
          });
        }

        if (options.isOpened) {
          var max = this._menuPage[0].clientWidth;
          var mainPageTransform = this._generateAbovePageTransform(max);
          var menuPageStyle = this._generateBehindPageStyle(max);

          animit(this._mainPage[0]).queue({transform: mainPageTransform}).play();
          animit(this._menuPage[0]).queue(menuPageStyle).play();
        }
      },

      /**
       */
      destroy: function() {
        this._mainPage.removeAttr('style');
        this._menuPage.removeAttr('style');

        this._element = this._mainPage = this._menuPage = null;
      },

      /**
       * @param {Function} callback
       */
      openMenu: function(callback) {

        this._menuPage.css('display', 'block');

        var max = this._menuPage[0].clientWidth;

        var aboveTransform = this._generateAbovePageTransform(max);
        var behindStyle = this._generateBehindPageStyle(max);

        setTimeout(function() {

          animit(this._mainPage[0])
            .queue({
              transform: aboveTransform
            }, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .queue(function(done) {
              callback();
              done();
            })
            .play();

          animit(this._menuPage[0])
            .queue(behindStyle, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .play();

        }.bind(this), 1000 / 60);
      },

      /**
       * @param {Function} callback
       */
      closeMenu: function(callback) {

        var aboveTransform = this._generateAbovePageTransform(0);
        var behindStyle = this._generateBehindPageStyle(0);

        setTimeout(function() {

          animit(this._mainPage[0])
            .queue({
              transform: aboveTransform
            }, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .queue({
              transform: 'translate3d(0, 0, 0)'
            })
            .queue(function(done) {
              this._menuPage.css('display', 'none');
              callback();
              done();
            }.bind(this))
            .play();

          animit(this._menuPage[0])
            .queue(behindStyle, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .queue(function(done) {
              done();
            })
            .play();

        }.bind(this), 1000 / 60);
      },

      /**
       * @param {Object} options
       * @param {Number} options.distance
       * @param {Number} options.maxDistance
       */
      translateMenu: function(options) {

        this._menuPage.css('display', 'block');

        var aboveTransform = this._generateAbovePageTransform(Math.min(options.maxDistance, options.distance));
        var behindStyle = this._generateBehindPageStyle(Math.min(options.maxDistance, options.distance));

        animit(this._mainPage[0])
          .queue({transform: aboveTransform})
          .play();

        animit(this._menuPage[0])
          .queue(behindStyle)
          .play();
      },

      _generateAbovePageTransform: function(distance) {
        var x = this._isRight ? -distance : distance;
        var aboveTransform = 'translate3d(' + x + 'px, 0, 0)';

        return aboveTransform;
      },

      _generateBehindPageStyle: function(distance) {
        var max = this._menuPage[0].clientWidth;

        var behindX = this._isRight ? -distance : distance;
        var behindTransform = 'translate3d(' + behindX + 'px, 0, 0)';

        return {
          transform: behindTransform
        };
      },

      copy: function() {
        return new PushSlidingMenuAnimator();
      }
    });

    return PushSlidingMenuAnimator;
  });

})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict';
  var module = angular.module('onsen');

  module.factory('RevealSlidingMenuAnimator', function(SlidingMenuAnimator) {

    var RevealSlidingMenuAnimator = SlidingMenuAnimator.extend({

      _blackMask: undefined,

      _isRight: false,

      _menuPage: undefined,
      _element: undefined,
      _mainPage: undefined,

      /**
       * @param {jqLite} element "ons-sliding-menu" or "ons-split-view" element
       * @param {jqLite} mainPage
       * @param {jqLite} menuPage
       * @param {Object} options
       * @param {String} options.width "width" style value
       * @param {Boolean} options.isRight
       */
      setup: function(element, mainPage, menuPage, options) {
        this._element = element;
        this._menuPage = menuPage;
        this._mainPage = mainPage;
        this._isRight = !!options.isRight;
        this._width = options.width || '90%';

        mainPage.css({
          boxShadow: '0px 0 10px 0px rgba(0, 0, 0, 0.2)'
        });

        menuPage.css({
          width: options.width,
          opacity: 0.9,
          display: 'none'
        });

        if (this._isRight) {
          menuPage.css({
            right: '0px',
            left: 'auto'
          });
        } else {
          menuPage.css({
            right: 'auto',
            left: '0px'
          });
        }

        this._blackMask = angular.element('<div></div>').css({
          backgroundColor: 'black',
          top: '0px',
          left: '0px',
          right: '0px',
          bottom: '0px',
          position: 'absolute',
          display: 'none'
        });

        element.prepend(this._blackMask);

        // Dirty fix for broken rendering bug on android 4.x.
        animit(mainPage[0]).queue({transform: 'translate3d(0, 0, 0)'}).play();
      },

      /**
       * @param {Object} options
       * @param {Boolean} options.isOpened
       * @param {String} options.width
       */
      onResized: function(options) {
        this._width = options.width;
        this._menuPage.css('width', this._width);

        if (options.isOpened) {
          var max = this._menuPage[0].clientWidth;

          var aboveTransform = this._generateAbovePageTransform(max);
          var behindStyle = this._generateBehindPageStyle(max);

          animit(this._mainPage[0]).queue({transform: aboveTransform}).play();
          animit(this._menuPage[0]).queue(behindStyle).play();
        }
      },

      /**
       * @param {jqLite} element "ons-sliding-menu" or "ons-split-view" element
       * @param {jqLite} mainPage
       * @param {jqLite} menuPage
       */
      destroy: function() {
        if (this._blackMask) {
          this._blackMask.remove();
          this._blackMask = null;
        }

        this._mainPage.removeAttr('style');
        this._menuPage.removeAttr('style');
        this._mainPage = this._menuPage = this._element = undefined;
      },

      /**
       * @param {Function} callback
       */
      openMenu: function(callback) {

        this._menuPage.css('display', 'block');
        this._blackMask.css('display', 'block');

        var max = this._menuPage[0].clientWidth;

        var aboveTransform = this._generateAbovePageTransform(max);
        var behindStyle = this._generateBehindPageStyle(max);

        setTimeout(function() {

          animit(this._mainPage[0])
            .queue({
              transform: aboveTransform
            }, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .queue(function(done) {
              callback();
              done();
            })
            .play();

          animit(this._menuPage[0])
            .queue(behindStyle, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .play();

        }.bind(this), 1000 / 60);
      },

      /**
       * @param {Function} callback
       */
      closeMenu: function(callback) {
        this._blackMask.css('display', 'block');

        var aboveTransform = this._generateAbovePageTransform(0);
        var behindStyle = this._generateBehindPageStyle(0);

        setTimeout(function() {

          animit(this._mainPage[0])
            .queue({
              transform: aboveTransform
            }, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .queue({
              transform: 'translate3d(0, 0, 0)'
            })
            .queue(function(done) {
              this._menuPage.css('display', 'none');
              callback();
              done();
            }.bind(this))
            .play();

          animit(this._menuPage[0])
            .queue(behindStyle, {
              duration: 0.4,
              timing: 'cubic-bezier(.1, .7, .1, 1)'
            })
            .queue(function(done) {
              done();
            })
            .play();

        }.bind(this), 1000 / 60);
      },

      /**
       * @param {Object} options
       * @param {Number} options.distance
       * @param {Number} options.maxDistance
       */
      translateMenu: function(options) {

        this._menuPage.css('display', 'block');
        this._blackMask.css('display', 'block');

        var aboveTransform = this._generateAbovePageTransform(Math.min(options.maxDistance, options.distance));
        var behindStyle = this._generateBehindPageStyle(Math.min(options.maxDistance, options.distance));
        delete behindStyle.opacity;

        animit(this._mainPage[0])
          .queue({transform: aboveTransform})
          .play();

        animit(this._menuPage[0])
          .queue(behindStyle)
          .play();
      },

      _generateAbovePageTransform: function(distance) {
        var x = this._isRight ? -distance : distance;
        var aboveTransform = 'translate3d(' + x + 'px, 0, 0)';

        return aboveTransform;
      },

      _generateBehindPageStyle: function(distance) {
        var max = this._menuPage[0].clientWidth;

        var behindDistance = Math.min((distance - max) / max * 10, 0);
        var behindX = this._isRight ? -behindDistance : behindDistance;
        var behindTransform = 'translate3d(' + behindX + '%, 0, 0)';
        var opacity = 1 + behindDistance / 100;

        return {
          transform: behindTransform,
          opacity: opacity
        };
      },

      copy: function() {
        return new RevealSlidingMenuAnimator();
      }
    });

    return RevealSlidingMenuAnimator;
  });

})();


/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict;';

  var module = angular.module('onsen');

  module.factory('SimpleSlideTransitionAnimator', function(NavigatorTransitionAnimator) {

    /**
     * Slide animator for navigator transition.
     */
    var SimpleSlideTransitionAnimator = NavigatorTransitionAnimator.extend({

      /** Black mask */
      backgroundMask : angular.element(
        '<div style="position: absolute; width: 100%;' +
        'height: 100%; background-color: black; opacity: 0;"></div>'
      ),

      timing: 'cubic-bezier(.1, .7, .4, 1)',
      duration: 0.3, 
      blackMaskOpacity: 0.4,

      init: function(options) {
        options = options || {};

        this.timing = options.timing || this.timing;
        this.duration = options.duration !== undefined ? options.duration : this.duration;
      },

      /**
       * @param {Object} enterPage
       * @param {Object} leavePage
       * @param {Function} callback
       */
      push: function(enterPage, leavePage, callback) {
        var mask = this.backgroundMask.remove();
        leavePage.element[0].parentNode.insertBefore(mask[0], leavePage.element[0].nextSibling);

        animit.runAll(

          animit(mask[0])
            .queue({
              opacity: 0,
              transform: 'translate3d(0, 0, 0)'
            })
            .queue({
              opacity: this.blackMaskOpacity
            }, {
              duration: this.duration,
              timing: this.timing
            })
            .resetStyle()
            .queue(function(done) {
              mask.remove();
              done();
            }),

          animit(enterPage.element[0])
            .queue({
              css: {
                transform: 'translate3D(100%, 0, 0)',
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)',
              },
              duration: this.duration,
              timing: this.timing
            })
            .resetStyle(),

          animit(leavePage.element[0])
            .queue({
              css: {
                transform: 'translate3D(0, 0, 0)'
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(-45%, 0px, 0px)'
              },
              duration: this.duration,
              timing: this.timing
            })
            .resetStyle()
            .wait(0.2)
            .queue(function(done) {
              callback();
              done();
            })
        );
      },

      /**
       * @param {Object} enterPage
       * @param {Object} leavePage
       * @param {Function} done
       */
      pop: function(enterPage, leavePage, done) {
        var mask = this.backgroundMask.remove();
        enterPage.element[0].parentNode.insertBefore(mask[0], enterPage.element[0].nextSibling);

        animit.runAll(

          animit(mask[0])
            .queue({
              opacity: this.blackMaskOpacity,
              transform: 'translate3d(0, 0, 0)'
            })
            .queue({
              opacity: 0
            }, {
              duration: this.duration,
              timing: this.timing
            })
            .resetStyle()
            .queue(function(done) {
              mask.remove();
              done();
            }),

          animit(enterPage.element[0])
            .queue({
              css: {
                transform: 'translate3D(-45%, 0px, 0px)',
                opacity: 0.9
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(0px, 0px, 0px)',
                opacity: 1.0
              },
              duration: this.duration,
              timing: this.timing
            })
            .resetStyle(),

          animit(leavePage.element[0])
            .queue({
              css: {
                transform: 'translate3D(0px, 0px, 0px)'
              },
              duration: 0
            })
            .queue({
              css: {
                transform: 'translate3D(100%, 0px, 0px)'
              },
              duration: this.duration,
              timing: this.timing
            })
            .wait(0.2)
            .queue(function(finish) {
              done();
              finish();
            })
        );
      }
    });

    return SimpleSlideTransitionAnimator;
  });

})();


/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict';
  var module = angular.module('onsen');

  var SlidingMenuViewModel = Class.extend({

    /**
     * @member Number
     */
    _distance: 0,

    /**
     * @member Number
     */
    _maxDistance: undefined,

    /**
     * @param {Object} options
     * @param {Number} maxDistance
     */
    init: function(options) {
      if (!angular.isNumber(options.maxDistance)) {
        throw new Error('options.maxDistance must be number');
      }

      this.setMaxDistance(options.maxDistance);
    },

    /**
     * @param {Number} maxDistance
     */
    setMaxDistance: function(maxDistance) {
      if (maxDistance <= 0) {
        throw new Error('maxDistance must be greater then zero.');
      }

      if (this.isOpened()) {
        this._distance = maxDistance;
      }
      this._maxDistance = maxDistance;
    },

    /**
     * @return {Boolean}
     */
    shouldOpen: function() {
      return !this.isOpened() && this._distance >= this._maxDistance / 2;
    },

    /**
     * @return {Boolean}
     */
    shouldClose: function() {
      return !this.isClosed() && this._distance < this._maxDistance / 2;
    },

    openOrClose: function(callback) {
      if (this.shouldOpen()) {
        this.open(callback);
      } else if (this.shouldClose()) {
        this.close(callback);
      }
    },

    close: function(callback) {
      callback = callback || function() {};

      if (!this.isClosed()) {
        this._distance = 0;
        this.emit('close', {callback: callback});
      } else {
        callback();
      }
    },

    open: function(callback) {
      callback = callback || function() {};

      if (!this.isOpened()) {
        this._distance = this._maxDistance;
        this.emit('open', {callback: callback});
      } else {
        callback();
      }
    },

    /**
     * @return {Boolean}
     */
    isClosed: function() {
      return this._distance === 0;
    },

    /**
     * @return {Boolean}
     */
    isOpened: function() {
      return this._distance === this._maxDistance;
    },

    /**
     * @return {Number}
     */
    getX: function() {
      return this._distance;
    },

    /**
     * @return {Number}
     */
    getMaxDistance: function() {
      return this._maxDistance;
    },

    /**
     * @param {Number} x
     */
    translate: function(x) {
      this._distance = Math.max(1, Math.min(this._maxDistance - 1, x));

      var options = {
        distance: this._distance,
        maxDistance: this._maxDistance
      };

      this.emit('translate', options);
    },

    toggle: function() {
      if (this.isClosed()) {
        this.open();
      } else {
        this.close();
      }
    }
  });
  MicroEvent.mixin(SlidingMenuViewModel);

  var MAIN_PAGE_RATIO = 0.9;
  module.factory('SlidingMenuView', function($onsen, $compile, SlidingMenuAnimator, RevealSlidingMenuAnimator, 
                                             PushSlidingMenuAnimator, OverlaySlidingMenuAnimator) {

    var SlidingMenuView = Class.extend({
      _scope: undefined,
      _attrs: undefined,

      _element: undefined,
      _behindPage: undefined,
      _abovePage: undefined,

      _doorLock: undefined,

      _isRightMenu: false,

      init: function(scope, element, attrs) {
        this._scope = scope;
        this._attrs = attrs;
        this._element = element;

        this._behindPage = angular.element(element[0].querySelector('.onsen-sliding-menu__behind'));
        this._abovePage = angular.element(element[0].querySelector('.onsen-sliding-menu__above'));

        this._doorLock = new DoorLock();

        this._isRightMenu = attrs.side === 'right';

        var maxDistance = this._normalizeMaxSlideDistanceAttr();
        this._logic = new SlidingMenuViewModel({maxDistance: Math.max(maxDistance, 1)});
        this._logic.on('translate', this._translate.bind(this));
        this._logic.on('open', function(options) {
          this._open(options.callback);
        }.bind(this));
        this._logic.on('close', function(options) {
          this._close(options.callback);
        }.bind(this));

        attrs.$observe('maxSlideDistance', this._onMaxSlideDistanceChanged.bind(this));
        attrs.$observe('swipable', this._onSwipableChanged.bind(this));

        window.addEventListener('resize', this._onWindowResize.bind(this));

        this._boundHandleEvent = this._handleEvent.bind(this);
        this._bindEvents();

        if (attrs.mainPage) {
          this.setMainPage(attrs.mainPage);
        } else if (attrs.abovePage) {
          this.setMainPage(attrs.abovePage);
        }

        if (attrs.menuPage) {
          this.setMenuPage(attrs.menuPage);
        } else if (attrs.behindPage) {
          this.setMenuPage(attrs.behindPage);
        }

        this._backButtonHandler = $onsen.backButtonHandlerStack.push(this._onBackButton.bind(this));

        var unlock = this._doorLock.lock();

        window.setTimeout(function() {
          var maxDistance = this._normalizeMaxSlideDistanceAttr();
          this._logic.setMaxDistance(maxDistance);

          unlock();

          this._behindPage.css({opacity: 1});

          this._animator = this._getAnimatorOption();
          this._animator.setup(
            this._element,
            this._abovePage,
            this._behindPage,
            {
              isRight: this._isRightMenu,
              width: this._attrs.maxSlideDistance || '90%'
            }
          );

        }.bind(this), 400);

        scope.$on('$destroy', this._destroy.bind(this));
      },

      _onBackButton: function() {
        if (this.isMenuOpened()) {
          this.closeMenu();
          return true;
        }
        return false;
      },

      _refreshBehindPageWidth: function() {
        var width = ('maxSlideDistance' in this._attrs) ? this._attrs.maxSlideDistance : '90%';

        if (('maxSlideDistance' in this._attrs) && this._animator) {
          this._animator.onResized(
            {
              isOpened: this._logic.isOpened(),
              width: width
            }
          );
        }
      },

      _destroy: function() {
        this.emit('destroy', {slidingMenu: this});

        this._backButtonHandler.remove();

        this._element = null;
        this._scope = null;
        this._attrs = null;
      },

      _getAnimatorOption: function() {
        var animator = SlidingMenuView._animatorDict[this._attrs.type];

        if (!(animator instanceof SlidingMenuAnimator)) {
          animator = SlidingMenuView._animatorDict['default'];
        }

        return animator.copy();
      },

      _onSwipableChanged: function(swipable) {
        swipable = swipable === '' || swipable === undefined || swipable == 'true';

        this.setSwipable(swipable);
      },

      /**
       * @param {Boolean} enabled
       */
      setSwipable: function(enabled) {
        if (enabled) {
          this._activateHammer();
        } else {
          this._deactivateHammer();
        }
      },

      _onWindowResize: function() {
        this._recalculateMAX();
        this._refreshBehindPageWidth();
      },

      _onMaxSlideDistanceChanged: function() {
        this._recalculateMAX();
        this._refreshBehindPageWidth();
      },

      /**
       * @return {Number}
       */
      _normalizeMaxSlideDistanceAttr: function() {
        var maxDistance = this._attrs.maxSlideDistance;

        if (!('maxSlideDistance' in this._attrs)) {
          maxDistance = 0.9 * this._abovePage[0].clientWidth;
        } else if (typeof maxDistance == 'string') {
          if (maxDistance.indexOf('px', maxDistance.length - 2) !== -1) {
            maxDistance = parseInt(maxDistance.replace('px', ''), 10);
          } else if (maxDistance.indexOf('%', maxDistance.length - 1) > 0) {
            maxDistance = maxDistance.replace('%', '');
            maxDistance = parseFloat(maxDistance) / 100 * this._abovePage[0].clientWidth;
          }
        } else {
          throw new Error('invalid state');
        }

        return maxDistance;
      },

      _recalculateMAX: function() {
        var maxDistance = this._normalizeMaxSlideDistanceAttr();

        if (maxDistance) {
          this._logic.setMaxDistance(parseInt(maxDistance, 10));
        }
      },

      _activateHammer: function(){
        this._hammertime.on('touch dragleft dragright swipeleft swiperight release', this._boundHandleEvent);
      },

      _deactivateHammer: function(){
        this._hammertime.off('touch dragleft dragright swipeleft swiperight release', this._boundHandleEvent);
      },

      _bindEvents: function() {
        this._hammertime = new Hammer(this._element[0]);
      },

      _appendAbovePage: function(pageUrl, templateHTML) {
        var pageScope = this._scope.$parent.$new();
        var pageContent = $compile(templateHTML)(pageScope);

        this._abovePage.append(pageContent);

        if (this._currentPageElement) {
          this._currentPageElement.remove();
          this._currentPageScope.$destroy();
        }

        this._currentPageElement = pageContent;
        this._currentPageScope = pageScope;
        this._currentPageUrl = pageUrl;
      },

      /**
       * @param {String}
       */
      _appendBehindPage: function(templateHTML) {
        var pageScope = this._scope.$parent.$new();
        var pageContent = $compile(templateHTML)(pageScope);

        this._behindPage.append(pageContent);

        if (this._currentBehindPageScope) {
          this._currentBehindPageScope.$destroy();
          this._currentBehindPageElement.remove();
        }

        this._currentBehindPageElement = pageContent;
        this._currentBehindPageScope = pageScope;
      },

      /**
       * @param {String} page
       * @param {Object} options
       * @param {Boolean} [options.closeMenu]
       * @param {Boolean} [options.callback]
       */
      setMenuPage: function(page, options) {
        if (page) {
          options = options || {};
          options.callback = options.callback || function() {};

          var self = this;
          $onsen.getPageHTMLAsync(page).then(function(html) {
            self._appendBehindPage(angular.element(html));
            if (options.closeMenu) {
              self.close();
            }
            options.callback();
          }, function() {
            throw new Error('Page is not found: ' + page);
          });
        } else {
          throw new Error('cannot set undefined page');
        }
      },

      setBehindPage: function() {
        return this.setMenuPage.apply(this, arguments);
      },

      /**
       * @param {String} pageUrl
       * @param {Object} options
       * @param {Boolean} [options.closeMenu]
       * @param {Boolean} [options.callback]
       */
      setMainPage: function(pageUrl, options) {
        options = options || {};
        options.callback = options.callback || function() {};

        var done = function() {
          if (options.closeMenu) {
            this.close();
          }
          options.callback();
        }.bind(this);

        if (this.currentPageUrl === pageUrl) {
          done();
          return;
        }

        if (pageUrl) {
          var self = this;
          $onsen.getPageHTMLAsync(pageUrl).then(function(html) {
            self._appendAbovePage(pageUrl, html);
            done();
          }, function() {
            throw new Error('Page is not found: ' + page);
          });
        } else {
          throw new Error('cannot set undefined page');
        }
      },

      setAbovePage: function(pageUrl, options) {
        return this.setMainPage.apply(this, arguments);
      },

      _handleEvent: function(event) {

        if (this._doorLock.isLocked()) {
          return;
        }

        if (this._isInsideIgnoredElement(event.target)){
          event.gesture.stopDetect();
        }

        switch (event.type) {

          case 'touch':
            if (this._logic.isClosed()) {
              if (!this._isInsideSwipeTargetArea(event)) {
                event.gesture.stopDetect();
              }
            }

            break;

          case 'dragleft':
          case 'dragright':
            event.gesture.preventDefault();

            var deltaX = event.gesture.deltaX;
            var deltaDistance = this._isRightMenu ? -deltaX : deltaX;

            var startEvent = event.gesture.startEvent;

            if (!('isOpened' in startEvent)) {
              startEvent.isOpened = this._logic.isOpened();
            }

            if (deltaDistance < 0 && this._logic.isClosed()) {
              break;
            }

            if (deltaDistance > 0 && this._logic.isOpened()) {
              break;
            }

            var distance = startEvent.isOpened ?
              deltaDistance + this._logic.getMaxDistance() : deltaDistance;

            this._logic.translate(distance);

            break;

          case 'swipeleft':
            event.gesture.preventDefault();

            if (this._isRightMenu) {
              this.open();
            } else {
              this.close();
            }

            event.gesture.stopDetect();
            break;

          case 'swiperight':
            event.gesture.preventDefault();

            if (this._isRightMenu) {
              this.close();
            } else {
              this.open();
            }

            event.gesture.stopDetect();
            break;

          case 'release':
            this._lastDistance = null;

            if (this._logic.shouldOpen()) {
              this.open();
            } else if (this._logic.shouldClose()) {
              this.close();
            }

            break;
        }
      },

      /**
       * @param {jqLite} element
       * @return {Boolean}
       */
      _isInsideIgnoredElement: function(element) {
        do {
          if (element.getAttribute && element.getAttribute('sliding-menu-ignore')) {
            return true;
          }
          element = element.parentNode;
        } while (element);

        return false;
      },

      _isInsideSwipeTargetArea: function(event) {
        var x = event.gesture.center.pageX;

        if (!('_swipeTargetWidth' in event.gesture.startEvent)) {
          event.gesture.startEvent._swipeTargetWidth = this._getSwipeTargetWidth();
        }

        var targetWidth = event.gesture.startEvent._swipeTargetWidth;
        return this._isRightMenu ? this._abovePage[0].clientWidth - x < targetWidth : x < targetWidth;
      },

      _getSwipeTargetWidth: function() {
        var targetWidth = this._attrs.swipeTargetWidth;

        if (typeof targetWidth == 'string') {
          targetWidth = targetWidth.replace('px', '');
        }

        var width = parseInt(targetWidth, 10);
        if (width < 0 || !targetWidth) {
          return this._abovePage[0].clientWidth;
        } else {
          return width;
        }
      },

      closeMenu: function() {
        return this.close.apply(this, arguments);
      },

      /**
       * Close sliding-menu page.
       *
       * @param {Function} callback
       */
      close: function(callback) {
        callback = callback || function() {};

        this.emit('preclose');

        this._doorLock.waitUnlock(function() {
          this._logic.close(callback);
        }.bind(this));
      },

      _close: function(callback) {
        callback = callback || function() {};

        var unlock = this._doorLock.lock();
        this._animator.closeMenu(function() {
          unlock();
          this.emit('postclose');
          callback();
        }.bind(this));
      },

      openMenu: function() {
        return this.open.apply(this, arguments);
      },

      /**
       * Open sliding-menu page.
       *
       * @param {Function} callback
       */
      open: function(callback) {
        callback = callback || function() {};

        this.emit('preopen');

        this._doorLock.waitUnlock(function() {
          this._logic.open(callback);
        }.bind(this));
      },

      _open: function(callback) {
        callback = callback || function() {};
        var unlock = this._doorLock.lock();

        this._animator.openMenu(function() {
          unlock();
          this.emit('postopen');
          callback();
        }.bind(this));
      },

      /**
       * Toggle sliding-menu page.
       */
      toggle: function(callback) {
        if (this._logic.isClosed()) {
          this.open(callback);
        } else {
          this.close(callback);
        }
      },

      /**
       * Toggle sliding-menu page.
       */
      toggleMenu: function() {
        return this.toggle.apply(this, arguments);
      },

      /**
       * @return {Boolean}
       */
      isMenuOpened: function() {
        return this._logic.isOpened();
      },

      /**
       * @param {Object} event
       */
      _translate: function(event) {
        this._animator.translateMenu(event);
      }
    });

    // Preset sliding menu animators.
    SlidingMenuView._animatorDict = {
      'default': new RevealSlidingMenuAnimator(),
      'overlay': new OverlaySlidingMenuAnimator(),
      'reveal': new RevealSlidingMenuAnimator(),
      'push': new PushSlidingMenuAnimator()
    };

    /**
     * @param {String} name
     * @param {NavigatorTransitionAnimator} animator
     */
    SlidingMenuView.registerSlidingMenuAnimator = function(name, animator) {
      if (!(animator instanceof SlidingMenuAnimator)) {
        throw new Error('"animator" param must be an instance of SlidingMenuAnimator');
      }

      this._animatorDict[name] = animator;
    };

    MicroEvent.mixin(SlidingMenuView);

    return SlidingMenuView;
  });
})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function() {
  'use strict';
  var module = angular.module('onsen');

  module.factory('SlidingMenuAnimator', function() {
    return Class.extend({
      
      /**
       * @param {jqLite} element "ons-sliding-menu" or "ons-split-view" element
       * @param {jqLite} mainPage
       * @param {jqLite} menuPage
       * @param {Object} options
       * @param {String} options.width "width" style value
       * @param {Boolean} options.isRight
       */
      setup: function(element, mainPage, menuPage, options) {
      },

      /**
       * @param {Object} options
       * @param {Boolean} options.isRight
       * @param {Boolean} options.isOpened
       * @param {String} options.width
       */
      onResized: function(options) {
      },

      /**
       * @param {Function} callback
       */
      openMenu: function(callback) {
      },

      /**
       * @param {Function} callback
       */
      closeClose: function(callback) {
      },

      /**
       */
      destroy: function() {
      },

      /**
       * @param {Object} options
       * @param {Number} options.distance
       * @param {Number} options.maxDistance
       */
      translateMenu: function(mainPage, menuPage, options) {
      },

      /**
       * @return {SlidingMenuAnimator}
       */
      copy: function() {
        throw new Error('Override copy method.');
      }
    });
  });
})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/
(function() {
  'use strict';
  var module = angular.module('onsen');

  module.factory('SplitView', function($compile, RevealSlidingMenuAnimator, $onsen) {
    var SPLIT_MODE = 0;
    var COLLAPSE_MODE = 1;
    var MAIN_PAGE_RATIO = 0.9;

    var ON_PAGE_READY = 'onPageReady';

    var SplitView = Class.extend({

      init: function(scope, element) {
        element.addClass('onsen-sliding-menu');

        this._element = element;
        this._scope = scope;

        this._abovePage = angular.element(element[0].querySelector('.onsen-split-view__main'));
        this._behindPage = angular.element(element[0].querySelector('.onsen-split-view__secondary'));

        this._previousX = 0;
        this._max = this._abovePage[0].clientWidth * MAIN_PAGE_RATIO;
        this._currentX = 0;
        this._startX = 0;
        this._mode = SPLIT_MODE;
        this._doorLock = new DoorLock();

        this._hammertime = new Hammer(this._element[0]);
        this._boundHammerEvent = this._handleEvent.bind(this);

        scope.$watch('swipable', this._onSwipableChanged.bind(this));

        window.addEventListener('orientationchange', this._onOrientationChange.bind(this));
        window.addEventListener('resize', this._onResize.bind(this));

        this._animator = new RevealSlidingMenuAnimator();

        this._element.css('display', 'none');

        if (scope.mainPage) {
          this.setMainPage(scope.mainPage);
        }

        if (scope.secondaryPage) {
          this.setSecondaryPage(scope.secondaryPage);
        }

        var unlock = this._doorLock.lock();

        this._considerChangingCollapse();
        this._setSize();

        setTimeout(function() {
          this._element.css('display', 'block');
          unlock();
        }.bind(this), 1000 / 60 * 2);

        scope.$on('$destroy', this._destroy.bind(this));
      },

      /**
       * @param {String} templateHTML
       */
      _appendSecondPage: function(templateHTML) {
        var pageScope = this._scope.$parent.$new();
        var pageContent = $compile(templateHTML)(pageScope);

        this._behindPage.append(pageContent);

        if (this._currentBehindPageElement) {
          this._currentBehindPageElement.remove();
          this._currentBehindPageScope.$destroy();
        }

        this._currentBehindPageElement = pageContent;
        this._currentBehindPageScope = pageScope;
      },

      /**
       * @param {String} templateHTML
       */
      _appendMainPage: function(templateHTML) {
        var pageScope = this._scope.$parent.$new();
        var pageContent = $compile(templateHTML)(pageScope);

        this._abovePage.append(pageContent);

        if (this._currentPage) {
          this._currentPage.remove();
          this._currentPageScope.$destroy();
        }

        this._currentPage = pageContent;
        this._currentPageScope = pageScope;
      },

      /**
       * @param {String} page
       */
      setSecondaryPage : function(page) {
        if (page) {
          $onsen.getPageHTMLAsync(page).then(function(html) {
            this._appendSecondPage(angular.element(html.trim()));
          }.bind(this), function() {
            throw new Error('Page is not found: ' + page);
          });
        } else {
          throw new Error('cannot set undefined page');
        }
      },

      /**
       * @param {String} page
       */
      setMainPage : function(page) {
        if (page) {
          $onsen.getPageHTMLAsync(page).then(function(html) {
            this._appendMainPage(angular.element(html.trim()));
          }.bind(this), function() {
            throw new Error('Page is not found: ' + page);
          });
        } else {
          throw new Error('cannot set undefined page');
        }
      },

      _onOrientationChange: function() {
        this._onResize();
      },

      _onResize: function() {
        this._considerChangingCollapse();

        if (this._mode === COLLAPSE_MODE) {
          this._animator.onResized(
            {
              isOpened: this._startX > 0,
              width: '90%'
            }
          );
        }

        this._max = this._abovePage[0].clientWidth * MAIN_PAGE_RATIO;
      },

      _considerChangingCollapse: function() {
        if (this._shouldCollapse()) {
          this._activateCollapseMode();
        } else {
          this._activateSplitMode();
        }
      },

      _shouldCollapse: function() {
        var orientation = window.orientation;

        if (orientation === undefined) {
          orientation = window.innerWidth > window.innerHeight ? 90 : 0;
        }

        switch (this._scope.collapse) {
          case undefined:
          case 'none':
            return false;

          case 'portrait':
            return orientation === 180 || orientation === 0;

          case 'landscape':
            return orientation == 90 || orientation == -90;

          default:
            // by width
            if (this._scope.collapse === undefined) {
              return false;
            } 

            var widthToken;
            if (this._scope.collapse.indexOf('width') >= 0) {
              var tokens = this._scope.collapse.split(' ');
              widthToken = tokens[tokens.length - 1];
            } else {
              widthToken = this._scope.collapse;
            }

            if (widthToken.indexOf('px') > 0) {
              widthToken = widthToken.substr(0, widthToken.length - 2);
            }

            return isNumber(widthToken) && window.innerWidth < widthToken;
        }
      },

      _setSize: function() {
        if (this._mode === SPLIT_MODE) {
          if (!this._scope.mainPageWidth) {
            this._scope.mainPageWidth = '70';
          }

          var behindSize = 100 - this._scope.mainPageWidth.replace('%', '');
          this._behindPage.css({
            width: behindSize + '%',
            opacity: 1
          });

          this._abovePage.css({
            width: this._scope.mainPageWidth + '%'
          });

          this._abovePage.css('left', behindSize + '%');
          this._currentX = this._behindPage[0].clientWidth;
        }
      },

      _activateCollapseMode: function() {
        if (this._mode !== COLLAPSE_MODE) {
          this._behindPage.removeAttr('style');
          this._abovePage.removeAttr('style');

          this._mode = COLLAPSE_MODE;

          this._onSwipableChanged(this._scope.swipable);

          this._animator.setup(
            this._element,
            this._abovePage,
            this._behindPage,
            {isRight: false, width: '90%'}
          );

          this._translate(0);
        }
      },

      _activateSplitMode: function() {
        if (this._mode !== SPLIT_MODE) {
          this._animator.destroy();

          this._behindPage.removeAttr('style');
          this._abovePage.removeAttr('style');

          this._setSize();
          this._deactivateHammer();
          this._mode = SPLIT_MODE;
        } else {
          this._setSize();
        }
      },

      _activateHammer: function() {
        this._hammertime.on('dragleft dragright swipeleft swiperight release', this._boundHammerEvent);
      },

      _deactivateHammer: function() {
        this._hammertime.off('dragleft dragright swipeleft swiperight release', this._boundHammerEvent);
      },

      _onSwipableChanged: function(swipable) {
        swipable = swipable === '' || swipable === undefined || swipable == 'true';

        if (swipable) {
          this._activateHammer();
        } else {
          this._deactivateHammer();
        }
      },

      _handleEvent: function(event) {
        if (this._doorLock.isLocked()) {
          return;
        }

        switch (event.type) {

          case 'dragleft':
          case 'dragright':
            event.gesture.preventDefault();
            var deltaX = event.gesture.deltaX;

            this._currentX = this._startX + deltaX;
            if (this._currentX >= 0) {
              this._translate(this._currentX);
            }
            break;

          case 'swipeleft':
            event.gesture.preventDefault();
            this.close();
            break;

          case 'swiperight':
            event.gesture.preventDefault();
            this.open();
            break;

          case 'release':
            if (this._currentX > this._max / 2) {
              this.open();
            } else {
              this.close();
            }
            break;
        }
      },

      _onTransitionEnd: function() {
        this._scope.$root.$broadcast(ON_PAGE_READY); //make sure children can do something before the parent.
      },

      close: function(callback) {
        callback = callback || function() {};

        if (this._mode === SPLIT_MODE) {
          callback();
          return;
        } else if (this._mode === COLLAPSE_MODE) {
          this._startX = 0;

          if (this._currentX !== 0) {
            var self = this;
            this._doorLock.waitUnlock(function() {
              var unlock = self._doorLock.lock();
              self._currentX = 0;

              self._animator.closeMenu(function() {
                unlock();
                self._onTransitionEnd();
                callback();
              });
            });
          }
        }
      },

      open: function(callback) {
        callback = callback || function() {};

        if (this._mode === SPLIT_MODE) {
          callback();
          return;
        } else if (this._mode === COLLAPSE_MODE) {
          this._startX = this._max;

          if (this._currentX != this._max) {
            var self = this;
            this._doorLock.waitUnlock(function() {
              var unlock = self._doorLock.lock();
              self._currentX = self._max;

              self._animator.openMenu(function() {
                unlock();
                self._onTransitionEnd();
                callback();
              });
            });
          }
        }
      },

      toggle: function(callback) {
        if (this._startX === 0) {
          this.open(callback);
        } else {
          this.close(callback);
        }
      },

      _translate: function(x) {
        if (this._mode === COLLAPSE_MODE) {
          this._currentX = x;

          var options = {
            distance: x,
            maxDistance: this._max
          };

          this._animator.translateMenu(options);
        }
      },

      _destroy: function() {
        this.emit('destroy', {splitView: this});

        this._element = null;
        this._scope = null;
      }
    });

    function isNumber(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }

    MicroEvent.mixin(SplitView);

    return SplitView;

  });

})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function(){
  'use strict';
  var module = angular.module('onsen');

  module.factory('SwitchView', function($onsen) {

    var SwitchView = Class.extend({

      /**
       * @param {jqLite} element
       * @param {Object} scope
       * @param {Object} attrs
       */
      init: function(element, scope, attrs) {
        this._element = element;
        this._checkbox = angular.element(element[0].querySelector('input[type=checkbox]'));
        this._scope = scope;

        attrs.$observe('disabled', function(disabled) {
          if (!!element.attr('disabled')) {
            this._checkbox.attr('disabled', 'disabled');
          } else {
            this._checkbox.removeAttr('disabled');
          }
        }.bind(this));

        scope.$watch('model', function(model) {
          this.emit('change', {'switch': this, value: !!model});
        }.bind(this));
      },

      /**
       * @return {Boolean}
       */
      isChecked: function() {
        return this._checkbox[0].checked;
      },

      /**
       * @param {Boolean}
       */
      setChecked: function(isChecked) {
        this._checkbox[0].checked = !!isChecked;
      },

      /**
       * @return {HTMLElement}
       */
      getCheckboxElemenet: function() {
        return this._checkbox[0];
      }
    });
    MicroEvent.mixin(SwitchView);

    return SwitchView;
  });
})();

/**
 * @ngdoc directive
 * @id back_button
 * @name ons-back-button
 * @description
 *   [en]Provides back button for toolbar that can be used for navigation.[/en]
 * @codepen aHmGL
 * @seealso ons-toolbar ons-toolbar component
 */
(function(){
  'use strict';
  var module = angular.module('onsen');

  module.directive('onsBackButton', function($onsen, $compile) {
    return {
      restrict: 'E',
      replace: false,
      templateUrl: $onsen.DIRECTIVE_TEMPLATE_URL + '/back_button.tpl',

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclude.
      transclude: true,
      scope: true,

      link: {
        pre: function(scope, element, attrs, controller, transclude) {
          scope.modifierTemplater = $onsen.generateModifierTemplater(attrs);

          transclude(scope, function(clonedElement) {
            element[0].querySelector('.back-button__label').appendChild(clonedElement[0]);
          });
        }
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id bottom_toolbar
 * @name ons-bottom-toolbar
 * @description
 * Use this component to have toolbar position at the bottom of the page.
 * @seealso ons-toolbar ons-toolbar component
 */
(function(){
  'use strict';

  var module = angular.module('onsen');

  module.directive('onsBottomToolbar', function($onsen) {
    return {
      restrict: 'E',
      replace: false,

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclde.
      transclude: false,
      scope: false,

      compile: function(element, attrs) {

        var modifierTemplater = $onsen.generateModifierTemplater(attrs);

        element.addClass('bottom-bar');
        element.addClass(modifierTemplater('bottom-bar--*'));
        element.css({'z-index': 0});

        return {
          pre: function(scope, element, attrs) {
            // modifier
            scope.modifierTemplater = $onsen.generateModifierTemplater(attrs);

            var pageView = element.inheritedData('ons-page');
            if (pageView) {
              pageView.registerBottomToolbar(element);
            }
          }
        };
      }
    };
  });
})();


/**
 * @ngdoc directive
 * @id button
 * @name ons-button
 * @description
 * Button component. It includes a spinner useful for showing work in progress.
 * @param type The type of the button. Can be any of [ 'quiet', 'large', 'large--quiet', 'cta', 'large--cta' ]
 * @param should-spin Whether the button should switch to show spinner
 * @param animation The animation when the button transitions to and from the spinner. Can be any of [ 'expand-left', 'expand-right', 'expand-up', 'expand-down', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-out', 'zoom-in' ]. The default is 'slide-left'
 * @param disabled Whether the button should be disabled.
 * @codepen hLayx
 * @guide button Guide for ons-button
 */
(function(){
  'use strict';
  var module = angular.module('onsen');

  module.directive('onsButton', function($onsen) {
    return {
      restrict: 'E',
      replace: false,
      transclude: true,
      scope: {
        shouldSpin: '@',
        animation: '@',
        onsType: '@',
        disabled: '@'
      },
      templateUrl: $onsen.DIRECTIVE_TEMPLATE_URL + '/button.tpl',
      link: function(scope, element, attrs){
        if (attrs.ngController) {
          throw new Error('This element can\'t accept ng-controller directive.');
        }

        var effectButton = element.children();
        var TYPE_PREFIX = 'button--';
        scope.item = {};

        scope.modifierTemplater = $onsen.generateModifierTemplater(attrs);

        // if animation is not specified -> default is slide-left
        if (scope.animation === undefined || scope.animation === '') {
          scope.item.animation = 'slide-left';
        }

        scope.$watch('disabled', function(disabled) {
          if (disabled === 'true') {
            effectButton.attr('disabled', true);
          } else {
            effectButton.attr('disabled', false);
          }
        });

        scope.$watch('animation', function(newAnimation) {
          if (newAnimation) {
            scope.item.animation = newAnimation;
          }
        });

        scope.$watch('shouldSpin', function(shouldSpin) {
          if (shouldSpin === 'true') {
            effectButton.attr('data-loading', true);
          } else {
            effectButton.removeAttr('data-loading');
          }
        });
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id col
 * @name ons-col
 * @description
 * Use to layout component.
 * @param align Vertical align the column. Valid values are [top/center/bottom].
 * @param width The width of the column. Valid values are css "width" value. eg. "10%", "50px"
 * @note For Android 4.3 and earlier, and iOS6 and earlier, when using mixed alignment with ons-row and ons-column, they may not be displayed correctly. You can use only one align.
 * @codepen GgujC
 * @guide layouting Layouting guide
 * @seealso ons-row ons-row component
 */
(function(){
  'use strict';

  var module = angular.module('onsen');

  module.directive('onsCol', function($timeout, $onsen) {
    return {
      restrict: 'E',
      replace: false,

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclude.
      transclude: false,
      scope: false,

      compile: function(element, attrs, transclude) {
        element.addClass('col ons-col-inner');

        return function(scope, element, attrs) {

          attrs.$observe('align', function(align) {
            updateAlign(align);
          });

          attrs.$observe('width', function(width) {
            updateWidth(width);
          });

          // For BC
          attrs.$observe('size', function(size) {
            if (!attrs.width) {
              updateWidth(size);
            }
          });

          updateAlign(attrs.align);

          if (attrs.size && !attrs.width) {
            updateWidth(attrs.size);
          } else {
            updateWidth(attrs.width);
          }

          function updateAlign(align) {
            if (align === 'top' || align === 'center' || align === 'bottom') {
              element.removeClass('col-top col-center col-bottom');
              element.addClass('col-' + align);
            } else {
              element.removeClass('col-top col-center col-bottom');
            }
          }

          function updateWidth(width) {
            if (typeof width  === 'string') {
              width = ('' + width).trim();
              width = width.match(/^\d+$/) ? width + '%' : width;

              element.css({
                '-webkit-box-flex': '0',
                '-webkit-flex': '0 0 ' + width,
                '-moz-box-flex': '0',
                '-moz-flex': '0 0 ' + width,
                '-ms-flex': '0 0 ' + width,
                'flex': '0 0 ' + width,
                'max-width': width
              });
            } else {
              element.removeAttr('style');
            }
          }
        };
      }
    };
  });
})();


(function() {
  'use strict';

  var module = angular.module('onsen');

  module.directive('onsDummyForInit', function($rootScope) {
    var isReady = false;

    return {
      restrict: 'E',
      replace: false,

      link: {
        post: function(scope, element) {
          if (!isReady) {
            isReady = true;
            $rootScope.$broadcast('$ons-ready');
          }
          element.remove();
        }
      }
    };
  });

})();

/**
 * @ngdoc directive
 * @id icon
 * @name ons-icon
 * @description
 * Wrapper for font-awesome icon.
 * @param icon The icon name. set the icon name without "fa-" prefix. eg. to use "fa-home" icon, set it to "home". See all icons: http://fontawesome.io/icons/.
 * @param size The sizes of the icon. Valid values are [lg/2x/3x/4x/5x] or css font-size value.
 * @param rotate The degree to rotate the icon. Valid values are [90/180/270]
 * @param flip Flip the icon. Valid values are [horizontal/vertical]
 * @param fixed-width When used in the list, you want the icons to have the same width so that they align vertically by setting the value to true. Valid values are [true/false]. Default is true.
 * @param spin Whether to spin the icon. Valid values are [true/false]
 * @codepen xAhvg
 * @guide using-icons Using icons
 */
(function(){
  'use strict';

  var module = angular.module('onsen');

  function cleanClassAttribute(element) {
    var classList = ('' + element.attr('class')).split(/ +/).filter(function(classString) {
      return classString !== 'fa' && classString.substring(0, 3) !== 'fa-';
    });

    element.attr('class', classList.join(' '));
  }

  function buildClassAndStyle(attrs) {
    var classList = ['fa'];
    var style = {};

    // size
    var size = '' + attrs.size;
    if (size.match(/^[1-5]x|lg$/)) {
      classList.push('fa-' + size);
    } else if (typeof attrs.size === 'string') {
      style['font-size'] = size;
    } else {
      classList.push('fa-lg');
    }

    // icon
    classList.push('fa-' + attrs.icon);
    
    // rotate
    if (attrs.rotate === '90' || attrs.rotate === '180' || attrs.rotate === '270') {

      classList.push('fa-rotate-' + attrs.rotate);
    }

    // flip
    if (attrs.flip === 'horizontal' || attrs.flip === 'vertical') {
      classList.push('fa-flip-' + attrs.flip);
    }

    // fixed-width
    if (attrs.fixedWidth !== 'false') {
      classList.push('fa-fw');
    }

    // spin
    if (attrs.spin === 'true') {
      classList.push('fa-spin');
    }

    return {
      'class': classList.join(' '),
      'style': style
    };
  }

  module.directive('onsIcon', function($onsen) {
    return {
      restrict: 'E',
      replace: false,
      transclude: false,
      link: function($scope, element, attrs) {

        if (attrs.ngController) {
          throw new Error('This element can\'t accept ng-controller directive.');
        }

        var update = function() {
          cleanClassAttribute(element);

          var builded = buildClassAndStyle(attrs);
          element.css(builded.style);
          element.addClass(builded['class']);
        };

        var builded = buildClassAndStyle(attrs);
        element.css(builded.style);
        element.addClass(builded['class']);
      }
    };
  });
})();


/**
 * @ngdoc directive
 * @id if-orientation
 * @name ons-if-orientation
 * @description
 * Conditionally display content depending on screen orientation. Valid values are [portrait/landscape]. Different from other components, this component is used as attribute in any element.
 * @param ons-if-orientation Either "portrait" or "landscape".
 * @seealso ons-if-platform ons-if-platform component
 * @guide utility-apis Other utility APIs
 */
(function(){
  'use strict';

  var module = angular.module('onsen');

  module.directive('onsIfOrientation', function($onsen) {
    return {
      restrict: 'A',
      replace: false,

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclude.
      transclude: false,
      scope: false,

      compile: function(element) {
        element.css('display', 'none');

        return function($scope, element, attrs) {
          element.addClass('ons-if-orientation-inner');

          window.addEventListener('orientationchange', update, false);
          window.addEventListener('resize', update, false);
          attrs.$observe('onsIfOrientation', update);

          update();

          function update() {
            var userOrientation = ('' + attrs.onsIfOrientation).toLowerCase();
            var orientation = getLandscapeOrPortraitFromInteger(window.orientation);

            if (userOrientation && (userOrientation === 'portrait' || userOrientation === 'landscape')) {
              if (userOrientation === orientation) {
                element.css('display', 'block');
              } else {
                element.css('display', 'none');
              }
            }
          }

          function getLandscapeOrPortraitFromInteger(orientation) {
            if (orientation === undefined ) {
              return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
            }

            if (orientation == 90 || orientation == -90) {
              return 'landscape';
            }

            if (orientation === 0 || orientation == 180) {
              return 'portrait';
            }
          }
        };
      }
    };
  });
})();


/**
 * @ngdoc directive
 * @id if-platform
 * @name ons-if-platform
 * @description
 * Conditionally display content depending on the platform/browser. Valid values are [ios/android/blackberry/chrome/safari/firefox/opera]. Different from other components, this component is used as attribute in any element.
 * @param ons-if-platform Either "opera", "firefox", "safari", "chrome", "ie", "android", "blackberry", "ios" or "windows".
 * @seealso ons-if-orientation ons-if-orientation component
 * @guide utility-apis Other utility APIs
 */
(function() {
  'use strict';

  var module = angular.module('onsen');

  module.directive('onsIfPlatform', function($onsen) {
    return {
      restrict: 'A',
      replace: false,

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclude.
      transclude: false,
      scope: false,

      compile: function(element) {
        element.addClass('ons-if-platform-inner');
        element.css('display', 'none');

        var platform = getPlatformString();

        return function($scope, element, attrs) {
          attrs.$observe('onsIfPlatform', function(userPlatform) {
            if (userPlatform) {
              update();
            }
          });

          update();

          function update() {
            if (attrs.onsIfPlatform.toLowerCase() === platform.toLowerCase()) {
              element.css('display', 'block');
            } else {
              element.css('display', 'none');
            }
          }
        };

        function getPlatformString() {

          if (navigator.userAgent.match(/Android/i)) {
            return 'android';
          }

          if ((navigator.userAgent.match(/BlackBerry/i)) || (navigator.userAgent.match(/RIM Tablet OS/i)) || (navigator.userAgent.match(/BB10/i))) {
            return 'blackberry';
          }

          if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            return 'ios';
          }

          if (navigator.userAgent.match(/IEMobile/i)) {
            return 'windows';
          }

          // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
          var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
          if (isOpera) {
            return 'opera';
          }

          var isFirefox = typeof InstallTrigger !== 'undefined';   // Firefox 1.0+
          if (isFirefox) {
            return 'firefox';
          }

          var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
          // At least Safari 3+: "[object HTMLElementConstructor]"
          if (isSafari) {
            return 'safari';
          }

          var isChrome = !!window.chrome && !isOpera; // Chrome 1+
          if (isChrome) {
            return 'chrome';
          }

          var isIE = /*@cc_on!@*/false || !!document.documentMode; // At least IE6
          if (isIE) {
            return 'ie';
          }

          return 'unknown';
        }
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id list
 * @name ons-list
 * @description
 * The container for list-item. Similar to <ul> but styled for mobile.
 * @param modifier
 * @seealso ons-list-item ons-list-item component
 * @seealso ons-list-header ons-list-header component
 * @guide using-lists Using lists
 * @codepen yxcCt
 */
(function(){
  'use strict';

  var module = angular.module('onsen');

  module.directive('onsList', function($onsen) {
    return {
      restrict: 'E',
      scope: false,

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclude.
      replace: false,
      transclude: false,

      compile: function(element, attrs) {
        var templater = $onsen.generateModifierTemplater(attrs);

        element.addClass('list ons-list-inner');
        element.addClass(templater('list--*'));
      }
    };
  });
})();


/**
 * @ngdoc directive
 * @id list-header
 * @name ons-list-header
 * @param modifier
 * @description
 * Header element for list items. Must be put inside ons-list tag.
 * @seealso ons-list ons-list component
 * @seealso ons-list-item ons-list-item component
 * @guide using-lists Using lists
 * @codepen yxcCt
 */
(function() {
  'use strict';

  var module = angular.module('onsen');

  module.directive('onsListHeader', function($onsen) {
    return {
      restrict: 'E',

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclude.
      replace: false,
      transclude: false,

      compile: function(elem, attrs, transcludeFn) {
        var templater = $onsen.generateModifierTemplater(attrs);
        elem.addClass('list__header ons-list-header-inner');
        elem.addClass(templater('list__header--*'));
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id list-item
 * @name ons-list-item
 * @param modifier
 * @description
 * Works like <li> but styled for mobile. Must be put inside ons-list tag.
 * @seealso ons-list ons-list component
 * @seealso ons-list-header ons-list-header component
 * @guide using-lists Using lists
 * @codepen yxcCt
 */
(function() {
  'use strict';

  var module = angular.module('onsen');

  module.directive('onsListItem', function($onsen) {
    return {
      restrict: 'E',

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclude.
      replace: false,
      transclude: false,

      compile: function(elem, attrs, transcludeFn) {
        var templater = $onsen.generateModifierTemplater(attrs);
        elem.addClass('list__item ons-list-item-inner');
        elem.addClass(templater('list__item--*'));
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id navigator
 * @name ons-navigator
 * @description
 *  [en]Manages the page navigation backed by page stack.[/en]
 *  [ja]ページスタックを用いたページの切り替えを管理します。[/ja]
 * @param page First page to show when navigator is initialized
 * @param var Variable name to refer this navigator.
 * @property pushPage(pageUrl,options)
 *  [en]Pushes the specified pageUrl into the page stack and if options object is specified, apply the options. eg. pushPage('page2.html')[/en]
 *  [ja]指定したpageUrlを新しいページスタックに追加します。[/ja]
 * @property popPage() Pops current page from the page stack
 * @property resetToPage(pageUrl,options) Clears page stack and add the specified pageUrl to the page stack. If options object is specified, apply the options. the options object include all the attributes of this navigator
 * @property getCurrentPage() Get current page's navigator item. Use this method to access options passed by pushPage() or resetToPage() method. eg. ons.navigator.getCurrentPage().options
 * @property getPages() Retrieve the entire page stages of the navigator.
 * @property on(eventName,listener) Added an event listener. Preset events are 'prepop', 'prepush', 'postpop' and 'postpush'.
 * @codepen yrhtv
 * @guide page-navigation Guide for navigation
 * @guide calling-component-apis-from-javascript Using navigator from JavaScript
 * @seealso ons-toolbar ons-toolbar component
 */
(function() {
  'use strict';
  var module = angular.module('onsen');

  module.directive('onsNavigator', function($compile, NavigatorView, $onsen) {
    return {
      restrict: 'E',

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclude.
      transclude: false,
      scope: true,

      compile: function(element) {
        var html = $onsen.normalizePageHTML(element.html());
        element.contents().remove();

        return {
          pre: function(scope, element, attrs, controller, transclude) {
            var navigator = new NavigatorView({
              scope: scope, 
              element: element
            });

            $onsen.declareVarAttribute(attrs, navigator);

            if (attrs.page) {
              navigator.pushPage(attrs.page, {});
            } else {
              var pageScope = navigator._createPageScope();
              var compiledPage = $compile(angular.element(html))(pageScope);
              navigator._pushPageDOM('', compiledPage, pageScope, {});
            }

            $onsen.aliasStack.register('ons.navigator', navigator);
            element.data('ons-navigator', navigator);

            scope.$on('$destroy', function() {
              element.data('ons-navigator', undefined);
              $onsen.aliasStack.unregister('ons.navigator', navigator);
            });
          }
        };
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id page
 * @name ons-page
 * @param var Variable name to refer this page.
 * @param modifier Modifier name.
 * @description
 * Should be used as root component of each page. The content inside page component is scrollable. If you need scroll behavior, you can put inside this component.
 */
(function() {
  'use strict';

  var module = angular.module('onsen');

  module.directive('onsPage', function($onsen, $timeout, PageView) {

    function firePageInitEvent(element) {
      function isAttached(element) {
        if (document.documentElement === element) {
          return true;
        }
        return element.parentNode ? isAttached(element.parentNode) : false;
      }

      function fire() {
        var event = document.createEvent('HTMLEvents');    
        event.initEvent('pageinit', true, true);
        element.dispatchEvent(event);    
      }

      // TODO: remove dirty fix
      var i = 0;
      var f = function() {
        if (i++ < 5)  {
          if (isAttached(element)) {
            fire();
          } else {
            setImmediate(f);
          }
        } else {
          throw new Error('Fail to fire "pageinit" event. Attach "ons-page" element to the document after initialization.');
        }
      };

      f();
    }

    return {
      restrict: 'E',

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclde.
      transclude: true,
      scope: true,

      compile: function(element) {
        if ($onsen.isWebView() && $onsen.isIOS7Above()) {
          // Adjustments for IOS7
          var fill = angular.element(document.createElement('div'));
          fill.addClass('page__status-bar-fill');
          fill.css({width: '0px', height: '0px'});
          element.prepend(fill);
        }

        return {
          pre: function(scope, element, attrs, controller, transclude) {
            var page = new PageView(scope, element);

            $onsen.declareVarAttribute(attrs, page);

            $onsen.aliasStack.register('ons.page', page);
            element.data('ons-page', page);

            scope.$on('$destroy', function() {
              element.data('ons-page', undefined);
              $onsen.aliasStack.unregister('ons.page', page);
            });

            var modifierTemplater = $onsen.generateModifierTemplater(attrs);
            element.addClass('page ' + modifierTemplater('page--*'));

            transclude(scope, function(clonedElement) {
              var content = angular.element('<div class="page__content ons-page-inner"></div>');
              content.addClass(modifierTemplater('page--*__content'));
              if (element.attr('style')) {
                content.attr('style', element.attr('style'));
                element.removeAttr('style');
              }
              element.append(content);

              if (Modernizr.csstransforms3d) {
                content.append(clonedElement);
              }  else {
                content.css('overflow', 'visible');

                var wrapper = angular.element('<div></div>');
                content.append(wrapper);
                wrapper.append(clonedElement);

                // IScroll for Android2
                var scroller = new IScroll(content[0], {
                  momentum: true,
                  bounce: true,
                  hScrollbar: false,
                  vScrollbar: false,
                  preventDefault: false
                });

                var offset = 10;
                scroller.on('scrollStart', function(e) {
                  var scrolled = scroller.y - offset;
                  if (scrolled < (scroller.maxScrollY + 40)) {
                    // TODO: find a better way to know when content is upated so we can refresh
                    scroller.refresh();
                  }
                });
              }
            });


          },

          post: function(scope, element, attrs) {
            firePageInitEvent(element[0]);
          }
        };
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id row
 * @name ons-row
 * @description
 * Use <ons-row> and <ons-col> grid system to layout component. By default, all <ons-col> inside a <ons-row> will have the same width. You can specify any <ons-col> to have a specific width and let others take the remaining width in a <ons-row>. You can event vertical align each <ons-col> in a <ons-row>
 * @param align Short hand attribute for aligning all colum in a row. Valid values are [top/bottom/center].
 * @note For Android 4.3 and earlier, and iOS6 and earlier, when using mixed alignment with ons-row and ons-column, they may not be displayed correctly. You can use only one align.
 * @codepen GgujC
 * @guide layouting Layouting guide
 * @seealso ons-col ons-col component
 */
(function(){
  'use strict';

  var module = angular.module('onsen');

  module.directive('onsRow', function($onsen, $timeout) {
    return {
      restrict: 'E',
      replace: false,

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclude.
      transclude: false,
      scope: false,

      compile: function(element, attrs) {
        element.addClass('row ons-row-inner');

        return function(scope, element, attrs) {
          attrs.$observe('align', function(align) {
            update();
          });

          update();

          function update() {
            var align = ('' + attrs.align).trim();
            if (align === 'top' || align === 'center' || align === 'bottom') {
              element.removeClass('row-bottom row-center row-top');
              element.addClass('row-' + align);
            }
          }
        };
      }
    };
  });
})();


/**
 * @ngdoc directive
 * @id screen
 * @name ons-screen
 * @description
 * The root element. This is usually put inside <body> tag.
 * @param page The root page of this screen element
 * @param var Variable name to refer this screen.
 * @property presentPage(pageUrl) Presents a page
 * @property dismissPage() Dismisses the page that was presented
 * @demoURL
 * OnsenUI/demo/screen/
 */
(function() {
  'use strict';
  var module = angular.module('onsen');

  var TransitionAnimator = Class.extend({
    push: function(enterPage, leavePage, callback) {
      callback();
    }, 

    pop: function(enterPage, leavePage, callback) {
      callback();
    }
  });

  var ModalTransitionAnimator = TransitionAnimator.extend({

    /** Black mask */
    backgroundMask : angular.element(
      '<div style="position: absolute; width: 100%;' +
      'height: 100%; background-color: black;"></div>'
    ),

    push: function(enterPage, leavePage, callback) {
      var mask = this.backgroundMask.remove();
      leavePage.pageElement[0].parentNode.insertBefore(mask[0], leavePage.pageElement[0]);

      animit.runAll(

        animit(mask[0])
          .wait(0.4)
          .queue(function(done) {
            mask.remove();
            done();
          }),
        
        animit(enterPage.pageElement[0])
          .queue({
            transform: 'translate3D(0, 100%, 0)'
          })
          .queue({
            transform: 'translate3D(0, 0, 0)'
          }, {
            duration: 0.4,
            timing: 'cubic-bezier(.1, .7, .1, 1)'
          })
          .resetStyle()
          .queue(function(done) {
            callback();
            done();
          }),

        animit(leavePage.pageElement[0])
          .queue({
            transform: 'translate3D(0, 0, 0)',
            opacity: 1.0
          })
          .queue({
            transform: 'translate3D(0, -10%, 0)',
            opacity: 0.9
          }, {
            duration: 0.4,
            timing: 'cubic-bezier(.1, .7, .1, 1)'
          })
          .resetStyle()
      );
    },

    pop: function(enterPage, leavePage, callback) {

      var mask = this.backgroundMask.remove();
      enterPage.pageElement[0].parentNode.insertBefore(mask[0], enterPage.pageElement[0]);

      animit.runAll(

        animit(mask[0])
          .wait(0.4)
          .queue(function(done) {
            mask.remove();
            done();
          }),

        animit(enterPage.pageElement[0])
          .queue({
            transform: 'translate3D(0, -10%, 0)',
            opacity: 0.9
          })
          .queue({
            transform: 'translate3D(0, 0, 0)',
            opacity: 1.0
          }, {
            duration: 0.4,
            timing: 'cubic-bezier(.1, .7, .1, 1)'
          })
          .resetStyle()
          .queue(function(done) {
            callback();
            done();
          }),

        animit(leavePage.pageElement[0])
          .queue({
            transform: 'translate3D(0, 0, 0)'
          })
          .queue({
            transform: 'translate3D(0, 100%, 0)'
          }, {
            duration: 0.4,
            timing: 'cubic-bezier(.1, .7, .1, 1)'
          })
      );
    }
  });

  module.service('Screen', function($compile, $onsen) {
    var TRANSITION_END = 'webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd';
    var TRANSITION_START = 'webkitAnimationStart animationStart msAnimationStart oAnimationStart';

    var Screen = Class.extend({

      init: function(scope, element, attrs) {
        this.screenItems = [];
        this.scope = scope;
        this.element = element;
        this.attrs = attrs;

        this._doorLock = new DoorLock();
        this.attachMethods();

        if (scope.page) {
          this.resetToPage(scope.page);
        }
      },

      isEmpty: function() {
        return this.screenItems.length < 1;
      },

      compilePageEl: function(pageEl, pageScope){
        var compiledPage = $compile(pageEl)(pageScope);
        return compiledPage;
      },

      createPageScope: function(){
        var pageScope = this.scope.$new();
        return pageScope;
      },

      /**
       * @param {String} pageUrl
       * @param {DOMElement} element This element is must be ons-page element.
       * @param {Object} pageScope
       * @param {Function} [callback]
       */
      _presentPageDOM: function(pageUrl, compiledPage, pageScope, callback) {
        callback = callback || function() {};

        var screenItem = {
          pageUrl: pageUrl,
          pageElement: compiledPage,
          pageScope: pageScope,
          destroy: function() {
            this.pageElement.remove();
            this.pageScope.$destroy();
          }
        };

        // create stack context.
        compiledPage.css('z-index', 0);

        this.screenItems.push(screenItem);

        if (this.screenItems.length > 1) {

          var enterPage = screenItem;
          var leavePage = this.screenItems[this.screenItems.length - 2];

          new ModalTransitionAnimator().push(enterPage, leavePage, function() {
            leavePage.pageElement.css({display: 'none'});
            callback();
          });
          this.element.append(compiledPage);
        } else {
          this.element.append(compiledPage);
          callback();
        }
      },

      presentPage: function(page) {
        var self = this;

        this._doorLock.waitUnlock(function() {
          var unlock = self._doorLock.lock();

          $onsen.getPageHTMLAsync(page).then(function(html) {
            var pageContent = angular.element(html.trim());
            var pageScope = self.createPageScope();
            var compiledPage = self.compilePageEl(pageContent, pageScope);

            self._presentPageDOM(page, compiledPage, pageScope, unlock);
          }, function() {
            unlock();
            throw new Error('Page is not found: ' + page);
          });
        });
      },

      dismissPage: function(){
        if (this.screenItems.length < 2) {
          return;
        }

        var self = this;
        this._doorLock.waitUnlock(function() {
          var unlock = self._doorLock.lock();

          var leavePage = self.screenItems.pop();
          var enterPage = self.screenItems[self.screenItems.length - 1];

          enterPage.pageElement.css({display: 'block'});

          new ModalTransitionAnimator().pop(enterPage, leavePage, function() {
            leavePage.destroy();
            unlock();
          });
        });
      },

      resetToPage: function(page){
        this.scope.presentPage(page);
        for (var i = 0; i < this.screenItems.length - 1; i++) {
          this.screenItems[i].destroy();
        }
      },

      attachMethods: function() {
        this.scope.presentPage = this.presentPage.bind(this);
        this.scope.resetToPage = this.resetToPage.bind(this);
        this.scope.dismissPage = this.dismissPage.bind(this);
      }
    });

    return Screen;
  });

  module.directive('onsScreen', function($compile, Screen, $onsen) {

    return {
      restrict: 'E',
      replace: false,

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclude.
      transclude: false,
      scope: true,

      compile: function(element, attrs, transclude) {
        var html = $onsen.normalizePageHTML(element.html().trim());
        element.contents().remove();

        return function(scope, element, attrs) {
          var screen = new Screen(scope, element, attrs);
          $onsen.declareVarAttribute(attrs, screen);

          if (!attrs.page) {
            var pageScope = screen.createPageScope();

            var compiled = $compile(angular.element(html))(pageScope);
            screen._presentPageDOM('', compiled, pageScope);
          }

          $onsen.aliasStack.register('ons.screen', screen);
          element.data('ons-screen', screen);

          scope.$on('$destroy', function(){
            element.data('ons-screen', undefined);
            $onsen.aliasStack.register('ons.screen', screen);
          });
        };

      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id scroller
 * @name ons-scroller
 * @description
 * Makes the content inside this tag scrollable.
 */
(function() {
  'use strict';
  var module = angular.module('onsen');

  module.directive('onsScroller', function($onsen, $timeout) {
    return {
      restrict: 'E',
      replace: false,
      transclude: true,

      scope: {
        onScrolled: '&',
        infinitScrollEnable: '='
      },

      templateUrl: $onsen.DIRECTIVE_TEMPLATE_URL + '/scroller.tpl',

      compile: function(element, attrs) {
        element.addClass('ons-scroller');

        return function(scope, element, attrs) {
          if (attrs.ngController) {
            throw new Error('"ons-scroller" can\'t accept "ng-controller" directive.');
          }

          // inifinte scroll
          var scrollWrapper;

          scrollWrapper = element[0];
          var offset = parseInt(attrs.threshold) || 10;

          if (scope.onScrolled) {
            scrollWrapper.addEventListener('scroll', function() {
              if (scope.infinitScrollEnable) {
                var scrollTopAndOffsetHeight = scrollWrapper.scrollTop + scrollWrapper.offsetHeight;
                var scrollHeightMinusOffset = scrollWrapper.scrollHeight - offset;

                if (scrollTopAndOffsetHeight >= scrollHeightMinusOffset) {
                  scope.onScrolled();
                }
              }
            });
          }

          // IScroll for Android
          if (!Modernizr.csstransforms3d) {
            $timeout(function() {
              var iScroll = new IScroll(scrollWrapper, {
                momentum: true,
                bounce: true,
                hScrollbar: false,
                vScrollbar: false,
                preventDefault: false
              });

              iScroll.on('scrollStart', function(e) {
                var scrolled = iScroll.y - offset;
                if (scrolled < (iScroll.maxScrollY + 40)) {
                  // TODO: find a better way to know when content is upated so we can refresh
                  iScroll.refresh();
                }
              });

              if (scope.onScrolled) {
                iScroll.on('scrollEnd', function(e) {
                  var scrolled = iScroll.y - offset;
                  if (scrolled < iScroll.maxScrollY) {
                    // console.log('we are there!');
                    scope.onScrolled();
                  }
                });
              }

            }, 500);
          }
        };
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id sliding_menu
 * @name ons-sliding-menu
 * @description
 * Facebook/Path like sliding UI where one page is overlayed over another page. The above page can be slided aside to reveal the page behind.
 *
 * @param behind-page The url of the page to be set to the behind layer.
 * @param above-page The url of the page to be set to the above layer
 * @param swipable Wether to enable swipe interaction
 * @param swipe-target-width The width of swipable area calculated from the left (in pixel). Eg. Use this to enable swipe only when the finger touch on the left edge.
 * @param max-slide-distance How far the above page will slide open. Can specify both in px and %. eg. 90%, 200px
 * @param var Variable name to refer this sliding menu.
 *
 * @property setMainPage(pageUrl,[options]) Show the page specified in pageUrl in the main contents pane.
 * @property setMenuPage(pageUrl,[options]) Show the page specified in pageUrl in the side menu pane.
 * @property setAbovePage(pageUrl) [Deprecated]Show the page specified in pageUrl in the above layer.
 * @property setBehindPage(pageUrl) [Deprecated]Show the page specified in pageUrl in the behind layer.
 * @property openMenu() Slide the above layer to reveal the layer behind.
 * @property closeMenu() Slide the above layer to hide the layer behind.
 * @property toggleMenu() Slide the above layer to reveal the layer behind if it is currently hidden, otherwies, hide the layer behind.
 * @property on(eventName,listener) Added an event listener. Preset events are 'preopen', 'preclose', 'postopen' and 'postclose'.
 * @property isMenuOpend()
 * @codepen IDvFJ
 * @guide using-sliding-menu Using sliding menu
 */
(function() {
  'use strict';
  var module = angular.module('onsen');

  module.directive('onsSlidingMenu', function($compile, SlidingMenuView, $onsen) {
    return {
      restrict: 'E',
      replace: false,

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclude.
      transclude: false,
      scope: true,

      templateUrl: $onsen.DIRECTIVE_TEMPLATE_URL + '/sliding_menu.tpl',

      link: function(scope, element, attrs) {

        if (attrs.ngController) {
          throw new Error('This element can\'t accept ng-controller directive.');
        }

        var slidingMenu = new SlidingMenuView(scope, element, attrs);

        $onsen.aliasStack.register('ons.slidingMenu', slidingMenu);
        $onsen.declareVarAttribute(attrs, slidingMenu);
        element.data('ons-sliding-menu', slidingMenu);

        scope.$on('$destroy', function(){
          element.data('ons-sliding-menu', undefined);
          $onsen.aliasStack.unregister('ons.slidingMenu', slidingMenu);
        });
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id split-view
 * @name ons-split-view
 * @description
 * Divides the screen into left and right section. This component can also act as sliding menu which can be controlled by 'collapse' attribute
 * @param secondary-page The url of the page on the left
 * @param main-page The url of the page on the right
 * @param main-page-width Main page's width percentage. The width of secondary page take the remaining percentage
 * @param collapse [Deprecated] Specify the collapse behavior. Valid values are [portrait/landscape/width ##px]. "portrait" means the view will collapse when device is in portrait orien0ation. "landscape" means the view will collapse when device is in landscape orientation. "width ##px" means the view will collapse when the window width is smaller than the specified ##px
 * @param var Variable name to refer this split view.
 * @property setMainPage(pageUrl) Show the page specified in pageUrl in the right section
 * @property setSecondaryPage(pageUrl) Show the page specified in pageUrl in the left section
 * @property [Deprecated] open() Reveal the secondary page if the view is in collapse mode
 * @property [Deprecated] close() hide the secondary page if the view is in collapse mode
 * @property [Deprecated] toggle() Reveal the secondary page if it is currently hidden, otherwies, reveal it
 * @codepen nKqfv
 * @guide multi-screen-support Multi screen support
 */
(function() {
  'use strict';
  var module = angular.module('onsen');

  module.directive('onsSplitView', function($compile, SplitView, $onsen) {

    return {
      restrict: 'E',
      replace: false,

      transclude: false,
      scope: {
        secondaryPage: '@',
        mainPage: '@',
        collapse: '@',
        swipable: '@',
        mainPageWidth: '@'
      },

      templateUrl: $onsen.DIRECTIVE_TEMPLATE_URL + '/split_view.tpl',
      link: function(scope, element, attrs) {

        if (attrs.ngController) {
          throw new Error('This element can\'t accept ng-controller directive.');
        }

        var splitView = new SplitView(scope, element, attrs);
        $onsen.declareVarAttribute(attrs, splitView);

        element.data('ons-split-view', splitView);
        $onsen.aliasStack.register('ons.splitView', splitView);

        scope.$on('$destroy', function() {
          element.data('ons-split-view', undefined);
          $onsen.aliasStack.unregister('ons.splitView', splitView);
        });
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id switch
 * @name ons-switch
 * @description
 * Switch component.
 * @param disabled Wether the switch shoud be disabled.
 * @param checked Wether the switch is checked.
 * @param var Variable name to refer this switch.
 * @param modifier Modifier name.
 * @property isChecked()
 * @property setChecked(isChecked)
 * @property getCheckboxElement() Get inner input[type=checkbox] element.
 * @property on(eventName,listener) Added an event listener. There is 'change' event.
 * @guide using-form-components Using form components
 * @seealso ons-button ons-button component
 */
(function(){
  'use strict';
  var module = angular.module('onsen');

  module.directive('onsSwitch', function($onsen, SwitchView) {
    return {
      restrict: 'E',
      replace: false,

      transclude: false,
      scope: true,

      templateUrl: $onsen.DIRECTIVE_TEMPLATE_URL + '/switch.tpl',
      compile: function(element) {
        return function(scope, element, attrs) {
          if (attrs.ngController) {
            throw new Error('This element can\'t accept ng-controller directive.');
          }

          var switchView = new SwitchView(element, scope, attrs);
          var checkbox = angular.element(element[0].querySelector('input[type=checkbox]'));

          scope.modifierTemplater = $onsen.generateModifierTemplater(attrs);
          attrs.$observe('checked', function(checked) {
            scope.model = !!element.attr('checked');
          });

          attrs.$observe('name', function(name) {
            if (!!element.attr('name')) {
              checkbox.attr('name', name);
            }
          });

          if (attrs.ngModel) {
            scope.$parent.$watch(attrs.ngModel, function(value) {
              scope.model = value;
            });

            scope.$watch('model', function(model) {
              scope.$parent[attrs.ngModel] = model;
            });

            scope.$parent[attrs.ngModel] = !!element.attr('checked');
          }

          $onsen.declareVarAttribute(attrs, switchView);
          $onsen.aliasStack.register('ons.switch', switchView);
          element.data('ons-switch', switchView);

          scope.$on('$destroy', function() {
            element.data('ons-switch', undefined);
            $onsen.aliasStack.unregister('ons.navigator', navigator);
          });
        };
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id tabbar
 * @name ons-tabbar
 * @param hide-tabs Whether to hide the tabs. Valid values are [true/false] or angular binding. eg: {{ shouldHide }}
 * @param var Variable name to refer this tabbar.
 * @property on(eventName,listener) Added an event listener. Preset events are 'prechange' and 'postchange'.
 * @description
 * Used with tabbar-item to manage pages using tabs.
 * @codepen pGuDL
 * @guide using-tab-bar Using tab bar
 * @seealso ons-tabbar-item ons-tabbar-item component
 */
(function() {
  'use strict';
  var module = angular.module('onsen');

  module.directive('onsTabbar', function($timeout, $compile, $onsen) {
    return {
      restrict: 'E',
      replace: false,
      transclude: true,
      scope: {
        hide: '@',
        onActiveTabChanged: '&'
      },
      templateUrl: $onsen.DIRECTIVE_TEMPLATE_URL + '/tab_bar.tpl',
      controller: function($scope, $element, $attrs) {

        if ($attrs.ngController) {
          throw new Error('This element can\'t accept ng-controller directive.');
        }

        this.modifierTemplater = $scope.modifierTemplater = $onsen.generateModifierTemplater($attrs);

        var container = angular.element($element[0].querySelector('.ons-tab-bar__content'));
        var footer = $element[0].querySelector('.ons-tab-bar__footer');

        this.tabbarId = Date.now();

        $scope.selectedTabItem = {
          source: ''
        };

        $attrs.$observe('hideTabs', function(hide) {
          $scope.hideTabs = hide;
          tabbarView._onTabbarVisibilityChanged();
        });

        var tabbarView = {
          _tabbarId: this.tabbarId,

          _tabItems: [],

          /**
           * @param {Number} index
           */
          setActiveTab: function(index) {
            var selectedTabItem = this._tabItems[index];

            if (!selectedTabItem) {
              return;
            }

            this.emit('prechange', {index: index, tabItem: selectedTabItem});
            
            if (selectedTabItem.page) {
              this._setPage(selectedTabItem.page);
            }

            for (var i = 0; i < this._tabItems.length; i++) {
              if (this._tabItems[i] != selectedTabItem) {
                this._tabItems[i].setInactive();
              } else {
                this._triggerActiveTabChanged(i, selectedTabItem);
                this.emit('postchange', {index: i, tabItem: selectedTabItem});
              }
            }
          },

          _triggerActiveTabChanged: function(index, tabItem){
            $scope.onActiveTabChanged({
              $index: index,
              $tabItem: tabItem
            });
          },

          /**
           * @param {Boolean} visible
           */
          setTabbarVisibility: function(visible) {
            $scope.hideTabs = !visible;
            this._onTabbarVisibilityChanged();
          },

          _onTabbarVisibilityChanged: function() {
            if ($scope.hideTabs) {
              $scope.tabbarHeight = 0;
            } else {
              $scope.tabbarHeight = footer.clientHeight + 'px';
            }
          },

          /**
           * @param {Object} tabItem
           */
          addTabItem : function(tabItem) {
            this._tabItems.push(tabItem);
          },

          /**
           * @param {String} page
           */
          _setPage: function(page) {
            if (page) {
              $onsen.getPageHTMLAsync(page).then(function(html) {
                var templateHTML = angular.element(html.trim());
                var pageScope = $scope.$parent.$new();
                var pageContent = $compile(templateHTML)(pageScope);
                container.append(pageContent);

                if (this._currentPageElement) {
                  this._currentPageElement.remove();
                  this._currentPageScope.$destroy();
                }

                this._currentPageElement = pageContent;
                this._currentPageScope = pageScope;
              }.bind(this), function() {
                throw new Error('Page is not found: ' + page);
              });
            } else {
              throw new Error('Cannot set undefined page');
            }
          },

          _destroy: function() {
            this.emit('destroy', {tabbar: this});
          }
        };
        MicroEvent.mixin(tabbarView);

        $onsen.aliasStack.register('ons.tabbar', tabbarView);
        $element.data('ons-tabbar', tabbarView);
        $onsen.declareVarAttribute($attrs, tabbarView);

        $scope.$watch('$destroy', function() {
          tabbarView._destroy();
          $element.data('ons-tabbar', undefined);
          $onsen.aliasStack.unregister('ons.tabbar', tabbarView);
        });
      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id tabbar_item
 * @name ons-tabbar-item
 * @param page The page that this tabbar-item points to
 * @param icon The icon of the tab. To use font-awesome icon, just set the icon name without "fa-" prefix. eg. to use "fa-home" icon, set it to "home". If you need to use your own icon, create a css class with background-image or any css properties and specify the name of your css class here
 * @param active-icon The icon of the tab when active. To use font-awesome icon, just set the icon name without "fa-" prefix. eg. to use "fa-home" icon, set it to "home". If you need to use your own icon, create a css class with background-image or any css properties and specify the name of your css class here
 * @param label The label of the tab
 * @param active Set wether this tab should be active or not. Valid values are [true/false]
 * @description
 * Represents a tab inside tabbar. Each tabbar-item represents a page
 * @codepen pGuDL
 * @guide using-tab-bar Using tab bar
 * @seealso ons-tabbar ons-tabbar component
 */
(function() {
  'use strict';
  var module = angular.module('onsen');

  module.directive('onsTabbarItem', function($onsen) {
    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      scope: {
        page: '@',
        active: '@',
        icon: '@',
        activeIcon: '@',
        label: '@'
      },
      templateUrl: $onsen.DIRECTIVE_TEMPLATE_URL + '/tab_bar_item.tpl',
      link: function(scope, element, attrs) {
        var radioButton = element[0].querySelector('input');

        var tabbarView = element.inheritedData('ons-tabbar');

        if (!tabbarView) {
          throw new Error('ons-tabbar-item is must be child of ons-tabbar element.');
        }

        scope.tabbarModifierTemplater = tabbarView.modifierTemplater;
        scope.modifierTemplater = $onsen.generateModifierTemplater(attrs);
        scope.tabbarId = tabbarView._tabbarId;
        scope.tabIcon = scope.icon;

        tabbarView.addTabItem(scope);

        scope.setActive = function() {

          tabbarView.setActiveTab(tabbarView._tabItems.indexOf(scope));

          element.addClass('active');
          radioButton.checked = true;

          if (scope.activeIcon) {
            scope.tabIcon = scope.activeIcon;
          }
        };

        scope.setInactive = function() {
          element.removeClass('active');
          scope.tabIcon = scope.icon;
        };

        if (scope.active) {
          scope.setActive();
        }

      }
    };
  });
})();

/**
 * @ngdoc directive
 * @id toolbar
 * @name ons-toolbar
 * @description
 * Toolbar component that can be used with navigation. Left, center and right container can be specified by class names.
 * @param modifier Modifier name.
 * @codepen aHmGL
 * @guide adding-a-toolbar Adding a toolbar
 * @seealso ons-bottom-toolbar ons-bottom-toolbar component
 * @seealso ons-back-button ons-back-button component
 * @seealso ons-toolbar-button ons-toolbar-button component
 */
(function() {
  'use strict';

  var module = angular.module('onsen');

  function ensureLeftContainer(element) {
    var container = element[0].querySelector('.left');

    if (!container) {
      container = document.createElement('div');
      container.setAttribute('class', 'left');
      container.innerHTML = '&nbsp;';
    }

    if (container.innerHTML.trim() === '') {
      container.innerHTML = '&nbsp;';
    }

    angular.element(container).addClass('navigation-bar__left');

    return container;
  }

  function ensureCenterContainer(element) {
    var container = element[0].querySelector('.center');

    if (!container) {
      container = document.createElement('div');
      container.setAttribute('class', 'center');
    }

    if (container.innerHTML.trim() === '') {
      container.innerHTML = '&nbsp;';
    }

    angular.element(container)
      .addClass('navigation-bar__title navigation-bar__center');

    return container;
  }

  function ensureRightContainer(element) {
    var container = element[0].querySelector('.right');

    if (!container) {
      container = document.createElement('div');
      container.setAttribute('class', 'right');
      container.innerHTML = '&nbsp;';
    }

    if (container.innerHTML.trim() === '') {
      container.innerHTML = '&nbsp;';
    }

    angular.element(container).addClass('navigation-bar__right');

    return container;
  }

  /**
   * @param {jqLite} element
   * @return {Boolean}
   */
  function hasCenterClassElementOnly(element) {
    var hasCenter = false;
    var hasOther = false;
    var child, children = element.contents();

    for (var i = 0; i < children.length; i++) {
      child = angular.element(children[i]);

      if (child.hasClass('center')) {
        hasCenter = true;
        continue;
      }

      if (child.hasClass('left') || child.hasClass('right')) {
        hasOther = true;
        continue;
      }

    }

    return hasCenter && !hasOther;
  }

  function ensureToolbarItemElements(element) {
    var center;
    if (hasCenterClassElementOnly(element)) {
      center = ensureCenterContainer(element);
      element.contents().remove();
      element.append(center);
    } else {
      center = ensureCenterContainer(element);
      var left = ensureLeftContainer(element);
      var right = ensureRightContainer(element);

      element.contents().remove();
      element.append(angular.element([left, center, right]));
    }
  }

  /**
   * Toolbar directive.
   */
  module.directive('onsToolbar', function($onsen) {
    return {
      restrict: 'E',
      replace: false,

      // NOTE: This element must coexists with ng-controller.
      // Do not use isolated scope and template's ng-transclde.
      scope: true, 
      transclude: false,

      compile: function(element, attrs) {

        var modifierTemplater = $onsen.generateModifierTemplater(attrs);

        element.addClass('navigation-bar');
        element.addClass(modifierTemplater('navigation-bar--*'));
        element.css({
          'position': 'absolute',
          'z-index': '10000',
          'left': '0px',
          'right': '0px',
          'top': '0px'
        });
        ensureToolbarItemElements(element);

        return {
          pre: function(scope, element, attrs) {
            var pageView = element.inheritedData('ons-page');

            if (pageView) {
              pageView.registerToolbar(element);
            }
          }
        };
      }
    };
  });

})();

/**
 * @ngdoc directive
 * @id toolbar_button
 * @name ons-toolbar-button
 * @param modifier Modifier name.
 * @description
 * Button component for toolbar.
 * @codepen aHmGL
 * @guide adding-a-toolbar Adding a toolbar
 * @seealso ons-toolbar ons-toolbar component
 * @seealso ons-bottom-toolbar ons-bottom-toolbar component
 * @seealso ons-back-button ons-back-button component
 */
(function(){
  'use strict';
  var module = angular.module('onsen');

  module.directive('onsToolbarButton', function($onsen) {
    return {
      restrict: 'E',
      transclude: true,
      templateUrl: $onsen.DIRECTIVE_TEMPLATE_URL + '/toolbar_button.tpl',
      link: {
        pre: function(scope, element, attrs, controller, transclude) {

          if (attrs.ngController) {
            throw new Error('This element can\'t accept ng-controller directive.');
          }

          scope.modifierTemplater = $onsen.generateModifierTemplater(attrs);
        }
      }
    };
  });
})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function(){
  'use strict';

  var module = angular.module('onsen');

  var util = {
    init: function() {
      var self = this;
    },

    addListener: function(fn) {
      if (this._deviceready) {
        window.document.addEventListener('backbutton', fn, false);
      } else {
        window.document.addEventListener('deviceready', function() {
          window.document.addEventListener('backbutton', fn, false);
        });
      }
    },

    removeListener: function(fn) {
      if (this._deviceready) {
        window.document.removeEventListener('backbutton', fn, false);
      } else {
        window.document.addEventListener('deviceready', function() {
          window.document.removeEventListener('backbutton', fn, false);
        });
      }
    }
  };

  window.document.addEventListener('deviceready', function() {
    util._deviceready = true;
  }, false);

  /**
   * 'backbutton' event handler manager.
   */
  module.factory('BackButtonHandlerStack', function() {

    var BackButtonHandlerStack = Class.extend({

      _stack: undefined,

      _enabled: true,

      init: function() {
        this._stack = [];

        this._listener = function() {
          return this.dispatchHandler.apply(this, arguments);
        }.bind(this);

        util.addListener(this._listener);
      },

      /**
       * Call handler's listener on backbutton event.
       */
      dispatchHandler: function(event) {
        var availableListeners = this._stack.filter(function(handler) {
          return handler._enabled;
        }).map(function(handler) {
          return handler.listener;
        });

        event.preventDefault();

        availableListeners.reverse();

        for (var i = 0; i < availableListeners.length; i++) {
          try {
            if (availableListeners[i].apply(null, arguments)) {
              return;
            }
          } catch (e) {
            console.log(e);
          }
        }
      },

      /**
       * @return {Object}
       */
      _createStackObject: function(listener) {
        var self = this;

        return {
          _enabled: true,
          listener: listener,
          setEnabled: function(enabled) {
            this._enabled = enabled;
          },
          remove: function() {
            self.remove(this.listener);
          }
        };
      },

      /**
       * @return {Function}
       */
      _getTopAvailableListener: function() {
        var object = this._stack.filter(function(stackObject) {
          return stackObject._enabled;
        }).reverse()[0];

        return object ? object.listener : undefined;
      },

      /**
       * Enabled "backbutton" event listeners on this stack.
       */
      enable: function() {
        if (!this._enabled) {
          this._enabled = true;
          util.addListener(this._listener);
        }
      },

      /**
       * Disabled "backbutton" event listeners on this stack.
       */
      disable: function() {
        if (this._enabled) {
          this._enabled = false;
          util.removeListener(this._listener);
        }
      },

      /**
       * @return {Boolean}
       */
      getEnabled: function() {
        return this._enabled;
      },

      /**
       * @param {Boolean} enabled
       */
      setEnabled: function(enabled) {
        if (enabled) {
          this.enable();
        } else {
          this.disable();
        }
      },

      /**
       * @param {Function} listener Callback on back button. If this callback returns true, dispatching is stopped.
       * @reutrn {Object} handler object
       */
      push: function(listener) {
        var handler = this._createStackObject(listener);

        this._stack.push(handler);

        return handler;
      },

      /**
       * @param {Function/Object} listener Event listener function or handler object
       */
      remove: function(listener) {
        if (!(listener instanceof Function)) {
          throw new Error('"listener" argument must be an instance of Function.');
        }

        var index = this._stack.map(function(handler) {
          return handler.listener;
        }).indexOf(listener);

        if (index !== -1) {
          this._stack.splice(index, 1);
        }
      }
    });

    return BackButtonHandlerStack;
  });
})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

(function(){
  'use strict';

  var module = angular.module('onsen');

  /**
   * Internal service class for framework implementation.
   */
  module.factory('$onsen', function($rootScope, $window, $cacheFactory, $document, $templateCache, $http, $q, BackButtonHandlerStack) {

    var unlockerDict = {
      _unlockersDict: {},

      _unlockedVarDict: {},

      /**
       * @param {String} name
       * @param {Function} unlocker
       */
      _addVarLock: function (name, unlocker) {
        if (!(unlocker instanceof Function)) {
          throw new Error('unlocker argument must be an instance of Function.');
        }

        if (this._unlockersDict[name]) {
          this._unlockersDict[name].push(unlocker);
        } else {
          this._unlockersDict[name] = [unlocker];
        }
      },

      /**
       * @param {String} varName
       */
      unlockVarName: function(varName) {
        var unlockers = this._unlockersDict[varName];

        if (unlockers) {
          unlockers.forEach(function(unlock) {
            unlock();
          });
        }
        this._unlockedVarDict[varName] = true;
      },

      /**
       * @param {Array} dependencies an array of var name
       * @param {Function} callback
       */
      addCallback: function(dependencies, callback) {
        if (!(callback instanceof Function)) {
          throw new Error('callback argument must be an instance of Function.');
        }

        var doorLock = new DoorLock();
        var self = this;

        dependencies.forEach(function(varName) {

          if (!self._unlockedVarDict[varName]) {
            // wait for variable declaration
            var unlock = doorLock.lock();
            self._addVarLock(varName, unlock);
          }

        });

        if (doorLock.isLocked()) {
          doorLock.waitUnlock(callback);
        } else {
          callback();
        }
      }
    };

    /**
     * Global object stack manager.
     *
     * e.g. "ons.screen", "ons.navigator"
     */
    var aliasStack = {
      _stackDict : {},

      /**
       * @param {String} name
       * @param {Object} object
       */
      register: function(name, object) {
        this._getStack(name).push(object);
        
        $onsen._defineVar(name, object);
      },

      /**
       * @param {String} name
       * @param {Object} target
       */
      unregister: function(name, target) {
        var stack = this._getStack(name);

        var index = stack.indexOf(target);
        if (index === -1) {
          throw new Error('no such object: ' + target);
        }
        stack.splice(index, 1);

        var obj = stack.length > 0 ? stack[stack.length - 1] : null;
        $onsen._defineVar(name, obj);
      },

      /**
       * @param {String} name
       */
      _getStack: function(name) {
        if (!this._stackDict[name]) {
          this._stackDict[name] = [];
        }

        return this._stackDict[name];
      }
    };

    var $onsen = {

      DIRECTIVE_TEMPLATE_URL: "templates",

      aliasStack: aliasStack,

      _defaultBackButtonListener: function() {
        navigator.app.exitApp();
        return true;
      },

      backButtonHandlerStack: (function() {
        var stack = new BackButtonHandlerStack();

        stack.push(function() {
          return $onsen._defaultBackButtonListener();
        });

        return stack;
      })(),

      /**
       * @param {Function}
       */
      setDefaultBackButtonListener: function(listener) {
        if (!(listener instanceof Function)) {
          throw new Error('listener argument must be function.');
        }
        this._defaultBackButtonListener = listener;
      },

      /**
       * Cache for predefined template.
       * eg. <script type="text/ons-template">...</script>
       */
      predefinedPageCache: (function() {
        var cache = $cacheFactory('$onsenPredefinedPageCache');

        var templates = $document[0].querySelectorAll('script[type="text/ons-template"]');

        for (var i = 0; i < templates.length; i++) {
          var template = angular.element(templates[i]);
          var id = template.attr('id');
          if (typeof id === 'string') {
            cache.put(id, template.text());
          }
        }

        return cache;
      })(),

      /**
       * Find first ancestor of el with tagName
       * or undefined if not found
       *
       * @param {jqLite} element
       * @param {String} tagName
       */
      upTo : function(el, tagName) {
        tagName = tagName.toLowerCase();

        do {
          if (!el) {
            return null;
          }
          el = el.parentNode;
          if (el.tagName.toLowerCase() == tagName) {
            return el;
          }
        } while (el.parentNode);

        return null;
      },


      /**
       * @param {Array} dependencies
       * @param {Function} callback
       */
      waitForVariables: function(dependencies, callback) {
        unlockerDict.addCallback(dependencies, callback);
      },

      /**
       * @param {jqLite} element
       * @param {String} name
       */
      findElementeObject: function(element, name) {
        return element.inheritedData(name);
      },

      /**
       * @param {String} page
       * @return {Promise}
       */
      getPageHTMLAsync: function(page) {
        var cache = $templateCache.get(page) || $onsen.predefinedPageCache.get(page);

        if (cache) {
          var deferred = $q.defer();

          var html = typeof cache === 'string' ? cache : cache[1];
          deferred.resolve(this.normalizePageHTML(html));

          return deferred.promise;
          
        } else {
          return $http({
            url: page,
            method: 'GET',
            cache: $onsen.predefinedPageCache
          }).then(function(response) {
            var html = response.data;

            return this.normalizePageHTML(html);
          }.bind(this));
        }

        function normalize(html) {
        }
      },

      /**
       * @param {String} html
       * @return {String}
       */
      normalizePageHTML: function(html) {
        html = ('' + html).trim();

        if (!html.match(/^<ons-page/)) {
          html = '<ons-page>' + html + '</ons-page>';
        }
        
        return html;
      },

      /**
       * Create modifier templater function. The modifier templater generate css classes binded modifier name.
       *
       * @param {Object} attrs
       * @return {Function} 
       */
      generateModifierTemplater: function(attrs) {
        var modifiers = attrs && typeof attrs.modifier === 'string' ? attrs.modifier.trim().split(/ +/) : [];

        /**
         * @return {String} template eg. 'ons-button--*', 'ons-button--*__item'
         * @return {String}
         */
        return function(template) {
          return modifiers.map(function(modifier) {
            return template.replace('*', modifier);
          }).join(' ');
        };
      },

      /**
       * Define a variable to JavaScript global scope and AngularJS scope as 'var' attribute name.
       *
       * @param {Object} attrs
       * @param object
       */
      declareVarAttribute: function(attrs, object) {
        if (typeof attrs['var'] === 'string') {
          var varName = attrs['var'];

          this._defineVar(varName, object);
          unlockerDict.unlockVarName(varName);
        }
      },

      /**
       * @return {Boolean}
       */
      isAndroid: function() {
        return !!window.navigator.userAgent.match(/android/i);
      },

      /**
       * @return {Boolean}
       */
      isIOS: function() {
        return !!window.navigator.userAgent.match(/(ipad|iphone|ipod touch)/i);
      },

      /**
       * @return {Boolean}
       */
      isWebView: function() {
        return window.ons.isWebView();
      },

      /**
       * @return {Boolean}
       */
      isIOS7Above: (function() {
        var ua = window.navigator.userAgent;
        var match = ua.match(/(iPad|iPhone|iPod touch);.*CPU.*OS (\d+)_(\d+)/i);

        var result = match ? parseFloat(match[2] + '.' + match[3]) >= 7 : false;

        return function() {
          return result;
        };
      })(),

      /**
       * Define a variable to JavaScript global scope and AngularJS scope.
       *
       * Util.defineVar('foo', 'foo-value');
       * // => window.foo and $scope.foo is now 'foo-value'
       *
       * Util.defineVar('foo.bar', 'foo-bar-value');
       * // => window.foo.bar and $scope.foo.bar is now 'foo-bar-value'
       *
       * @param {String} name
       * @param object
       */
      _defineVar: function(name, object) {
        var names = name.split(/\./);

        function set(container, names, object) {
          var name;
          for (var i = 0; i < names.length - 1; i++) {
            name = names[i];
            if (container[name] === undefined || container[name] === null) {
              container[name] = {};
            }
            container = container[name];
          }

          container[names[names.length - 1]] = object;
        }

        set($window, names, object);
        set($rootScope, names, object);
      }
    };

    return $onsen;
    
  });
})();

/*
Copyright 2013-2014 ASIAL CORPORATION

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/


/**
 * Minimal animation library for managing css transition on mobile browsers.
 */
window.animit = (function(){
  'use strict';

  /**
   * @param {HTMLElement} element
   */
  var Animit = function(element) {
    if (!(this instanceof Animit)) {
      return new Animit(element);
    }

    if (element instanceof HTMLElement) {
      this.elements = [element];
    } else if (Object.prototype.toString.call(element) === '[object Array]') {
      this.elements = element;
    } else {
      throw new Error('First argument must be an array or an instance of HTMLElement.');
    }

    this.transitionQueue = [];
    this.lastStyleAttributeDict = [];

    var self = this;
    this.elements.forEach(function(element, index) {
      if (!element.hasAttribute('data-animit-orig-style')) {
        self.lastStyleAttributeDict[index] = element.getAttribute('style');
        element.setAttribute('data-animit-orig-style', self.lastStyleAttributeDict[index] || '');
      } else {
        self.lastStyleAttributeDict[index] = element.getAttribute('data-animit-orig-style');
      }
    });
  };

  Animit.prototype = {

    /**
     * @property {Array}
     */
    transitionQueue: undefined,

    /**
     * @property {HTMLElement}
     */
    element: undefined,

    /**
     * Start animation sequence with passed animations.
     *
     * @param {Function} callback
     */
    play: function(callback) {
      if (typeof callback === 'function') {
        this.transitionQueue.push(function(done) {
          callback();
          done();
        });
      }

      this.startAnimation();

      return this;
    },

    /**
     * Queue transition animations or other function.
     *
     * e.g. animit(elt).queue({color: 'red'})
     * e.g. animit(elt).queue({color: 'red'}, {duration: 0.4})
     * e.g. animit(elt).queue({css: {color: 'red'}, duration: 0.2})
     *
     * @param {Object|Animit.Transition|Function} transition
     * @param {Object} [options]
     */
    queue: function(transition, options) {
      var queue = this.transitionQueue;

      if (transition && options) {
        options.css = transition;
        transition = new Animit.Transition(options);
      }

      if (!(transition instanceof Function || transition instanceof Animit.Transition)) {
        if (transition.css) {
          transition = new Animit.Transition(transition);
        } else {
          transition = new Animit.Transition({
            css: transition
          });
        }
      }

      if (transition instanceof Function) {
        queue.push(transition);
      } else if (transition instanceof Animit.Transition) {
        queue.push(transition.build());
      } else {
        throw new Error('Invalid arguments');
      }

      return this;
    },

    /**
     * Queue transition animations.
     *
     * @param {Float} seconds
     */
    wait: function(seconds) {
      var self = this;
      this.transitionQueue.push(function(done) {
        setTimeout(done, 1000 * seconds);
      });

      return this;
    },

    /**
     * Reset element's style.
     *
     * @param {Object} options
     * @param {Float} options.duration
     * @param {String} options.timing
     */
    resetStyle: function(options) {
      options = options || {};
      var self = this;

      if (options.transition && !options.duration) {
        throw new Error('"options.duration" is required when "options.transition" is enabled.');
      }

      if (options.transition || (options.duration && options.duration > 0)) {
        var transitionValue = options.transition || ('all ' + options.duration + 's ' + (options.timing || 'linear'));
        var transitionStyle = 'transition: ' + transitionValue + '; -' + Animit.prefix + '-transition: ' + transitionValue + ';';

        this.transitionQueue.push(function(done) {
          var elements = this.elements;

          // transition and style settings
          elements.forEach(function(element, index) {
            element.style[Animit.prefix + 'Transition'] = transitionValue;
            element.style.transition = transitionValue;

            var styleValue = (self.lastStyleAttributeDict[index] ? self.lastStyleAttributeDict[index] + '; ' : '') + transitionStyle;
            element.setAttribute('style', styleValue);
          });

          // add "transitionend" event handler
          var removeListeners = util.addOnTransitionEnd(elements[0], function() {
            clearTimeout(timeoutId);
            reset();
            done();
          });

          // for fail safe.
          var timeoutId = setTimeout(function() {
            removeListeners();
            reset();
            done();
          }, options.duration * 1000 * 1.4);
        });
      } else {
        this.transitionQueue.push(function(done) {
          reset();
          done();
        });
      }

      return this;

      function reset() {
        // Clear transition animation settings.
        self.elements.forEach(function(element, index) {
          element.style[Animit.prefix + 'Transition'] = 'none';
          element.style.transition = 'none';

          if (self.lastStyleAttributeDict[index]) {
            element.setAttribute('style', self.lastStyleAttributeDict[index]);
          } else {
            element.setAttribute('style', '');
            element.removeAttribute('style');
          }
        });
      }
    },

    /**
     * Start animation sequence.
     */
    startAnimation: function() {
      this._dequeueTransition();

      return this;
    },

    _dequeueTransition: function() {
      var transition = this.transitionQueue.shift();
      if (this._currentTransition) {
        throw new Error('Current transition exists.');
      }
      this._currentTransition = transition;
      var self = this;
      var called = false;

      var done = function() {
        if (!called) {
          called = true;
          self._currentTransition = undefined;
          self._dequeueTransition();
        } else {
          throw new Error('Invalid state: This callback is called twice.');
        }
      };

      if (transition) {
        transition.call(this, done);
      }
    }

  };

  Animit.cssPropertyDict = (function() {
    var styles = window.getComputedStyle(document.documentElement, '');
    var dict = {};
    var a = 'A'.charCodeAt(0);
    var z = 'z'.charCodeAt(0);

    for (var key in styles) {
      if (styles.hasOwnProperty(key)) {
        var char = key.charCodeAt(0);
        if (a <= key.charCodeAt(0) && z >= key.charCodeAt(0)) {
          if (key !== 'cssText' && key !== 'parentText' && key !== 'length') {
            dict[key] = true;
          }
        }
      }
    }

    return dict;
  })();

  Animit.hasCssProperty = function(name) {
    return !!Animit.cssPropertyDict[name];
  };

  /**
   * Vendor prefix for css property.
   */
  Animit.prefix = (function() {
    var styles = window.getComputedStyle(document.documentElement, ''),
      pre = (Array.prototype.slice
        .call(styles)
        .join('') 
        .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
      )[1];
    return pre;
  })();

  /**
   * @param {Animit} arguments
   */
  Animit.runAll = function(/* arguments... */) {
    for (var i = 0; i < arguments.length; i++) {
      arguments[i].play();
    }
  };


  /**
   * @param {Object} options
   * @param {Float} [options.duration]
   * @param {String} [options.timing]
   */
  Animit.Transition = function(options) {
    this.options = options || {};
    this.options.duration = this.options.duration || 0;
    this.options.timing = this.options.timing || 'linear';
    this.options.css = this.options.css || {};
  };

  Animit.Transition.prototype = {
    /**
     * @param {HTMLElement} element
     * @return {Function}
     */
    build: function() {

      if (Object.keys(this.options.css).length === 0) {
        throw new Error('options.css is required.');
      }

      var css = createActualCssProps(this.options.css);

      if (this.options.duration > 0) {
        var transitionValue = 'all ' + this.options.duration + 's ' + this.options.timing;
        var self = this;

        return function(callback) {
          var elements = this.elements;
          var timeout = self.options.duration * 1000 * 1.4;

          var removeListeners = util.addOnTransitionEnd(elements[0], function() {
            clearTimeout(timeoutId);
            callback();
          });

          var timeoutId = setTimeout(function() {
            removeListeners();
            callback();
          }, timeout);

          elements.forEach(function(element, index) {
            element.style[Animit.prefix + 'Transition'] = transitionValue;
            element.style.transition = transitionValue;

            Object.keys(css).forEach(function(name) {
              element.style[name] = css[name];
            });
          });

        };
      }

      if (this.options.duration <= 0) {
        return function(callback) {
          var elements = this.elements;

          elements.forEach(function(element, index) {
            element.style[Animit.prefix + 'Transition'] = 'none';
            element.transition = 'none';

            Object.keys(css).forEach(function(name) {
              element.style[name] = css[name];
            });
          });

          elements.forEach(function(element) {
            // force to update rendering
            element.getBoundingClientRect();
          });

          setTimeout(callback, 1000 / 60);
        };
      }

      function createActualCssProps(css) {
        var result = {};

        Object.keys(css).forEach(function(name) {
          var value = css[name];
          name = util.normalizeStyleName(name);
          var prefixed = Animit.prefix + util.capitalize(name);

          if (Animit.cssPropertyDict[name]) {
            result[name] = value;
          } else if (Animit.cssPropertyDict[prefixed]) {
            result[prefixed] = value;
          } else {
            result[prefixed] = value;
            result[name] = value;
          }
        });

        return result;
      }

    }
  };

  var util = {
    /**
     * Normalize style property name.
     */
    normalizeStyleName: function(name) {
      name = name.replace(/-[a-zA-Z]/g, function(all) {
        return all.slice(1).toUpperCase();
      });

      return name.charAt(0).toLowerCase() + name.slice(1);
    },

    // capitalize string
    capitalize : function(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Add an event handler on "transitionend" event.
     */
    addOnTransitionEnd: function(element, callback) {
      if (!element) {
        return function() {};
      }

      var fn = function(event) {
        if (element == event.target) {
          event.stopPropagation();
          removeListeners();

          callback();
        }
      };

      var removeListeners = function() {
        util._transitionEndEvents.forEach(function(eventName) {
          element.removeEventListener(eventName, fn);
        });
      };

      util._transitionEndEvents.forEach(function(eventName) {
        element.addEventListener(eventName, fn, false);
      });

      return removeListeners;
    },

    _transitionEndEvents: (function() {
      if (Animit.prefix === 'webkit' || Animit.prefix === 'o' || Animit.prefix === 'moz' || Animit.prefix === 'ms') {
        return [Animit.prefix + 'TransitionEnd', 'transitionend'];
      }

      return ['transitionend'];
    })()

  };

  return Animit;
})();

(function() {
  'use strict';

  // fastclick
  window.addEventListener('load', function() {
    FastClick.attach(document.body);
  }, false);

  // viewport.js
  new Viewport().setup();

  // modernize
  Modernizr.testStyles('#modernizr { -webkit-overflow-scrolling:touch }', function(elem, rule) {
    Modernizr.addTest(
      'overflowtouch',
      window.getComputedStyle && window.getComputedStyle(elem).getPropertyValue('-webkit-overflow-scrolling') == 'touch');
  });
})();
