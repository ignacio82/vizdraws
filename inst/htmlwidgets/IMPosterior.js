/**
 * @prettier
 */

HTMLWidgets.widget({
    name: 'IMPosterior',
    type: 'output',

    factory: function(el, width, height) {
        let options, dims, margin, status, mode;
        return {
            setupSvg: () => {
                d3.select(el).selectAll('*').remove();
                return d3.select(el).append('svg');
            },
            draw: function(opts, svg) {
                const vis = this;
                // if width or height is 0 then try again to determine width and height of container
                width = width <= 0 ? $(el).outerWidth() : width;
                height = height <= 0 ? $(el).outerHeight() : height;

                margin = {
                    top: 50,
                    right: 20,
                    bottom: 80,
                    left: 70
                };

                dims = {
                    width: width - margin.left - margin.right,
                    height: height - margin.top - margin.bottom
                };

                // defined globally now
                STATUS = opts.start_status;
                MODE = opts.start_mode;

                const transDuration = 500;

                const allow_mode_trans = opts.allow_mode_trans;
                const allow_threshold = opts.allow_threshold;

                const defaultColor = '#aaa';
                const hoverColor = '#666';
                const pressedColor = '#000';

                const distParams = {
                    min: d3.min(opts.data, d => d.x),
                    max: d3.max(opts.data, d =>  d.x)
                };

                if (opts.MME === 0) {
                    distParams.cuts = [opts.MME, distParams.max];
                } else {
                    distParams.cuts = [-opts.MME, opts.MME, distParams.max];
                }

                // sort input data
                // Can sort on prior
                opts.data = opts.data.sort((a, b) => a.x - b.x);

                // set up data for bars
                let dataDiscrete = opts.bars.map((b, i) => {
                    b.y_prior = Number(b.y_prior);
                    b.y_posterior = Number(b.y_posterior);
                    b.desc_prior = opts.text_prior[i];
                    b.desc_posterior = opts.text_posterior[i];
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
                        data.unshift({ x: data[0].x, y_prior: 0, y_posterior: 0 });
                        data.push({ x: data[data.length - 1].x, y_prior: 0, y_posterior: 0 });
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

                svg
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

				// Y axis label. Translates 
                let yLabel = g
                    .append('text')
                    .attr('class', 'y-axis-label')
                    .attr('transform', `rotate(-90) translate(${-dims.height/2},${-margin.left + 20})`)
                    .attr('dy', '.71em')
                    .style('text-anchor', 'middle')
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
                           (MODE=="prior" ? y(d.y_prior) : y(d.y_posterior))
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
                        .y(p => (MODE=="prior" ? y(p.y_prior) : y(p.y_posterior)));
                    return gen(d.data);
                };

                let transBarHeights = d => {
                    // line with x and y values defned by data
                    let gen = d3
                        .line()
                        .x(p => xDiscrete(p.x))
                        .y(p => (MODE=="prior" ? y(p.y_prior) : y(p.y_posterior)));
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

                // define reusable tooltip
                let tooltip = d3
                    .tip()
                    .attr('class', 'd3-tip chart-data-tip')
                    .style('z-index',1050)
                    .offset([30, 0])
                    .direction('s')
                    .html((d, i) => '<span>' + (MODE=="prior" ? dataDiscrete[i].desc_prior : dataDiscrete[i].desc_posterior) + '</span>');

                // attach tooltip to container
                g.call(tooltip);

                // show tooltip on hover over areas
                areas.on('mouseover', tooltip.show).on('mouseout', tooltip.hide);

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

                    g
                        .select('.x')
                        .transition()
                        .duration(duration)
                        .call(xAxis);
                };

                // function to update y axis
                let updateYAxis = (data, duration) => {
                    const extent = d3.extent(data, d => Math.max(d.y_prior, d.y_posterior));
                    extent[0] = 0;
                    extent[1] = extent[1] + 0.2 * (extent[1] - extent[0]);
                    y.domain(extent);

                    g
                        .select('.y')
                        .transition()
                        .duration(duration)
                        .call(yAxis);
                };

                // function to switch between bars and distribution
                let toggle_status = (to, duration) => {
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
                            .interrupt()
                            .style('opacity', 0)
                            .attr('y1', y(0))
                            .attr('y2', y(0));

                        // hide y axis
                        g.select('.y.axis').interrupt().style('opacity', 0);
                        g.select('.y-axis-label').interrupt().style('opacity', 0);
						
						// Turn off button
						status_button.classed('active',true);
						
						// Update status
						STATUS = 'distribution'
                    } else {
                        // update axes
                        y.domain([0, 1]);
                        g
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

                        // make threshold line float up
                        thresholdLine
                            .transition()
                            .delay(duration)
                            .style('opacity', (allow_threshold ? 1 : 0))
                            .transition()
                            .duration(duration)
                            .attr('y1', (allow_threshold ? y(opts.threshold) : y(0)))
                            .attr('y2', (allow_threshold ? y(opts.threshold) : y(0)));

                        // transition in y axis
                        g
                            .select('.y.axis')
                            .transition()
                            .delay(duration)
							.duration(duration)
                            .style('opacity', 1);

                        g
                            .select('.y-axis-label')
                            .transition()
                            .delay(duration)
							.duration(duration)
                            .style('opacity', 1);
						
						// Turn on button
						status_button.classed('active',false);
						
						// Update status
						STATUS = 'discrete'
                    }
                };
				
				let toggle_mode = (to, duration) => {
					// Update mode and activate/deactivate button
					MODE = to;
					mode_button.classed('active',MODE=='posterior');
					
					if (STATUS === 'discrete') {
                        areas
                            .data(dataDiscrete)
                            .transition()
                            .duration(duration)
                            .attr('d', transToBars);
                    } else {
                       areas
                            .data(dataContinuousGroups)
                            .transition()
                            .duration(duration)
                            .attr('d', transToDistributionSegments);
                    }
				};

                // create button containers
                let allButtons = svg
                    .append('g')
					.attr('class','button-container')
                    .attr('transform', 'translate(' + (width - 95) + ',' + 15 + ') scale(0.6)');

                let status_button = allButtons.append('g').attr('class', 'trans-button status-button').classed('active', STATUS=='distribution');

                // button background/border box
                status_button
                    .append('rect')
                    .attr('class', 'background')
                    .attr('x', -10)
                    .attr('y', 0)
                    .attr('width', 120)
                    .attr('height', 100);

                // x axis in button graphic
                status_button
                    .append('rect')
                    .attr('class', 'icon')
                    .attr('y', 75)
                    .attr('width', 100)
                    .attr('height', 2);

                // curve in button graphic
                status_button
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
                    );

                // button interactions
                status_button
                    .style('cursor', 'pointer')
                    .on('click', function(d) {
                        toggle_status((STATUS=='discrete' ? 'distribution' : 'discrete'),transDuration);
                    });

                // Button to transition prior/posterior
                let mode_button = allButtons.append('g').attr('class', 'trans-button mode-button').classed('active', MODE=='posterior');

                // button background/border box
                mode_button
                    .append('rect')
                    .attr('class', 'background')
                    .attr('x', -10)
                    .attr('y', 110)
                    .attr('width', 120)
                    .attr('height', 100);

                mode_button
                    .append('text')
                    .attr('class', 'icon')
                    .text('Posterior')
                    .attr('text-anchor','middle')
                    .attr('alignment-baseline','middle')
                    .attr('x',50)
                    .attr('y',160);

                mode_button
                    .style('cursor', 'pointer')
                    .on('click', function(d) {
                        toggle_mode((MODE=='prior' ? 'posterior' : 'prior'),transDuration);
                    });

                // If only one of prior/posterior chosen, simply don't show button2
                if (!allow_mode_trans) {
                    mode_button
                    .remove();
                }

				// start app
                toggle_status(STATUS, 0);
				
				// If both prior & posterior are present, go from prior dens -> post dens -> post bars
				if (opts.initial_trans) {
					if (allow_mode_trans) {
						setTimeout(() => {
							toggle_mode('posterior',transDuration);
						}, 1000);
						setTimeout(() => {
							toggle_status('discrete',transDuration);
						}, 2000);
					} else {
						setTimeout(() => {
							toggle_status('discrete',transDuration);
						}, 1000);
					}
				}
            },
            renderValue: function(opts) {
				
                console.log('render w,h', width, height);
                // keep options for resize
                options = opts;

                // create main containers
                let svg = this.setupSvg();

                let timeout = 0;
                if(height <= 0 || width <= 0) {
                    // set a timeout to handle potential animation of the parent container
                    //   in cases like a modal
                    timeout = 500;
                }
                setTimeout(this.draw.bind(this, opts, svg), timeout);
            },

            resize: function(newWidth, newHeight) {
                console.log('resize w, h', newWidth, newHeight);
				width = newWidth;
				height = newHeight;
                // TODO: code to re-render the widget with a new size
                /*let svg = d3
                    .select(el)
                    .append('svg')  // definitely don't think you'll want to append a new svg
                    .attr('width', dims.width + margin.left + margin.right)
                    .attr('height', dims.height + margin.top + margin.bottom);
                */
				// Set initials to whatever they currently were when graph was last changed
				options.start_mode=MODE;
				options.start_status=STATUS;
				options.initial_trans=false;
                // if you don't care about animation or transition
                // you can just call render
                this.renderValue(options);

                // or without uncommenting as of now do nothing
            }
        };
    }
});
