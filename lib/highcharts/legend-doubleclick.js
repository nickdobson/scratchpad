/*
 * Adds a double-click listener to legend items. When fired, it will hide all other legend items.
 */
(function(HC, HCA) {
    HC.Legend.prototype.setBasicItemEvents = HC.Legend.prototype.setItemEvents;

    HC.Legend.prototype.setItemEvents = function(item, legendItem, useHTML, itemStyle, itemHiddenStyle) {
        var legend = this;
        legend.setBasicItemEvents(item, legendItem, useHTML, itemStyle, itemHiddenStyle);
        
        // Set the events on the item group, or in case of useHTML, the item itself (#1249)
        (useHTML ? legendItem : item.legendGroup).on('dblclick', function(event) {
            var strLegendItemClick = 'legendItemClick',
                fnLegendItemDblclick = function() {
                    var allHidden = true;

                    legend.allItems.forEach(function(i) {
                        if (i !== item && i.visible)
                            allHidden = false;
                    });

                    legend.allItems.forEach(function(i) {
                        if (i !== item)
                            i.setVisible(allHidden, false);
                    });

                    item.setVisible(true);
                };
                
            // Pass over the click/touch event. #4.
            event = {
                browserEvent: event
            };

            // click the name or symbol
            if (item.firePointEvent) { // point
                item.firePointEvent(strLegendItemClick, event, fnLegendItemDblclick);
            } else {
                HCA.fireEvent(item, strLegendItemClick, event, fnLegendItemDblclick);
            }
        });
    };
})(Highcharts, HighchartsAdapter);
