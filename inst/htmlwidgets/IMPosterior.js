/**
 * @prettier
 */

HTMLWidgets.widget({
    name: 'IMPosterior',
    type: 'output',

    factory: (el, width, height) => {
        return {
            renderValue: opts => {
                console.log('render w,h', width, height);
                const vis = this;
                // define globals
                let STATUS = 'distribution';

                const transDuration = 500;

                const defaultColor = '#aaa';
                const hoverColor = '#666';
                const pressedColor = '#000';

                const margin = {
                    top: 50,
                    right: 20,
                    bottom: 80,
                    left: 70
                };

                const dims = {
                    width: width - margin.left - margin.right,
                    height: height - margin.top - margin.bottom
                };

                vis.dims = dims;
                vis.margin = margin;

                const distParams = {
                    min: d3.min(opts.data, d => d.x),
                    max: d3.max(opts.data, d => d.x)
                };

                if (opts.MME === 0) {
                    distParams.cuts = [opts.MME, distParams.max];
                } else {
                    distParams.cuts = [-opts.MME, opts.MME, distParams.max];
                }

                // sort input data
                opts.data = opts.data.sort((a, b) => a.x - b.x);

                // set up data for bars
                let dataDiscrete = opts.bars.map((b, i) => {
                    b.y = Number(b.y);
                    b.desc = opts.text[i];
                    return b;
                });

                // set up data for distribution
                let dataContinuousGroups = [];
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

                // set up scales
                let xContinuous = d3
                    .scaleLinear()
                    .domain([
                        Math.min(distParams.min, -opts.MME),
                        Math.max(distParams.max, opts.MME)
                    ])
                    .range([0, dims.width]);

                let xDiscrete = d3
                    .scaleBand()
                    .domain(dataDiscrete.map(d => d.x))
                    .rangeRound([0, dims.width])
                    .padding(0.1);

                let y = d3
                    .scaleLinear()
                    .domain([0, 1])
                    .range([dims.height, 0]);

                // create main containers
                let svg = d3
                    .select(el)
                    .html(null)
                    .append('svg')
                    .attr('width', dims.width + margin.left + margin.right)
                    .attr('height', dims.height + margin.top + margin.bottom);

                let g = svg
                    .append('g')
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                // define axes
                let xAxis = d3.axisBottom().scale(xDiscrete);

                let yAxis = d3
                    .axisLeft()
                    .scale(y)
                    .ticks(10)
                    .tickFormat(d3.format('.0%'));

                let yLabel = g
                    .append('text')
                    .attr('class', 'y-axis-label')
                    .attr('transform', 'rotate(-90)')
                    .attr('y', -52)
                    .attr('x', -160)
                    .attr('dy', '.71em')
                    .style('text-anchor', 'end')
                    .style('font-size', 14 + 'px')
                    .text('Probability');

                // create axes
                g
                    .append('g')
                    .attr('class', 'x axis')
                    .attr('transform', 'translate(0,' + dims.height + ')')
                    .call(xAxis);

                g
                    .append('g')
                    .attr('class', 'y axis')
                    .call(yAxis);

                // function to transition areas to bars
                let transToBars = (d, i) => {
                    // Each bar will be defined by a svg path made up of the same number
                    // of points as the corresponding distribution section. We do this
                    // so that the shape transition will be smooth.
                    //
                    // The distribution sections are made up of all of the actual data
                    // points plus one extra point on each end at [x0, 0] and [xn, 0] so
                    // that the distribution section extends down to the x-axis.
                    //
                    // Therefore, we draw the bars starting with a point on the x-axis
                    // followed by n equally-space points with y values equal to the
                    // height of the bar (n = number of data points). Then finally we add
                    // another point on the x-axis to complete the rectange.
                    //
                    // Pictorally:

                    //
                    //    dist                        bar
                    //             . .
                    //            .
                    //         . .
                    //        .             to      .........
                    //       .            ------\
                    //    . .             ------/
                    //
                    //
                    //
                    //
                    // ___.__________.______________._______.___ x-axis
                    //

                    let path = d3.path();

                    // continuous data already contains x-axis anchor points
                    // we're adding those outside of the loop below, so we
                    // subtract 2 from our counter
                    let numPts = dataContinuousGroups[i].data.length - 2;

                    // start on x-axis
                    path.moveTo(xDiscrete(d.x), y(0));

                    // create points along the top of the bar
                    for (j = 0; j < numPts; j++) {
                        path.lineTo(
                            xDiscrete(d.x) + j * xDiscrete.bandwidth() / (numPts - 1),
                            y(d.y)
                        );
                    }

                    // end on x-axis
                    path.lineTo(xDiscrete(d.x) + xDiscrete.bandwidth(), y(0));

                    // return stringified path data
                    return path.toString();
                };

                // function to transition areas to distribution segments
                let transToDistributionSegments = d => {
                    // line with x and y values defned by data
                    let gen = d3
                        .line()
                        .x(p => xContinuous(p.x))
                        .y(p => y(p.y));
                    return gen(d.data);
                };

                // create bars
                let areas = g
                    .selectAll('.area')
                    .data(dataDiscrete)
                    .enter()
                    .append('path')
                    .attr('class', 'area')
                    .style('fill', d => d.color)
                    .attr('d', transToBars);

                // // define reusable tooltip
                // let tooltip = d3
                //     .tip()
                //     .attr('class', 'd3-tip chart-data-tip')
                //     .offset([30, 0])
                //     .direction('s')
                //     .html((d, i) => '<span>' + dataDiscrete[i].desc + '</span>');

                // // attach tooltip to container
                // g.call(tooltip);

                // // show tooltip on hover over areas
                // areas.on('mouseover', tooltip.show).on('mouseout', tooltip.hide);

                // define threshold line
                let thresholdLine = g
                    .append('line')
                    .attr('stroke', 'black')
                    .style('stroke-width', '1.5px')
                    .style('stroke-dasharray', '5,5')
                    .style('opacity', 1)
                    .attr('x1', 0)
                    .attr('y1', y(0))
                    .attr('x2', dims.width)
                    .attr('y2', y(0));

                // function to update x axis
                let updateXAxis = (type, duration) => {
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

                // function to update y axis
                let updateYAxis = (data, duration) => {
                    const extent = d3.extent(data, d => d.y);
                    extent[0] = 0;
                    extent[1] = extent[1] + 0.2 * (extent[1] - extent[0]);
                    y.domain(extent);

                    d3
                        .select('.y')
                        .transition()
                        .duration(duration)
                        .call(yAxis);
                };

                // function to switch between bars and distribution
                let toggle = (to, duration) => {
                    if (to === 'distribution') {
                        // update axes
                        updateYAxis(opts.data, 0);
                        updateXAxis('continuous', duration);

                        // change bars to areas
                        areas
                            .data(dataContinuousGroups)
                            .transition()
                            .duration(duration)
                            .attr('d', transToDistributionSegments);

                        // hide threshold line
                        thresholdLine
                            .style('opacity', 0)
                            .attr('y1', y(0))
                            .attr('y2', y(0));

                        // hide y axis
                        g.select('.y.axis').style('opacity', 0);
                        g.select('.y-axis-label').style('opacity', 0);
                    } else {
                        // update axes
                        y.domain([0, 1]);
                        d3
                            .select('.y')
                            .transition()
                            .duration(duration)
                            .call(yAxis);

                        updateXAxis('discrete', duration);

                        // change areas to bars
                        areas
                            .data(dataDiscrete)
                            .transition()
                            .duration(duration)
                            .attr('d', transToBars);

                        // make threshold line appear and float up
                        thresholdLine
                            .transition()
                            .delay(duration)
                            .style('opacity', 1)
                            .transition()
                            .duration(1000)
                            .attr('y1', y(opts.threshold))
                            .attr('y2', y(opts.threshold));

                        // transition in y axis
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

                // function called when toggle button pushed
                let click = context => {
                    let button, icon, background;
                    if (STATUS === 'discrete') {
                        toggle('distribution', transDuration);

                        button = d3.select(context);
                        icon = button.selectAll('.icon');
                        background = button.select('.background');
                        icon.style('fill', pressedColor);
                        background.style('stroke', pressedColor);

                        STATUS = 'distribution';
                    } else {
                        toggle('discrete', transDuration);

                        button = d3.select(context);
                        icon = button.selectAll('.icon');
                        background = button.select('.background');
                        icon.style('fill', defaultColor);
                        background.style('stroke', defaultColor);

                        STATUS = 'discrete';
                    }
                };

                // create button containers
                let allButtons = svg
                    .append('g')
                    .attr('id', 'allButtons')
                    .attr('transform', 'translate(' + (width - 95) + ',' + 15 + ') scale(0.6)');

                let button = allButtons.append('g').attr('id', 'button');

                // button background/border box
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

                // x axis in button graphic
                button
                    .append('rect')
                    .attr('class', 'icon')
                    .attr('y', 75)
                    .attr('width', 100)
                    .attr('height', 2)
                    .style('stroke', 'none')
                    .style('fill', pressedColor);

                // curve in button graphic
                button
                    .append('path')
                    .attr('class', 'icon')
                    .attr(
                        'd',
                        'M37.92,42.22c3.78-8,7-14.95,12.08-14.95h' +
                            '0c5,0,8.3,6.93,12.08,14.95,6.12,13,13.73,29.13,33.48,29.13' +
                            'h0v-2h0c-18.48,0-25.79-15.51-31.67-28' +
                            'C59.82,32.74,56.3,25.28,50,25.28' +
                            'h0c-6.3,0-9.82,7.46-13.89,16.09-5.88,12.47-13.19,28-31.67,28' +
                            'h0v2h0C24.18,71.35,31.8,55.2,37.92,42.22Z'
                    )
                    .style('stroke', 'none')
                    .style('fill', pressedColor);

                // button interactions
                button
                    .style('cursor', 'pointer')
                    .on('click', function(d) {
                        click(this);
                    })
                    .on('mouseover', function() {
                        let button = d3.select(this);
                        let icon = button.selectAll('.icon');
                        let background = button.select('.background');
                        if (STATUS === 'discrete') {
                            icon.style('fill', hoverColor);
                            background.style('stroke', hoverColor);
                        }
                    })
                    .on('mouseout', function() {
                        let button = d3.select(this);
                        let icon = button.selectAll('.icon');
                        let background = button.select('.background');
                        if (STATUS === 'discrete') {
                            icon.style('fill', defaultColor);
                            background.style('stroke', defaultColor);
                        }
                    });

                // start app as distribution
                toggle('distribution', 0);

                // wait 1 second then transition to bars
                setTimeout(() => {
                    click('#button');
                }, 1000);
            },

            resize: (width, height) => {
                console.log('resize w, h', width, height);
                const vis = this;
                // TODO: code to re-render the widget with a new size
                let svg = d3
                    .select(el)
                    .append('svg')
                    .attr('width', vis.dims.width + vis.margin.left + vis.margin.right)
                    .attr('height', vis.dims.height + vis.margin.top + vis.margin.bottom);
            }
        };
    }
});
