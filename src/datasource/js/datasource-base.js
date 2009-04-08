/**
 * The DataSource utility provides a common configurable interface for widgets to
 * access a variety of data, from JavaScript arrays to online database servers.
 *
 * @module datasource
 * @requires base
 * @title DataSource Utility
 */
var LANG = Y.Lang,
    
/**
 * Base class for the YUI DataSource utility.
 * @class DataSource
 * @extends Base
 * @constructor
 */    
DSLocal = function() {
    DSLocal.superclass.constructor.apply(this, arguments);
};
    
    /////////////////////////////////////////////////////////////////////////////
    //
    // DataSource static properties
    //
    /////////////////////////////////////////////////////////////////////////////
Y.mix(DSLocal, {
    /**
     * Class name.
     *
     * @property DataSource.NAME
     * @type String
     * @static     
     * @final
     * @value "DataSource.Local"
     */
    NAME: "DataSource.Local",

    /////////////////////////////////////////////////////////////////////////////
    //
    // DataSource Attributes
    //
    /////////////////////////////////////////////////////////////////////////////

    ATTRS: {
        /**
        * @attribute source
        * @description Pointer to live data.
        * @type MIXED
        * @default null        
        */
        source: {
            value: null
        }
    },

    /**
     * Global transaction counter.
     *
     * @property DataSource._tId
     * @type Number
     * @static
     * @private
     * @default 0
     */
    _tId: 0,

    /**
     * Executes a given callback.  The third param determines whether to execute
     *
     * @method DataSource.issueCallback
     * @param callback {Object} The callback object.
     * @param params {Array} params to be passed to the callback method
     * @param error {Boolean} whether an error occurred
     * @static
     */
    issueCallback: function (response) {
        if(response.callback) {
            var scope = response.callback.scope || window,
                callbackFunc = (response.error && response.callback.failure) || response.callback.success;
            if (callbackFunc) {
                callbackFunc.apply(scope, [response]);
            }
        }
    }
});
    
Y.extend(DSLocal, Y.Base, {
    /**
    * @property _queue
    * @description Object literal to manage asynchronous request/response
    * cycles enabled if queue needs to be managed (asyncMode/xhrConnMode):
        <dl>
            <dt>interval {Number}</dt>
                <dd>Interval ID of in-progress queue.</dd>
            <dt>conn</dt>
                <dd>In-progress connection identifier (if applicable).</dd>
            <dt>requests {Object[]}</dt>
                <dd>Array of queued request objects: {request:oRequest, callback:_xhrCallback}.</dd>
        </dl>
    * @type Object
    * @default {interval:null, conn:null, requests:[]}    
    * @private     
    */
    _queue: null,
    
    /**
    * @method initializer
    * @description Internal init() handler.
    * @private        
    */
    initializer: function() {
        this._queue = {interval:null, conn:null, requests:[]};
        this._initEvents();
    },

    /**
    * @method destructor
    * @description Internal destroy() handler.
    * @private        
    */
    destructor: function() {
    },

    /**
    * @method _createEvents
    * @description This method creates all the events for this module
    * Target and publishes them so we get Event Bubbling.
    * @private        
    */
    _initEvents: function() {
        /**
         * Fired when a data request is received.
         *
         * @event request
         * @param e {Event.Facade} Event Facade.         
         * @param o {Object} Object with the following properties:
         * <dl>                          
         * <dt>tId (Number)</dt> <dd>Unique transaction ID.</dd>
         * <dt>request (Object)</dt> <dd>The request.</dd>
         * <dt>callback (Object)</dt> <dd>The callback object.</dd>
         * </dl>
         * @preventable _defRequestFn
         */
        //this.publish("request", {defaultFn: this._defRequestFn});
        this.publish("request", {defaultFn:function(e, o){
            this._defRequestFn(e, o);
        }});
         
        /**
         * Fired when raw data is received.
         *
         * @event data
         * @param e {Event.Facade} Event Facade.
         * @param o {Object} Object with the following properties:
         * <dl>                          
         * <dt>tId (Number)</dt> <dd>Unique transaction ID.</dd>
         * <dt>request (Object)</dt> <dd>The request.</dd>
         * <dt>callback (Object)</dt> <dd>The callback object.</dd>
         * <dt>data (Object)</dt> <dd>The raw data.</dd>
         * </dl>
         * @preventable _defDataFn
         */
        //this.publish("data", {defaultFn: this._defDataFn});
         this.publish("data", {defaultFn:function(e, o){
            this._defDataFn(e, o);
        }});

        /**
         * Fired when response is returned.
         *
         * @event response
         * @param e {Event.Facade} Event Facade.
         * @param o {Object} Object with the following properties:
         * <dl>
         * <dt>tId (Number)</dt> <dd>Unique transaction ID.</dd>
         * <dt>request (Object)</dt> <dd>The request.</dd>
         * <dt>callback (Object)</dt> <dd>The callback object.</dd>
         * <dt>data (Object)</dt> <dd>The raw data.</dd>
         * <dt>results (Object)</dt> <dd>Parsed results.</dd>
         * <dt>meta (Object)</dt> <dd>Parsed meta results data.</dd>
         * <dt>error (Boolean)</dt> <dd>Error flag.</dd>
         * </dl>
         * @preventable _defResponseFn
         */
         //this.publish("response", {defaultFn: this._defResponseFn});
         this.publish("response", {defaultFn:function(e, o){
            this._defResponseFn(e, o);
        }});

        /**
         * Fired when an error is encountered.
         *
         * @event error
         * @param e {Event.Facade} Event Facade.
         * @param o {Object} Object with the following properties:
         * <dl>
         * <dt>tId (Number)</dt> <dd>Unique transaction ID.</dd>
         * <dt>request (Object)</dt> <dd>The request.</dd>
         * <dt>callback (Object)</dt> <dd>The callback object.</dd>
         * <dt>data (Object)</dt> <dd>The raw data (if available).</dd>
         * <dt>results (Object)</dt> <dd>Parsed results (if available).</dd>
         * <dt>meta (Object)</dt> <dd>Parsed meta results data (if available).</dd>
         * <dt>error (Boolean)</dt> <dd>Error flag.</dd>
         * </dl>
         */

    },

    /**
     * Manages request/response transaction. Must fire <code>response</code>
     * event when response is received. This method should be implemented by
     * subclasses to achieve more complex behavior such as accessing remote data.
     *
     * @method _defRequestFn
     * @param e {Event.Facade} Event Facade.         
     * @param o {Object} Object with the following properties:
     * <dl>                          
     * <dt>tId (Number)</dt> <dd>Unique transaction ID.</dd>
     * <dt>request (Object)</dt> <dd>The request.</dd>
     * <dt>callback (Object)</dt> <dd>The callback object.</dd>
     * </dl>
     * @protected
     */
    _defRequestFn: function(e, o) {
        var data = this.get("source");
        
        // Problematic data
        if(LANG.isUndefined(data)) {
            o.error = true;
        }
        if(o.error) {
            this.fire("error", null, o);
            Y.log("Error in response", "error", this.toString());
        }

        this.fire("data", null, Y.mix(o, {data:data}));
        Y.log("Transaction " + e.tId + " complete. Request: " +
                Y.dump(o.request) + " . Response: " + Y.dump(o.response), "info", this.toString());
    },

    /**
     * Normalizes raw data into a response that includes results and meta properties.
     *
     * @method _defDataFn
     * @param e {Event.Facade} Event Facade.
     * @param o {Object} Object with the following properties:
     * <dl>                          
     * <dt>tId (Number)</dt> <dd>Unique transaction ID.</dd>
     * <dt>request (Object)</dt> <dd>The request.</dd>
     * <dt>callback (Object)</dt> <dd>The callback object.</dd>
     * <dt>data (Object)</dt> <dd>The raw response data.</dd>
     * </dl>
     * @protected
     */
    _defDataFn: function(e, o) {
        // Pass through data as-is
        o.results = o.data;
        
        // Normalize
        if(!o.results) {
            o.results = [];
        }
        if(!o.meta) {
            o.meta = {};
        }
        
        this.fire("response", null, o);
    },

    /**
     * Sends data as a normalized response to callback.
     *
     * @method _defResponseFn
     * @param e {Event.Facade} Event Facade.
     * @param o {Object} Object with the following properties:
     * <dl>
     * <dt>tId (Number)</dt> <dd>Unique transaction ID.</dd>
     * <dt>request (Object)</dt> <dd>The request.</dd>
     * <dt>callback (Object)</dt> <dd>The callback object.</dd>
     * <dt>data (Object)</dt> <dd>Raw data.</dd>
     * <dt>results (Object)</dt> <dd>Parsed results.</dd>
     * <dt>meta (Object)</dt> <dd>Parsed meta data.</dd>
     * </dl>
     * @protected
     */
    _defResponseFn: function(e, o) {
        // Send the response back to the callback
        DSLocal.issueCallback(o);
    },
    /**
     * Generates a unique transaction ID and fires <code>request</code> event.
     *
     * @method sendRequest
     * @param request {Object} Request.
     * @param callback {Object} An object literal with the following properties:
     *     <dl>
     *     <dt><code>success</code></dt>
     *     <dd>The function to call when the data is ready.</dd>
     *     <dt><code>failure</code></dt>
     *     <dd>The function to call upon a response failure condition.</dd>
     *     <dt><code>scope</code></dt>
     *     <dd>The object to serve as the scope for the success and failure handlers.</dd>
     *     <dt><code>argument</code></dt>
     *     <dd>Arbitrary data payload that will be passed back to the success and failure handlers.</dd>
     *     </dl>
     * @return {Number} Transaction ID.
     */
    sendRequest: function(request, callback) {
        var tId = DSLocal._tId++;
        this.fire("request", null, {tId:tId, request:request,callback:callback});
        Y.log("Transaction " + tId + " sent request: " + Y.dump(request), "info", this.toString());
        return tId;
    }
});
    
Y.namespace("DataSource");
Y.DataSource.Local = DSLocal;
    