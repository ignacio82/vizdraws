
function factory(el, width, height) {
  let options, dims, margin, status, mode;

  return {
    setupSvg: () => {
        d3.select(el).selectAll('*').remove();
        return d3.select(el).append('svg');
    },

    draw: function(opts, svg) {
      this.actualDraw(opts, svg);

      // Load and display the logo if path is provided
      if (opts.logoPath) {
        this.loadAndDisplayLogo(opts, svg);
      }
    },
    actualDraw: function(opts, svg) {
      const vis = this;
      // if width or height is 0 then use reasonable default - 400 for height,
      // and height for width
      height = height <= 0 ? 400 : height;
      width = width <= 0 ? height : width;
      // Set background color and opacity
      svg.style('background-color', backgroundColor)
         .style('opacity', backgroundOpacity);

      // Calculate how much space the titles will take up
      const title_space =
          23 * opts.font_scale * ((opts.title !== '') + opts.display_mode_name);
      // Calculate the space the button would take up ignoring font size
      const desired_button_size =
          100 * Math.max(Math.min(1, 0.4 + 0.4 * (height - 300) / 500), 0.4);
      // Use the larger
      const top_space = Math.max(title_space, desired_button_size);

      // Buttons scale between 40-80px, depending on height between 300 and 800
      // px
      var button_dims =
          {scale: top_space / 100, width: 120, height: 100, buffer: 10};


      // Top margin fits the buttons. Always needs 10px buffer, plus height of
      // button Top, bottom, and left margin scale with font size to accomodate
      // larger scales/labels
      margin = {
        top: 10 + 100 * button_dims.scale,
        right: 20,
        bottom: 20 + 60 * opts.font_scale,
        left: 40 + 30 * opts.font_scale
      };

      dims = {
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom
      };

      // defined globally now
      var STATUS = opts.start_status;
      var MODE = opts.start_mode;

      const transDuration = 500;

      const allow_mode_trans = opts.allow_mode_trans;
      const allow_threshold = opts.allow_threshold;

      const distParams = {
        min: d3.min(opts.dens, d => d.x),
        max: d3.max(opts.dens, d => d.x)
      };

      // If no MME or breaks are passed, R will pass a single value break, so
      // convert to array
      if (opts.breaks instanceof Array) {
        distParams.cuts = opts.breaks;
      } else {
        distParams.cuts = [opts.breaks];
      }
      // Append something over the max onto the end of cuts
      // That way, can always do <cutn+1
      distParams.cuts.push(distParams.max + 1);

      // sort input data
      opts.dens = opts.dens.sort((a, b) => a.x - b.x);
      opts.prior = opts.prior.sort((a, b) => a - b);
      opts.posterior = opts.posterior.sort((a, b) => a - b);

      let probs = [];
      let calculateProbs = (cuts) => {
        cuts.forEach((c, i) => {
          let prior_filtered = opts.prior.filter(d => {
            if (i === 0) {
              return d.x < c;
            } else {
              return d.x < c && d.x >= cuts[i - 1];
            }
          });
          let prior_prob =
              Math.round(100 * prior_filtered.length / opts.prior.length);

          let posterior_filtered = opts.posterior.filter(d => {
            if (i === 0) {
              return d.x < c;
            } else {
              return d.x < c && d.x >= cuts[i - 1];
            }
          });
          let posterior_prob = Math.round(
              100 * posterior_filtered.length / opts.posterior.length);

          probs.push({
            prior: prior_prob,
            posterior: posterior_prob,
          });
        });
      };

      let dataDiscrete = [];
      let createDiscrete = (cuts) => {
        cuts.forEach((c, i) => {
          // Figure out text
          let range_suffix = '';
          if (i === 0)
            range_suffix = `less than ${Math.round(100 * c) / 100}`;
            else if (i == cuts.length - 1) range_suffix =
                `more than ${Math.round(100 * cuts[i - 1]) / 100}`;
          else
            range_suffix =
                `between ${Math.round(100 * cuts[i - 1]) / 100} and ${
                    Math.round(100 * c) / 100}`;

          let desc_prior = '';
          let desc_posterior = '';
          if (opts.is_quantity) {
            desc_prior = `Your priors imply that there is a ${
                probs[i].prior}% probability that ${opts.unit_text} ${opts.tense} ${
                range_suffix}.`;
            desc_posterior = `Your data suggest that there is a ${
                probs[i].posterior}% probability that ${
                opts.unit_text} ${opts.tense} ${range_suffix}.`;
          } else {
            desc_prior = `Your priors imply that there is a ${
                probs[i]
                    .prior}% probability that the intervention has an effect ${
                range_suffix}${opts.unit_text}.`;
            desc_posterior = `Your data suggest that there is a ${
                probs[i]
                    .posterior}% probability that the intervention has an effect ${
                range_suffix}${opts.unit_text}.`;
          }

          dataDiscrete.push({
            color: opts.colors[i],
            x: opts.break_names[i],
            y_prior: probs[i].prior / 100,
            y_posterior: probs[i].posterior / 100,
            desc_prior: desc_prior,
            desc_posterior: desc_posterior
          });
        });
      };

      let dataContinuousGroups = [];
      let createContinuous = (cuts) => {
        cuts.forEach((c, i) => {
          let data = opts.dens.filter(d => {
            if (i === 0) {
              return d.x < c;
            } else {
              return d.x < c && d.x >= cuts[i - 1];
            }
          });

          if (data.length > 0) {
            data.unshift({x: data[0].x, y_prior: 0, y_posterior: 0});
            data.push({x: data[data.length - 1].x, y_prior: 0, y_posterior: 0});
          }

          dataContinuousGroups.push({color: opts.colors[i], data: data});
        });
      };

      calculateProbs(distParams.cuts);
      createDiscrete(distParams.cuts);
      createContinuous(distParams.cuts);

      let xDomain = [
        Math.min(distParams.min, distParams.cuts[0]),
        // Length - 2 since that is the last actual cut. We appended on a group
        // at max+1
        Math.max(distParams.max, distParams.cuts[distParams.cuts.length - 2])
      ];
      if (opts.xlim !== null) {
        xDomain = opts.xlim;
      }
      // set up scales
      let xContinuous = d3.scaleLinear().domain(xDomain).range([0, dims.width]);

      // Clamp - otherwise the xlim won't cut off sharply
      xContinuous.clamp(true);

      let xDiscrete = d3.scaleBand()
                          .domain(dataDiscrete.map(d => d.x))
                          .rangeRound([0, dims.width])
                          .padding(0.1);

      let y = d3.scaleLinear().domain([0, 1]).range([dims.height, 0]);

      svg.attr('width', dims.width + margin.left + margin.right)
          .attr('height', dims.height + margin.top + margin.bottom);

      let g = svg.append('g').attr(
          'transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // define axes

      let xAxis = d3.axisBottom().scale(xDiscrete);

      let yAxis = d3.axisLeft().scale(y).ticks(10).tickFormat(d3.format('.0%'));

      // Y axis label. Translates
      let yLabel = g.append('text')
                       .attr('class', 'y-axis-label')
                       .attr(
                           'transform',
                           `rotate(-90) translate(${- dims.height / 2},${
                               - margin.left + 20})`)
                       .attr('dy', '.71em')
                       .style('text-anchor', 'middle')
                       .style('font-size', 14 * opts.font_scale + 'px')
                       .text('Probability');

      // Define x label, if desired
      let xLabel = g.append('text')
                       .attr('class', 'x-axis-label')
                       .attr(
                           'transform',
                           `translate(${dims.width / 2},${
                               dims.height + margin.bottom / 2})`)
                       .style('text-anchor', 'middle')
                       .style('font-size', 14 * opts.font_scale + 'px')
                       .text(opts.xlab || '');

      // Proper case function
      let str_proper =
          (str) => {
            let first = str.substring(0, 1).toUpperCase();
            let rest = str.substring(1, 9999).toLowerCase();
            return (first + rest);
          };

      // Define a button to download the chart as PNG
      const ICON = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-download'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'></path><polyline points='7 10 12 15 17 10'></polyline><line x1='12' y1='15' x2='12' y2='3'></line></svg>";
      let save_as_image = svg.append('g')
        .append('svg')
        .attr('width', 20)
        .attr('height', 20)
        .attr('x', 50)
        .attr('y', 0)
        .html(ICON);

        let convertSvgToPng = () => {
          const canvas = document.createElement('canvas');
          const svg = document.querySelector('svg');
          const groups = [svg.children[1],svg.children[2],svg.children[3]]
          svg.lastChild.remove()
          svg.lastChild.remove()
          svg.lastChild.remove()
          canvas.setAttribute('id', 'canvas')
          let width = svg.clientWidth;
          let height = svg.clientHeight;
          canvas.width = width;
          canvas.height = height;
          document.body.append(canvas)
          var ctx = canvas.getContext('2d');
          let data = (new XMLSerializer()).serializeToString(svg);
          let DOMURL = window.URL || window.webkitURL || window;

          let img = new Image();
          let svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
          let url = DOMURL.createObjectURL(svgBlob);

          img.onload = function () {
            ctx.drawImage(img, 0, 0);
            DOMURL.revokeObjectURL(url);

            let imgURI = canvas
              .toDataURL('image/png')
              .replace('image/png', 'image/octet-stream');

            triggerDownload(imgURI);
          };

          img.src = url;
          svg.append(groups[0],groups[1],groups[2])
    }

        // This function triggers the download of the image
       let triggerDownload = (imgURI) => {
            const evt = new MouseEvent('click', {
              view: window,
              bubbles: false,
              cancelable: true
            });

            const a = document.createElement('a');
            a.setAttribute('download', 'chart.png');
            a.setAttribute('href', imgURI);
            a.setAttribute('target', '_blank');
            a.dispatchEvent(evt);
            document.getElementById('canvas').remove()
          }




      // Event listener for the download button
      save_as_image.on('click', function () {
        convertSvgToPng();
      });


      // Define title - may not actually show
      let titleg = svg.append('g')
                       .attr('class', 'title')
                       .attr('transform', 'translate(' + margin.left + ',10)');

      var mode_title;
      var subtitle;
      if (opts.display_mode_name) {
        var mode_title =
            titleg.append('text')
                .style('text-anchor', 'left')
                .style('alignment-baseline', 'hanging')
                .style('font-size', 20 * opts.font_scale + 'px')
                .style('opacity', 1)
                .text(`${str_proper(MODE)} ${
                    STATUS == 'discrete' ? 'Probability' : 'Distribution'}`);
      }

      if (opts.title !== '') {
        var sub_title =
            titleg.append('text')
                .style('text-anchor', 'left')
                .style('alignment-baseline', 'hanging')
                .style('font-size', 20 * opts.font_scale + 'px')
                .style('opacity', 1)
                .attr(
                    'dy', `${20 * opts.display_mode_name * opts.font_scale}px`)
                .text(opts.title);
      }

      // create axes
      g.append('g')
          .attr('class', 'x axis')
          .style('font-size', 12 * opts.font_scale + 'px')
          .attr('transform', 'translate(0,' + dims.height + ')')
          .call(xAxis);

      g.append('g')
          .attr('class', 'y axis')
          .style('font-size', 12 * opts.font_scale + 'px')
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
        for (var j = 0; j < numPts; j++) {
          path.lineTo(
              xDiscrete(d.x) + j * xDiscrete.bandwidth() / (numPts - 1),
              (MODE == 'prior' ? y(d.y_prior) : y(d.y_posterior)));
        }

        // end on x-axis
        path.lineTo(xDiscrete(d.x) + xDiscrete.bandwidth(), y(0));

        // return stringified path data
        return path.toString();
      };

      // function to transition areas to distribution segments
      let transToDistributionSegments = d => {
        // line with x and y values defned by data
        let gen =
            d3.line()
                .x(p => xContinuous(p.x))
                .y(p => (MODE == 'prior' ? y(p.y_prior) : y(p.y_posterior)));
        return gen(d.data);
      };

      let transBarHeights = d => {
        // line with x and y values defned by data
        let gen =
            d3.line()
                .x(p => xDiscrete(p.x))
                .y(p => (MODE == 'prior' ? y(p.y_prior) : y(p.y_posterior)));
        return gen(d.data);
      };

      // create bars
      let areas = g.selectAll('.area')
                      .data(dataDiscrete)
                      .enter()
                      .append('path')
                      .attr('class', 'area')
                      .style('fill', d => d.color)
                      .attr('d', transToBars);

      // define reusable tooltip
      let tooltip =
          d3.tip()
              .attr('class', 'd3-tip chart-data-tip')
              .style('font-size', 12 * opts.font_scale + 'px')
              .style('z-index', 1050)
              .offset([30, 0])
              .direction('s')
              .html(
                  (d, i) => '<span>' +
                      (MODE == 'prior' ? dataDiscrete[i].desc_prior :
                                         dataDiscrete[i].desc_posterior) +
                      '</span>');

      // attach tooltip to container
      g.call(tooltip);

      // show tooltip on hover over areas
      areas.on('mouseover', tooltip.show).on('mouseout', tooltip.hide);

      // define threshold line
      let thresholdLine =
          g.append('line')
              .attr('stroke', 'black')
              .style('stroke-width', '1.5px')
              .style('stroke-dasharray', '5,5')
              .style('opacity', 1)
              .attr('x1', 0)
              .attr(
                  'y1',
                  (!opts.initial_trans && STATUS == 'discrete' &&
                           allow_threshold ?
                       y(opts.threshold) :
                       y(0)))
              .attr('x2', dims.width)
              .attr(
                  'y2',
                  (!opts.initial_trans && STATUS == 'discrete' &&
                           allow_threshold ?
                       y(opts.threshold) :
                       y(0)));

      // function to update x axis
      let updateXAxis = (type, duration) => {
        if (type === 'continuous') {
          if(opts.percentage){
            xAxis.scale(xContinuous).tickFormat(d3.format('.0%'));
          }else{
            xAxis.scale(xContinuous);
          }
        } else {
          if(opts.percentage){
            xAxis.scale(xDiscrete).tickFormat(function (d) {
            return d;
          });
          }else{
            xAxis.scale(xDiscrete);
          }
        }

        g.select('.x').transition().duration(duration).call(xAxis);
      };

      // function to update y axis
      let updateYAxis = (data, duration) => {
        const extent = d3.extent(data, d => Math.max(d.y_prior, d.y_posterior));
        extent[0] = 0;
        extent[1] = extent[1] + 0.2 * (extent[1] - extent[0]);
        y.domain(extent);

        g.select('.y').transition().duration(duration).call(yAxis);
      };

      // function to switch between bars and distribution
      let toggle_status = (to, duration) => {
        // Fade out, change, fade back
        if (opts.display_mode_name) {
          mode_title.interrupt()
              .style('opacity', 1)
              .transition()
              .duration(duration / 2)
              .style('opacity', 0)
              .transition()
              .delay(duration / 2)
              .duration(duration / 2)
              .text(`${str_proper(MODE)} ${
                  to == 'discrete' ? 'Probability' : 'Distribution'}`)
              .style('opacity', 1);
        }

        if (to === 'distribution') {
          // update axes
          updateYAxis(opts.dens, 0);
          updateXAxis('continuous', duration);

          // change bars to areas
          areas.data(dataContinuousGroups)
              .transition()
              .duration(duration)
              .attr('d', transToDistributionSegments);

          // hide threshold line
          thresholdLine.interrupt()
              .style('opacity', 0)
              .attr('y1', y(0))
              .attr('y2', y(0));

          // hide y axis
          g.select('.y.axis').interrupt().style('opacity', 0);
          g.select('.y-axis-label').interrupt().style('opacity', 0);

          // Turn off button
          status_button.classed('active', true);

          // Update status
          STATUS = 'distribution';
        } else {
          // update axes
          y.domain([0, 1]);
          g.select('.y').transition().duration(duration).call(yAxis);

          updateXAxis('discrete', duration);

          // change areas to bars
          areas.data(dataDiscrete)
              .transition()
              .duration(duration)
              .attr('d', transToBars);

          // make threshold line float up
          thresholdLine.transition()
              .delay(duration)
              .style('opacity', (allow_threshold ? 1 : 0))
              .transition()
              .duration(duration)
              .attr('y1', (allow_threshold ? y(opts.threshold) : y(0)))
              .attr('y2', (allow_threshold ? y(opts.threshold) : y(0)));

          // transition in y axis
          g.select('.y.axis')
              .transition()
              .delay(duration)
              .duration(duration)
              .style('opacity', 1);

          g.select('.y-axis-label')
              .transition()
              .delay(duration)
              .duration(duration)
              .style('opacity', 1);

          // Turn on button
          status_button.classed('active', false);

          // Update status
          STATUS = 'discrete';
        }
      };

      let toggle_mode = (to, duration) => {
        // Update mode and activate/deactivate button
        MODE = to;
        mode_button.classed('active', MODE == 'posterior');

        // Fade out, change, fade back
        if (opts.display_mode_name) {
          mode_title.interrupt()
              .style('opacity', 1)
              .transition()
              .duration(duration / 2)
              .style('opacity', 0)
              .transition()
              .delay(duration / 2)
              .duration(duration / 2)
              .text(`${str_proper(MODE)} ${
                  STATUS == 'discrete' ? 'Probability' : 'Distribution'}`)
              .style('opacity', 1);
        }

        if (STATUS === 'discrete') {
          areas.data(dataDiscrete)
              .transition()
              .duration(duration)
              .attr('d', transToBars);
        } else {
          areas.data(dataContinuousGroups)
              .transition()
              .duration(duration)
              .attr('d', transToDistributionSegments);
        }
      };

      // create button containers
      let allButtons = svg.append('g')
                           .attr('class', 'button-container')
                           .attr(
                               'transform',
                               `translate( ${
                                   width - margin.right -
                                   button_dims.scale *
                                       (2 * button_dims.width +
                                        button_dims.buffer)}, 5) scale(${
                                   button_dims.scale})`);

      // Button to transition prior/posterior
      let mode_button = allButtons.append('g')
                            .attr('class', 'trans-button mode-button')
                            .classed('active', MODE == 'posterior');

      // button background/border box
      mode_button.append('rect')
          .attr('class', 'background')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', button_dims.width)
          .attr('height', button_dims.height)
          // Rescale so always 1px
          .style('stroke-width', `${1 / button_dims.scale}`);

      mode_button.append('text')
          .attr('class', 'icon')
          .text('Posterior')
          .attr('text-anchor', 'middle')
          .attr('alignment-baseline', 'middle')
          .attr('x', button_dims.width / 2)
          .attr('y', button_dims.height / 2);

      let status_button = allButtons.append('g')
                              .attr('class', 'trans-button status-button')
                              .classed('active', STATUS == 'distribution');

      // button background/border box
      status_button.append('rect')
          .attr('class', 'background')
          .attr('x', button_dims.width + button_dims.buffer)
          .attr('y', 0)
          .attr('width', button_dims.width)
          .attr('height', button_dims.height)
          .style('stroke-width', `${1 / button_dims.scale}`);

      // x axis in button graphic
      status_button.append('rect')
          .attr('class', 'icon')
          .attr(
              'x',
              button_dims.width + button_dims.buffer +
                  (1 / 12) * button_dims.height)
          .attr('y', 0.75 * button_dims.height)
          .attr('width', (5 / 6) * button_dims.width)
          .attr('height', 2);

      // curve in button graphic
      status_button.append('path')
          .attr('class', 'icon')
          .attr(
              'transform',
              `translate(${
                  button_dims.width + button_dims.buffer +
                  (1 / 12) * button_dims.height},0)`)
          .attr(
              'd',
              'M37.92,42.22c3.78-8,7-14.95,12.08-14.95h' +
                  '0c5,0,8.3,6.93,12.08,14.95,6.12,13,13.73,29.13,33.48,29.13' +
                  'h0v-2h0c-18.48,0-25.79-15.51-31.67-28' +
                  'C59.82,32.74,56.3,25.28,50,25.28' +
                  'h0c-6.3,0-9.82,7.46-13.89,16.09-5.88,12.47-13.19,28-31.67,28' +
                  'h0v2h0C24.18,71.35,31.8,55.2,37.92,42.22Z');

      // button interactions
      status_button.style('cursor', 'pointer').on('click', function(d) {
        toggle_status(
            (STATUS == 'discrete' ? 'distribution' : 'discrete'),
            transDuration);
      });

      mode_button.style('cursor', 'pointer').on('click', function(d) {
        toggle_mode((MODE == 'prior' ? 'posterior' : 'prior'), transDuration);
      });

      // If only one of prior/posterior chosen, simply don't show button2
      if (!allow_mode_trans) {
        mode_button.remove();
      }

      // start app
      toggle_status(STATUS, 0);

      // If both prior & posterior are present, go from prior dens -> post dens
      // -> post bars
      if (opts.initial_trans) {
        if (allow_mode_trans) {
          setTimeout(() => {
            toggle_mode('posterior', transDuration);
          }, 1000);
          if (!opts.stop_trans) {
            setTimeout(() => {
              toggle_status('discrete', transDuration);
            }, 2000);
          }
        } else {
          setTimeout(() => {
            toggle_status('discrete', transDuration);
          }, 1000);
        }
      }
    },
    pydraw: function(opts, container) {
      var svg = d3.select(container)
            .append('svg')
            .attr('width', 600)
            .attr('height', 400);
      return this.draw(opts, svg);
    },
    renderValue: function(opts) {
      console.log('render w,h', width, height);
      // keep options for resize
      options = opts;
      // Set background color and opacity from options
      backgroundColor = opts.backgroundColor || 'white'; // default to white if not provided
      backgroundOpacity = opts.backgroundOpacity || 1; // default to fully opaque if not provided

      // create main containers
      let svg = this.setupSvg();

      let timeout = 0;
      if (height <= 0 || width <= 0) {
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

      // Update the dimensions of the SVG element
      let svg = d3.select(el).select('svg');
      svg.attr('width', newWidth);
      svg.attr('height', newHeight);

      // Re-render the plot
      this.renderValue(options);
    },

    loadAndDisplayLogo: function(opts, svg) {
      const logoSize = opts.logoSize || 100; // Default logo size in pixels
      const logoLocation = opts.logoLocation || 'bottom-right'; // Default location

      // Load the SVG logo
      d3.xml(opts.logoPath).then((data) => {
        let logo = d3.select(data).select('svg');

        // Set the size of the logo
        logo.attr('width', logoSize)
            .attr('height', logoSize);

        // Append the logo to the SVG element
        const logoG = svg.append('g').node().appendChild(logo.node());

        // Position the logo based on logoLocation
        let x, y;
        switch (logoLocation) {
          case 'top-left':
            x = 0; y = 0;
            break;
          case 'top-right':
            // Adjust position to avoid overlap with buttons
            x = width - logoSize - 120; y = 0;
            break;
          case 'bottom-left':
            x = 0; y = height - logoSize;
            break;
          case 'bottom-right':
            x = width - logoSize; y = height - logoSize;
            break;
        }
        logo.attr('x', x).attr('y', y);
      });
    },

  };
}
