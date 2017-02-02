/*
    Counter
    ========================

    @file      : Counter.js
    @version   : 2.0
    @author    : Chad Evans
    @date      : 17 June 2015
    @copyright : Mendix Technology BV
    @license   : Apache License, Version 2.0, January 2004

    Documentation
    ========================
    Adds ability to show a datetime countdown or a timer in a Mendix app.
*/

define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/_base/lang",
    "dojo/json",
    "Counter/lib/jquery",
    "dojo/text!Counter/widget/template/Counter.html",

    "Counter/lib/jquery.TimeCircles-1.5.3"
], function(declare, _WidgetBase, _TemplatedMixin, domStyle, domAttr, lang, json, _jQuery, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    return declare("Counter.widget.Counter", [_WidgetBase, _TemplatedMixin], {

        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // Parameters configured in the Modeler.
        targetDateTimeAttr: "",
        timerValueAttr: "",
        animationBehavior: "",
        oncompletemf: "",
        showDays: false,
        daysText: "",
        daysColor: "",
        showHours: true,
        hoursText: "",
        hoursColor: "",
        showMinutes: true,
        minutesText: "",
        minutesColor: "",
        showSeconds: true,
        secondsText: "",
        secondsColor: "",
        circleBackgroundColor: "",
        foregroundWidth: "",
        backgroundWidth: "",
        extraoptions: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _options: null,

        constructor: function() {
            this._handles = [];
        },

        postCreate: function() {
            logger.debug(this.id + ".postCreate");

            this._updateRendering();
            this._setupEvents();
        },

        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering(callback);
        },

        resize: function(box) {
            logger.debug(this.id + ".resize");
            $(this.tcNode).TimeCircles().rebuild();
        },

        uninitialize: function() {
            logger.debug(this.id + ".uninitialize");

            $(this.tcNode).removeData();
            $(this.tcNode).TimeCircles().destroy();
        },

        _setupEvents: function() {
            logger.debug(this.id + "._setupEvents");
            var bg_width = mx.parser.parseValue(this.backgroundWidth.substring(1), "integer");
            var fg_width = mx.parser.parseValue("0." + this.foregroundWidth.substring(1), "float");

            this._options = {
                "animation": this.animationBehavior,
                "bg_width": bg_width / 100,
                "fg_width": fg_width,
                "circle_bg_color": this.circleBackgroundColor,
                "count_past_zero": false,
                "time": {
                    "Days": {
                        "text": this.daysText,
                        "color": this.daysColor,
                        "show": this.showDays
                    },
                    "Hours": {
                        "text": this.hoursText,
                        "color": this.hoursColor,
                        "show": this.showHours
                    },
                    "Minutes": {
                        "text": this.minutesText,
                        "color": this.minutesColor,
                        "show": this.showMinutes
                    },
                    "Seconds": {
                        "text": this.secondsText,
                        "color": this.secondsColor,
                        "show": this.showSeconds
                    }
                }
            };

            if (this.extraoptions !== "") {
                lang.mixin(this._options, json.parse(this.extraoptions));
            }
        },

        _updateRendering: function(callback) {
            logger.debug(this.id + "._updateRendering");

            if (this._contextObj !== null) {
                domStyle.set(this.tcNode, "display", "block");

                var valueString, jqueryTcNode;

                if (this.targetDateTimeAttr !== "") {
                    valueString = mx.parser.formatAttribute(this._contextObj, this.targetDateTimeAttr, {
                        datePattern: "yyyy-MM-dd HH:mm:ss"
                    });
                    domAttr.set(this.tcNode, "data-date", valueString);
                } else {
                    if (this.timerValueAttr !== "") {
                        valueString = this._contextObj.get(this.timerValueAttr);
                        domAttr.set(this.tcNode, "data-timer", valueString);
                    }
                }

                // clear out old values
                jqueryTcNode = $(this.tcNode);
                jqueryTcNode.removeData();
                jqueryTcNode.TimeCircles().destroy();
                jqueryTcNode.TimeCircles(this._options);

                if (this.oncompletemf !== "") {
                    jqueryTcNode.TimeCircles().addListener(lang.hitch(this, this._onComplete), "visible");
                }
            } else {
                domStyle.set(this.tcNode, "display", "none");
            }

            this._executeCallback(callback, "_updateRendering");
        },

        _onComplete: function(unit, value, total) {
            if (total === 0) {
                logger.debug(this.id + "._onComplete");
                mx.ui.action(this.oncompletemf, {
                    params: {
                        applyto: "selection",
                        guids: [this._contextObj.getGuid()]
                    },
                    callback: function(obj) {
                        //TODO what to do when all is ok!
                    },
                    error: lang.hitch(this, function(error) {
                        console.log(this.id + ": An error occurred while executing microflow: " + error.description);
                    })
                }, this);
            }
        },

        _resetSubscriptions: function() {
            logger.debug(this.id + "._resetSubscriptions");
            this.unsubscribeAll();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function(guid) {
                        this._updateRendering();
                    })
                });

                if (this.targetDateTimeAttr !== "") {
                    this.subscribe({
                        guid: this._contextObj.getGuid(),
                        attr: this.targetDateTimeAttr,
                        callback: lang.hitch(this, function(guid, attr, attrValue) {
                            this._updateRendering();
                        })
                    });
                }

                if (this.timerValueAttr !== "") {
                    this.subscribe({
                        guid: this._contextObj.getGuid(),
                        attr: this.timerValueAttr,
                        callback: lang.hitch(this, function(guid, attr, attrValue) {
                            this._updateRendering();
                        })
                    });
                }
            }
        },

        _executeCallback: function(cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["Counter/widget/Counter"]);
