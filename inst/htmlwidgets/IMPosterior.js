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

        distParams.cuts = [-opts.MME, opts.MME, distParams.max];

        opts.data = opts.data.sort((a,b) => a.x - b.x);

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

            data.unshift({x:data[0].x, y:0});
            data.push({x:data[data.length - 1].x, y:0});

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

        var xContinuous = d3.scaleLinear()
            .domain([distParams.min - 1, distParams.max + 1])
            .range([0, dims.width]);

        var xDiscrete = d3.scaleBand()
            .domain(dataDiscrete.map(function(d) { return d.x; }))
            .rangeRound([0, dims.width]).padding(0.1);

        var y = d3.scaleLinear()
            .domain([0, 1])
            .range([dims.height, 0]);

        var svg = d3.select(el).html(null).append("svg")
            .attr("width", dims.width + margin.left + margin.right)
            .attr("height", dims.height + margin.top + margin.bottom);

        var g = svg
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var xAxis = d3.axisBottom()
            .scale(xDiscrete);

        var yAxis = d3.axisLeft()
            .scale(y)
            .ticks(10)
            .tickFormat(d3.format(".0%"));

        var yLabel = g.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -52)
            .attr("x", -160)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .style("font-size", 14 + "px")
            .text("Probability");

        g.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + dims.height + ")")
            .call(xAxis);

        g.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        var areas = g.selectAll(".area")
            .data(dataDiscrete)
            .enter().append("path")
                .attr("class", "area")
                .style("fill", function(d) { return d.color; })
                .attr("d", function(d, i) {
                    let numPts = dataContinuousGroups[i].data.length - 2;
                    var path = d3.path();
                    path.moveTo(xDiscrete(d.x), y(0));
                    for (j=0; j<numPts; j++) {
                        path.lineTo(xDiscrete(d.x) + j*xDiscrete.bandwidth()/(numPts-1), y(d.y));
                    }
                    path.lineTo(xDiscrete(d.x) + xDiscrete.bandwidth(), y(0));
                    return path.toString();
                });

        var tooltip = d3.tip()
            .attr('class', 'd3-tip chart-data-tip')
            .offset([30, 0])
            .direction('s')
            .html(function(d, i) {
                return "<span>" + dataDiscrete[i].desc + "</span>";
            });

        g.call(tooltip);

        areas
            .on('mouseover', tooltip.show)
            .on('mouseout', tooltip.hide);

        var thresholdLine = g.append("line")
            .attr("stroke", "black")
            .style("stroke-width", "1.5px")
            .style("stroke-dasharray", "5,5")
            .style("opacity", 1)
            .attr("x1", 0)
            .attr("y1", y(opts.threshold))
            .attr("x2", dims.width)
            .attr("y2", y(opts.threshold));


        var updateXAxis = function(type, duration) {
            if (type === "continuous") {
                xAxis.scale(xContinuous);
            } else {
                xAxis.scale(xDiscrete);
            }
            d3.select(".x").transition().duration(duration).call(xAxis);
        };

        var updateYAxis = function(data, duration) {
            var extent = d3.extent(data, function(d) {
                return d.y;
            });
            extent[0] = 0;
            extent[1] = extent[1] + 0.2*(extent[1] - extent[0]);
            y.domain(extent);
            d3.select(".y").transition().duration(duration).call(yAxis);
        };

        var toggle = function(to, duration) {
            if (to === "distribution") {
                updateYAxis(dataContinuousGroups[0].data.concat(dataContinuousGroups[1].data).concat(dataContinuousGroups[2].data), 0);
                updateXAxis("continuous", duration);

                areas
                    .data(dataContinuousGroups)
                    .transition()
                    .duration(duration)
                        .attr("d", function(d) {
                            var gen = d3.line()
                                .x(function(p) {
                                    return xContinuous(p.x);
                                })
                                .y(function(p) {
                                    return y(p.y);
                                });
                            return gen(d.data);
                        });

                thresholdLine
                    .style("opacity", 0);

                g.select(".y.axis")
                    .style("opacity", 0);

                g.select(".y-axis-label")
                    .style("opacity", 0);

            } else {
                y.domain([0, 1]);
                d3.select(".y").transition().duration(duration).call(yAxis);

                updateXAxis("discrete", duration);

                areas
                    .data(dataDiscrete)
                    .transition()
                    .duration(duration)
                        .attr("d", function(d, i) {
                            let numPts = dataContinuousGroups[i].data.length - 2;
                            var path = d3.path();
                            path.moveTo(xDiscrete(d.x), y(0));
                            for (j=0; j<numPts; j++) {
                                path.lineTo(xDiscrete(d.x) + j*xDiscrete.bandwidth()/(numPts-1), y(d.y));
                            }
                            path.lineTo(xDiscrete(d.x) + xDiscrete.bandwidth(), y(0));
                            return path.toString();
                        });

                thresholdLine
                    .transition()
                    .duration(0)
                    .delay(duration)
                        .style("opacity", 1)
                        .attr("y1", y(opts.threshold))
                        .attr("y2", y(opts.threshold));

                g.select(".y.axis")
                    .transition()
                    .duration(0)
                    .delay(duration)
                        .style("opacity", 1);

                g.select(".y-axis-label")
                    .transition()
                    .duration(0)
                    .delay(duration)
                        .style("opacity", 1);
            }
        };


        // Add buttons

        //container for all buttons
        var allButtons = svg.append("g")
          .attr("id", "allButtons");

        //fontawesome button labels
        var labels = ["B", "D"];

        //colors for different button states
        var defaultColor = "#E0E0E0";
        var hoverColor = "#808080";
        var pressedColor = "#000000";

        //groups for each button (which will hold a rect and text)
        var buttonGroups = allButtons.selectAll("g.button")
          .data(labels)
          .enter()
          .append("g")
          .attr("class", "button")
          .style("cursor", "pointer")
          .on("click", function(d, i) {
            updateButtonColors(d3.select(this), d3.select(this.parentNode));
            d3.select("#numberToggle").text(i + 1);
            if (d === "D") {
                toggle("distribution", transDuration);
            } else {
                toggle("discrete", transDuration);
            }

          })
          .on("mouseover", function() {
            if (d3.select(this).select("rect").attr("fill") != pressedColor) {
              d3.select(this)
                .select("rect")
                .attr("fill", hoverColor);
            }
          })
          .on("mouseout", function() {
            if (d3.select(this).select("rect").attr("fill") != pressedColor) {
              d3.select(this)
                .select("rect")
                .attr("fill", defaultColor);
            }
          });

        var bWidth = 40; //button width
        var bHeight = 25; //button height
        var bSpace = 10; //space between buttons
        var x0 = 20; //x offset
        var y0 = 10; //y offset

        //adding a rect to each toggle button group
        //rx and ry give the rect rounded corner
        buttonGroups.append("rect")
          .attr("class", "buttonRect")
          .attr("width", bWidth)
          .attr("height", bHeight)
          .attr("x", function(d, i) {
            return x0 + (bWidth + bSpace) * i;
          })
          .attr("y", y0)
          .attr("rx", 5) //rx and ry give the buttons rounded corners
          .attr("ry", 5)
          .attr("fill", defaultColor);

        //adding text to each toggle button group, centered
        //within the toggle button rect
        buttonGroups.append("text")
          .attr("class", "buttonText")
          .attr("x", function(d, i) {
            return x0 + (bWidth + bSpace) * i + bWidth / 2;
          })
          .attr("y", y0 + bHeight / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .attr("fill", "white")
          .text(function(d) {
            return d;
          });

        function updateButtonColors(button, parent) {
          parent.selectAll("rect")
            .attr("fill", defaultColor);

          button.select("rect")
            .attr("fill", pressedColor);

        }

        toggle("distribution", 0);

        setTimeout(() => {
            toggle("discrete", transDuration);
        }, 1000);

      },



      resize: function(width, height) {

        // TODO: code to re-render the widget with a new size

        var svg = d3.select(el).append("svg")
            .attr("width", dims.width + margin.left + margin.right)
            .attr("height", dims.height + margin.top + margin.bottom);

      }

    };
  }
});
