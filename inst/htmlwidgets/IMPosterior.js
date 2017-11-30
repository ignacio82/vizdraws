/**
 * @prettier
 */

HTMLWidgets.widget({
    name: 'IMPosterior',
    type: 'output',

    factory: function(el, width, height) {
        // TODO: define shared variables for this instance

        return {
            renderValue: function(opts) {
                //transition
                var transDuration = 2500;

                var dataDiscrete = opts.bars.map((b, i) => {
                    b.y = Number(b.y);
                    b.desc = opts.text[i];
                    return b;
                });

                var distParams = {
                    min: d3.min(opts.data, d => d.x),
                    max: d3.max(opts.data, d => d.x)
                };

                if (opts.MME === 0) {
                    distParams.cuts = [opts.MME, distParams.max];
                } else {
                    distParams.cuts = [-opts.MME, opts.MME, distParams.max];
                }

                opts.data = opts.data.sort((a, b) => a.x - b.x);

                var dataContinuousGroups = [];
                distParams.cuts.forEach((c, i) => {
                    let data = opts.data.filter(d => {
                        if (i === 0) {
                            return d.x < c;
                        } else if (i === distParams.cuts.length - 1) {
                            return d.x > distParams.cuts[i - 1];
                        } else {
                            return d.x < c && d.x > distParams.cuts[i - 1];
                        }
                    });

                    if (data.length > 0) {
                        data.unshift({ x: data[0].x, y: 0 });
                        data.push({ x: data[data.length - 1].x, y: 0 });
                    }

                    dataContinuousGroups.push({
                        color: opts.colors[i],
                        data: data
                    });
                });

                var margin = {
                        top: 50,
                        right: 20,
                        bottom: 80,
                        left: 70
                    },
                    dims = {
                        width: width - margin.left - margin.right,
                        height: height - margin.top - margin.bottom
                    };

                var xContinuous = d3
                    .scaleLinear()
                    .domain([
                        Math.min(distParams.min, -opts.MME),
                        Math.max(distParams.max, opts.MME)
                    ])
                    .range([0, dims.width]);

                var xDiscrete = d3
                    .scaleBand()
                    .domain(
                        dataDiscrete.map(function(d) {
                            return d.x;
                        })
                    )
                    .rangeRound([0, dims.width])
                    .padding(0.1);

                var y = d3
                    .scaleLinear()
                    .domain([0, 1])
                    .range([dims.height, 0]);

                var svg = d3
                    .select(el)
                    .html(null)
                    .append('svg')
                    .attr('width', dims.width + margin.left + margin.right)
                    .attr('height', dims.height + margin.top + margin.bottom);

                var g = svg
                    .append('g')
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                var xAxis = d3.axisBottom().scale(xDiscrete);

                var yAxis = d3
                    .axisLeft()
                    .scale(y)
                    .ticks(10)
                    .tickFormat(d3.format('.0%'));

                var yLabel = g
                    .append('text')
                    .attr('class', 'y-axis-label')
                    .attr('transform', 'rotate(-90)')
                    .attr('y', -52)
                    .attr('x', -160)
                    .attr('dy', '.71em')
                    .style('text-anchor', 'end')
                    .style('font-size', 14 + 'px')
                    .text('Probability');

                g
                    .append('g')
                    .attr('class', 'x axis')
                    .attr('transform', 'translate(0,' + dims.height + ')')
                    .call(xAxis);

                g
                    .append('g')
                    .attr('class', 'y axis')
                    .call(yAxis);

                var areas = g
                    .selectAll('.area')
                    .data(dataDiscrete)
                    .enter()
                    .append('path')
                    .attr('class', 'area')
                    .style('fill', function(d) {
                        return d.color;
                    })
                    .attr('d', function(d, i) {
                        let numPts = dataContinuousGroups[i].data.length - 2;
                        var path = d3.path();
                        path.moveTo(xDiscrete(d.x), y(0));
                        for (j = 0; j < numPts; j++) {
                            path.lineTo(
                                xDiscrete(d.x) + j * xDiscrete.bandwidth() / (numPts - 1),
                                y(d.y)
                            );
                        }
                        path.lineTo(xDiscrete(d.x) + xDiscrete.bandwidth(), y(0));
                        return path.toString();
                    });

                var tooltip = d3
                    .tip()
                    .attr('class', 'd3-tip chart-data-tip')
                    .offset([30, 0])
                    .direction('s')
                    .html(function(d, i) {
                        return '<span>' + dataDiscrete[i].desc + '</span>';
                    });

                g.call(tooltip);

                areas.on('mouseover', tooltip.show).on('mouseout', tooltip.hide);

                var thresholdLine = g
                    .append('line')
                    .attr('stroke', 'black')
                    .style('stroke-width', '1.5px')
                    .style('stroke-dasharray', '5,5')
                    .style('opacity', 1)
                    .attr('x1', 0)
                    .attr('y1', y(0))
                    .attr('x2', dims.width)
                    .attr('y2', y(0));

                var updateXAxis = function(type, duration) {
                    if (type === 'continuous') {
                        xAxis.scale(xContinuous);
                    } else {
                        xAxis.scale(xDiscrete);
                    }
                    d3
                        .select('.x')
                        .transition()
                        .duration(duration)
                        .call(xAxis);
                };

                var updateYAxis = function(data, duration) {
                    var extent = d3.extent(data, function(d) {
                        return d.y;
                    });
                    extent[0] = 0;
                    extent[1] = extent[1] + 0.2 * (extent[1] - extent[0]);
                    y.domain(extent);
                    d3
                        .select('.y')
                        .transition()
                        .duration(duration)
                        .call(yAxis);
                };

                var toggle = function(to, duration) {
                    if (to === 'distribution') {
                        updateYAxis(opts.data, 0);
                        updateXAxis('continuous', duration);

                        areas
                            .data(dataContinuousGroups)
                            .transition()
                            .duration(duration)
                            .attr('d', function(d) {
                                var gen = d3
                                    .line()
                                    .x(function(p) {
                                        return xContinuous(p.x);
                                    })
                                    .y(function(p) {
                                        return y(p.y);
                                    });
                                return gen(d.data);
                            });

                        thresholdLine
                            .style('opacity', 0)
                            .attr('y1', y(0))
                            .attr('y2', y(0));

                        g.select('.y.axis').style('opacity', 0);

                        g.select('.y-axis-label').style('opacity', 0);
                    } else {
                        y.domain([0, 1]);
                        d3
                            .select('.y')
                            .transition()
                            .duration(duration)
                            .call(yAxis);

                        updateXAxis('discrete', duration);

                        areas
                            .data(dataDiscrete)
                            .transition()
                            .duration(duration)
                            .attr('d', function(d, i) {
                                let numPts = dataContinuousGroups[i].data.length - 2;
                                var path = d3.path();
                                path.moveTo(xDiscrete(d.x), y(0));
                                for (j = 0; j < numPts; j++) {
                                    path.lineTo(
                                        xDiscrete(d.x) + j * xDiscrete.bandwidth() / (numPts - 1),
                                        y(d.y)
                                    );
                                }
                                path.lineTo(xDiscrete(d.x) + xDiscrete.bandwidth(), y(0));
                                return path.toString();
                            });

                        thresholdLine
                            .transition()
                            .delay(duration)
                            .style('opacity', 1)
                            .transition()
                            .duration(1000)
                            .attr('y1', y(opts.threshold))
                            .attr('y2', y(opts.threshold));

                        g
                            .select('.y.axis')
                            .transition()
                            .duration(0)
                            .delay(duration)
                            .style('opacity', 1);

                        g
                            .select('.y-axis-label')
                            .transition()
                            .duration(0)
                            .delay(duration)
                            .style('opacity', 1);
                    }
                };

                // Add buttons
                var STATUS = 'distribution';

                //colors for different button states
                var defaultColor = '#aaa';
                var hoverColor = '#666';
                var pressedColor = '#000';

                var click = function(context) {
                    if (STATUS === 'discrete') {
                        toggle('distribution', transDuration);

                        var button = d3.select(context);
                        var icon = button.selectAll('.icon');
                        var background = button.select('.background');
                        icon.style('fill', pressedColor);
                        background.style('stroke', pressedColor);

                        STATUS = 'distribution';
                    } else {
                        toggle('discrete', transDuration);

                        var button = d3.select(context);
                        var icon = button.selectAll('.icon');
                        var background = button.select('.background');
                        icon.style('fill', defaultColor);
                        background.style('stroke', defaultColor);

                        STATUS = 'discrete';
                    }
                };

                //container for all buttons
                var allButtons = svg
                    .append('g')
                    .attr('id', 'allButtons')
                    .attr('transform', 'translate(' + (width - 95) + ',' + 15 + ') scale(0.6)');

                var button = allButtons.append('g').attr('id', 'button');

                button
                    .append('rect')
                    .attr('class', 'background')
                    .attr('x', -10)
                    .attr('y', 0)
                    .attr('width', 120)
                    .attr('height', 100)
                    .style('stroke', pressedColor)
                    .style('stroke-width', 2)
                    .style('fill', 'white');

                button
                    .append('rect')
                    .attr('class', 'icon')
                    .attr('y', 75)
                    .attr('width', 100)
                    .attr('height', 2)
                    .style('stroke', 'none')
                    .style('fill', pressedColor);

                button
                    .append('path')
                    .attr('class', 'icon')
                    .attr(
                        'd',
                        'M37.92,42.22c3.78-8,7-14.95,12.08-14.95h0c5,0,8.3,6.93,12.08,14.95,6.12,13,13.73,29.13,33.48,29.13h0v-2h0c-18.48,0-25.79-15.51-31.67-28C59.82,32.74,56.3,25.28,50,25.28h0c-6.3,0-9.82,7.46-13.89,16.09-5.88,12.47-13.19,28-31.67,28h0v2h0C24.18,71.35,31.8,55.2,37.92,42.22Z'
                    )
                    .style('stroke', 'none')
                    .style('fill', pressedColor);

                button
                    .style('cursor', 'pointer')
                    .on('click', function(d, i) {
                        click(this);
                    })
                    .on('mouseover', function() {
                        var button = d3.select(this);
                        var icon = button.selectAll('.icon');
                        var background = button.select('.background');
                        if (STATUS === 'discrete') {
                            icon.style('fill', hoverColor);
                            background.style('stroke', hoverColor);
                        }
                    })
                    .on('mouseout', function() {
                        var button = d3.select(this);
                        var icon = button.selectAll('.icon');
                        var background = button.select('.background');
                        if (STATUS === 'discrete') {
                            icon.style('fill', defaultColor);
                            background.style('stroke', defaultColor);
                        }
                    });

                toggle('distribution', 0);

                setTimeout(() => {
                    click('#button');
                }, 1000);
            },

            resize: function(width, height) {
                // TODO: code to re-render the widget with a new size

                var svg = d3
                    .select(el)
                    .append('svg')
                    .attr('width', dims.width + margin.left + margin.right)
                    .attr('height', dims.height + margin.top + margin.bottom);
            }
        };
    }
});
