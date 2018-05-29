/*
 * Adds incremental zoom out to HighCharts. Based on the function in Highcharts JS v4.1.7.
 */
(function(HC) {
    // Support code copied from highcharts.src.js
    var UNDEFINED;
    var doc = document;
    var win = window;
    var mathCeil = Math.ceil;
    var mathMax = Math.max;
    var mathMin = Math.min;
    var userAgent = navigator.userAgent;
    var isOpera = win.opera;
    var isIE = /(msie|trident)/i.test(userAgent) && !isOpera;
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var hasSVG = !!doc.createElementNS && !!doc.createElementNS(SVG_NS, 'svg').createSVGRect;
    var each = HC.each;
    var extend = HC.extend;
    var pick = HC.pick;

    /**
     * Display the zoom button
     */
    HC.Chart.prototype.showResetZoom = function() {
        var chart = this,
            btnOptions = chart.options.chart.resetZoomButton,
            theme = btnOptions.theme,
            states = theme.states,
            alignTo = btnOptions.relativeTo === 'chart' ? null : 'plotBox',
            resetZoomPosition = extend({}, btnOptions.position),
            undoZoomPosition = extend({}, btnOptions.position);

        if (!undoZoomPosition.align || undoZoomPosition.align === 'right') {
            undoZoomPosition.x -= 24;
        } else if (undoZoomPosition.align === 'center') {
            resetZoomPosition.x += 12;
            undoZoomPosition.x -= 12;
        } else {
            resetZoomPosition.x += 24;
        }

        chart.resetZoomButton = chart.renderer.button('', null, null, function() { chart.zoomOut(); }, theme, states && states.hover)
            .attr({
                align: resetZoomPosition.align,
                title: 'Reset zoom level 1:1',
                class: 'glyphicon'
            })
            .add()
            .align(resetZoomPosition, false, alignTo);

        chart.undoZoomButton = chart.renderer.button('', null, null, function() { chart.undoZoom(); }, theme, states && states.hover)
            .attr({
                align: undoZoomPosition.align,
                title: 'Undo zoom',
                class: 'glyphicon'
            })
            .add()
            .align(undoZoomPosition, false, alignTo);

        chart.resetZoomButton.reallyDestroy = chart.resetZoomButton.destroy;
        chart.resetZoomButton.destroy = function() {
            chart.resetZoomButton.reallyDestroy();
            chart.undoZoomButton.destroy();
        };
    };

    /**
     * Zoom out
     */
    HC.Chart.prototype.undoZoom = function() {
        var chart = this,
            history,
            reset,
            doRedraw;

        // record each axis' min and max
        chart.axes.forEach(function(axis) {
            if (axis.zoomEnabled && defined(axis.min)) { // #859, #3569
                if (!axis.history || axis.history.length < 2) {
                    reset = true;
                    return;
                }
                
                history = axis.history.pop();

                axis.panned = history.panned;
                axis.setExtremes(history.min, history.max, false, false, { trigger: 'undo' });

                doRedraw = true;
            }
        });

        if (reset) {
            chart.zoom();
        } else if (doRedraw) {
            chart.redraw(false);
        }
    };

    /**
     * Zoom into a given portion of the chart given by axis coordinates
     * 
     * @param {Object} event
     */
    HC.Chart.prototype.zoom = function(event) {
        var chart = this,
            hasZoomed,
            pointer = chart.pointer,
            displayButton = false,
            resetZoomButton,
            undoZoomButton;

        // If zoom is called with no arguments, reset the axes
        if (!event || event.resetSelection) {
            each(chart.axes, function(axis) {
                hasZoomed = axis.zoom();
                axis.history = []; // Clear history
            });
        } else { // else, zoom in on all axes
            chart.recordHistory();

            each(event.xAxis.concat(event.yAxis), function(axisData) {
                var axis = axisData.axis,
                    isXAxis = axis.isXAxis;

                // don't zoom more than minRange
                if (pointer[isXAxis ? 'zoomX' : 'zoomY'] || pointer[isXAxis ? 'pinchX' : 'pinchY']) {
                    hasZoomed = axis.zoom(axisData.min, axisData.max);
                    if (axis.displayBtn) {
                        displayButton = true;
                    }
                }
            });
        }
        
        // Show or hide the Reset zoom button
        resetZoomButton = chart.resetZoomButton;
        undoZoomButton = chart.undoZoomButton;
        if (displayButton && !resetZoomButton) {
            chart.showResetZoom();
        } else if (!displayButton && isObject(resetZoomButton)) {
            chart.resetZoomButton = resetZoomButton.destroy();
        }
        
        // Redraw
        if (hasZoomed) {
            chart.redraw(
                pick(chart.options.chart.animation, event && event.animation, chart.pointCount < 100) // animation
            );
        }
    };

    /**
     * Now we have computed the normalized tickInterval, get the tick positions
     */
    HC.Axis.prototype.setTickPositions = function() {
        var options = this.options,
            tickPositions,
            tickPositionsOption = options.tickPositions,
            tickPositioner = options.tickPositioner,
            startOnTick = options.startOnTick && !this.panned,
            endOnTick = options.endOnTick && !this.panned,
            single;

        // Set the tickmarkOffset
        this.tickmarkOffset = (this.categories && options.tickmarkPlacement === 'between' && 
            this.tickInterval === 1) ? 0.5 : 0; // #3202


        // get minorTickInterval
        this.minorTickInterval = options.minorTickInterval === 'auto' && this.tickInterval ?
            this.tickInterval / 5 : options.minorTickInterval;

        // Find the tick positions
        this.tickPositions = tickPositions = tickPositionsOption && tickPositionsOption.slice(); // Work on a copy (#1565)
        if (!tickPositions) {
            if (this.isDatetimeAxis) {
                tickPositions = this.getTimeTicks(
                    this.normalizeTimeTickInterval(this.tickInterval, options.units),
                    this.min,
                    this.max,
                    options.startOfWeek,
                    this.ordinalPositions,
                    this.closestPointRange,
                    true
                );
            } else if (this.isLog) {
                tickPositions = this.getLogTickPositions(this.tickInterval, this.min, this.max);
            } else {
                tickPositions = this.getLinearTickPositions(this.tickInterval, this.min, this.max);
            }

            this.tickPositions = tickPositions;

            // Run the tick positioner callback, that allows modifying auto tick positions.
            if (tickPositioner) {
                tickPositioner = tickPositioner.apply(this, [this.min, this.max]);
                if (tickPositioner) {
                    this.tickPositions = tickPositions = tickPositioner;
                }
            }
        }

        if (!this.isLinked) {
            // reset min/max or remove extremes based on start/end on tick
            this.trimTicks(tickPositions, startOnTick, endOnTick);

            // When there is only one point, or all points have the same value on this axis, then min
            // and max are equal and tickPositions.length is 0 or 1. In this case, add some padding
            // in order to center the point, but leave it with one tick. #1337.
            if (this.min === this.max && defined(this.min) && !this.tickAmount) {
                // Substract half a unit (#2619, #2846, #2515, #3390)
                single = true;
                this.min -= 0.5;
                this.max += 0.5;
            }
            this.single = single;

            if (!tickPositionsOption && !tickPositioner) {
                this.adjustTickAmount();
            }
        }
    };

    /**
     * Set the max ticks of either the x and y axis collection
     */
    HC.Axis.prototype.getTickAmount = function() {
        var others = {}, // Whether there is another axis to pair with this one
            hasOther,
            options = this.options,
            tickAmount = options.tickAmount,
            tickPixelInterval = options.tickPixelInterval;

        if (!defined(options.tickInterval) && this.len < tickPixelInterval && !this.isRadial &&
                !this.isLog && options.startOnTick && options.endOnTick && !this.panned) {
            tickAmount = 2;
        }

        if (!tickAmount && this.chart.options.chart.alignTicks !== false && options.alignTicks !== false) {
            // Check if there are multiple axes in the same pane
            each(this.chart[this.coll], function(axis) {
                var options = axis.options,
                    horiz = axis.horiz,
                    key = [horiz ? options.left : options.top, horiz ? options.width : options.height, options.pane].join(',');
                
                if (others[key]) {
                    if (axis.series.length) {
                        hasOther = true; // #4201
                    }
                } else {
                    others[key] = 1;
                }
            });

            if (hasOther) {
                // Add 1 because 4 tick intervals require 5 ticks (including first and last)
                tickAmount = mathCeil(this.len / tickPixelInterval) + 1;
            }
        }

        // For tick amounts of 2 and 3, compute five ticks and remove the intermediate ones. This
        // prevents the axis from adding ticks that are too far away from the data extremes.
        if (tickAmount < 4) {
            this.finalTickAmt = tickAmount;
            tickAmount = 5;
        }
        
        this.tickAmount = tickAmount;
    };

    /**
     * Set the extremes and optionally redraw
     * 
     * @param {Number} newMin
     * @param {Number} newMax
     * @param {Boolean} redraw
     * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
     *    configuration
     * @param {Object} eventArguments
     *
     */
    HC.Axis.prototype.setExtremes = function(newMin, newMax, redraw, animation, eventArguments) {
        var axis = this,
            chart = axis.chart;

        redraw = pick(redraw, true); // defaults to true

        each(axis.series, function(serie) {
            delete serie.kdTree;
        });

        // Extend the arguments with min and max
        eventArguments = extend(eventArguments, {
            min: newMin,
            max: newMax
        });

        if (eventArguments.trigger === 'pan') {
            axis.panned = true;
        }

        // Fire the event
        fireEvent(axis, 'setExtremes', eventArguments, function() { // the default event handler

            axis.userMin = newMin;
            axis.userMax = newMax;
            axis.eventArgs = eventArguments;

            // Mark for running afterSetExtremes
            axis.isDirtyExtremes = true;

            // redraw
            if (redraw) {
                chart.redraw(animation);
            }
        });
    };

    /**
     * Overridable method for zooming chart. Pulled out in a separate method to allow overriding
     * in stock charts.
     */
    HC.Axis.prototype.zoom = function(newMin, newMax) {
        var dataMin = this.dataMin,
            dataMax = this.dataMax,
            options = this.options;

        this.panned = false;

        // Prevent pinch zooming out of range. Check for defined is for #1946. #1734.
        if (!this.allowZoomOutside) {
            if (defined(dataMin) && newMin <= mathMin(dataMin, pick(options.min, dataMin))) {
                newMin = UNDEFINED;
            }
            if (defined(dataMax) && newMax >= mathMax(dataMax, pick(options.max, dataMax))) {
                newMax = UNDEFINED;
            }
        }

        // In full view, displaying the reset zoom button is not required
        this.displayBtn = newMin !== UNDEFINED || newMax !== UNDEFINED;

        // Do it
        this.setExtremes(
            newMin,
            newMax,
            false,
            UNDEFINED,
            { trigger: 'zoom' }
        );
        return true;
    };

    /**
     * Pan the chart by dragging the mouse across the pane. This function is called
     * on mouse move, and the distance to pan is computed from chartX compared to
     * the first chartX position in the dragging operation.
     */
    HC.Chart.prototype.pan = function(e, panning) {
        var chart = this,
            hoverPoints = chart.hoverPoints,
            doRedraw;

        // remove active points for shared tooltip
        if (hoverPoints) {
            each(hoverPoints, function(point) {
                point.setState();
            });
        }

        if (!chart.stillPanning) {
            chart.recordHistory();
            chart.stillPanning = true;
        }
        chart.stopPanning();

        var directions;
        if (panning === 'xy')
            directions = [1, 0];
        else if (panning === 'y')
            directions = [0];
        else
            directions = [1];

        each(directions, function(isX) { // xy is used in maps
            // Disable panning along multiple parallel axes
            if (chart[isX ? 'xAxis' : 'yAxis'].length > 1) return;

            var mousePos = e[(isX == !chart.inverted) ? 'chartX' : 'chartY'],
                axis = chart[isX ? 'xAxis' : 'yAxis'][0],
                startPos = chart[(isX == !chart.inverted) ? 'mouseDownX' : 'mouseDownY'],
                halfPointRange = (axis.pointRange || 0) / 2,
                extremes = axis.getExtremes(),
                newMin = axis.toValue(startPos - mousePos, true) + halfPointRange,
                newMax = axis.toValue(startPos + chart[(isX == !chart.inverted) ? 'plotWidth' : 'plotHeight'] - mousePos, true) - halfPointRange,
                goingDown = (startPos > mousePos); // #3613
            if (mousePos === startPos) return;
            if (newMin > newMax) {
                var t = newMin;
                newMin = newMax;
                newMax = t;
                goingDown = !goingDown;
            }

            if (axis.series.length && 
                (goingDown || newMin > mathMin(extremes.dataMin, extremes.min)) && 
                (!goingDown || newMax < mathMax(extremes.dataMax, extremes.max))) {
                axis.setExtremes(newMin, newMax, false, false, { trigger: 'pan' });
                doRedraw = true;
            }
            chart[(isX == !chart.inverted) ? 'mouseDownX' : 'mouseDownY'] = mousePos; // set new reference for next run
        });

        if (doRedraw) {
            chart.redraw(false);
        }
        css(chart.container, { cursor: 'move' });
    };

    // Add a record to the axis's history
    HC.Chart.prototype.recordHistory = function() {
        var chart = this;

        chart.axes.forEach(function(axis) {
            var extremes = axis.getExtremes(),
                record = {
                    min: extremes.min,
                    max: extremes.max,
                    panned: axis.panned
                };

            if (!axis.history) axis.history = []; // Empty history

            axis.history.append(record);
        });
    };

    HC.Chart.prototype.stopPanning = function() {
        this.stillPanning = false;
    }.debounce(1000);

    function defined(obj) {
        return obj !== UNDEFINED && obj !== null;
    }

    function fireEvent(el, type, eventArguments, defaultFunction) {
        var event = $.Event(type),
            detachedType = 'detached' + type,
            defaultPrevented;

        // Remove warnings in Chrome when accessing returnValue (#2790), layerX and layerY. Although Highcharts
        // never uses these properties, Chrome includes them in the default click event and
        // raises the warning when they are copied over in the extend statement below.
        //
        // To avoid problems in IE (see #1010) where we cannot delete the properties and avoid
        // testing if they are there (warning in chrome) the only option is to test if running IE.
        if (!isIE && eventArguments) {
            delete eventArguments.layerX;
            delete eventArguments.layerY;
            delete eventArguments.returnValue;
        }

        extend(event, eventArguments);

        // Prevent jQuery from triggering the object method that is named the
        // same as the event. For example, if the event is 'select', jQuery
        // attempts calling el.select and it goes into a loop.
        if (el[type]) {
            el[detachedType] = el[type];
            el[type] = null;
        }

        // Wrap preventDefault and stopPropagation in try/catch blocks in
        // order to prevent JS errors when cancelling events on non-DOM
        // objects. #615.
        /*jslint unparam: true*/
        $.each(['preventDefault', 'stopPropagation'], function(i, fn) {
            var base = event[fn];
            event[fn] = function() {
                try {
                    base.call(event);
                } catch (e) {
                    if (fn === 'preventDefault') {
                        defaultPrevented = true;
                    }
                }
            };
        });
        /*jslint unparam: false*/

        // trigger it
        $(el).trigger(event);

        // attach the method
        if (el[detachedType]) {
            el[type] = el[detachedType];
            el[detachedType] = null;
        }

        if (defaultFunction && !event.isDefaultPrevented() && !defaultPrevented) {
            defaultFunction(event);
        }
    }

    function css(el, styles) {
        if (isIE && !hasSVG) { // #2686
            if (styles && styles.opacity !== UNDEFINED) {
                styles.filter = 'alpha(opacity=' + (styles.opacity * 100) + ')';
            }
        }
        extend(el.style, styles);
    }

    function isObject(obj) {
        return obj && typeof obj === 'object';
    }
})(Highcharts);
