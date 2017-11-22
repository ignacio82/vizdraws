HTMLWidgets.widget({

  name: 'IMposterior',

  type: 'output',

  factory: function(el, width, height) {

    // TODO: define shared variables for this instance

    return {

      renderValue: function(opts) {

        console.log("threshold: ", opts.threshold);

        var margin = {left:50,right:50,top:40,bottom:125};

        xMax = d3.max(opts.data, function(d) { return d.x ; });
        yMax = d3.max(opts.data, function(d) { return d.y ; });
        xMin = d3.min(opts.data, function(d) { return d.x ; });
        yMin = d3.min(opts.data, function(d) { return d.y ; });

        var y = d3.scaleLinear()
                    .domain([0,yMax])
                    .range([height-margin.bottom,0]);

        var x = d3.scaleLinear()
                    .domain([xMin,xMax])
                    .range([0,width]);


        var yAxis = d3.axisLeft(y);
        var xAxis = d3.axisBottom(x);


        var area = d3.area()
                         .x(function(d){ return x(d.x) ;})
                         .y0(height-margin.bottom)
                         .y1(function(d){ return y(d.y); });

        var svg = d3.select(el).append('svg').attr("height","100%").attr("width","100%");
        var chartGroup = svg.append("g").attr("transform","translate("+margin.left+","+margin.top+")");


        chartGroup.append("path")
             .attr("d", area(opts.data.filter(function(d){  return d.x< -opts.MME ;})))
             .style("fill", opts.colors[0]);

        if(opts.MME !==0){
          chartGroup.append("path")
             .attr("d", area(opts.data.filter(function(d){  return (d.x < opts.MME & d.x > -opts.MME) ;})))
             .style("fill", opts.colors[1]);
        }

        chartGroup.append("path")
             .attr("d", area(opts.data.filter(function(d){  return d.x > opts.MME ;})))
             .style("fill", opts.colors[2]);




        chartGroup.append("g")
            .attr("class","axis x")
            .attr("transform","translate(0,"+(height-margin.bottom)+")")
            .call(xAxis);


        var tooltip = d3.tip()
                .attr('class', 'd3-tip chart-data-tip')
                .offset([30, 0])
                .direction('s')
                .html(function(d, i) {
                    return "<strong>" + d + "</strong> <span style='color:" + "white" + "'>"+ "</span>";
                });

        svg.call(tooltip);

        chartGroup.selectAll("path").data(opts.text).on('mouseover', tooltip.show).on('mouseout', tooltip.hide);



      // Bars

      var yBar = d3.scaleLinear()
                    .domain([0,1])
                    .range([height-margin.bottom,0]);

      var xBar = d3.scaleBand()
                    .domain(opts.bars.map(function(d) { return d.x; }))
                    .rangeRound([0, width]).padding(0.1);

      var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


      g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform","translate(0,"+(height-margin.bottom)+")")
      .call(d3.axisBottom(xBar));


      g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(yBar).ticks(10, "%"))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .attr("text-anchor", "end")
      .text("Probability");

      g.selectAll(".bar")
      .data(opts.bars)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return xBar(d.x); })
      .attr("y", function(d) { return yBar(d.y); })
      .attr("width", xBar.bandwidth())
      .style("fill", function(d) { return d.color; })
      .attr("height", function(d) { return height - margin.bottom - yBar(d.y); });





      // Add buttons

//container for all buttons
            var allButtons= svg.append("g")
                                .attr("id","allButtons");

            //fontawesome button labels
            var labels= ["B", "D"];

            //colors for different button states
            var defaultColor= "#E0E0E0";
            var hoverColor= "#808080";
            var pressedColor= "#000000";

            //groups for each button (which will hold a rect and text)
            var buttonGroups= allButtons.selectAll("g.button")
                                    .data(labels)
                                    .enter()
                                    .append("g")
                                    .attr("class","button")
                                    .style("cursor","pointer")
                                    .on("click",function(d,i) {
                                        updateButtonColors(d3.select(this), d3.select(this.parentNode));
                                        d3.select("#numberToggle").text(i+1);
                                    })
                                    .on("mouseover", function() {
                                        if (d3.select(this).select("rect").attr("fill") != pressedColor) {
                                            d3.select(this)
                                                .select("rect")
                                                .attr("fill",hoverColor);
                                        }
                                    })
                                    .on("mouseout", function() {
                                        if (d3.select(this).select("rect").attr("fill") != pressedColor) {
                                            d3.select(this)
                                                .select("rect")
                                                .attr("fill",defaultColor);
                                        }
                                    });

            var bWidth= 40; //button width
            var bHeight= 25; //button height
            var bSpace= 10; //space between buttons
            var x0= 20; //x offset
            var y0= 10; //y offset

            //adding a rect to each toggle button group
            //rx and ry give the rect rounded corner
            buttonGroups.append("rect")
                        .attr("class","buttonRect")
                        .attr("width",bWidth)
                        .attr("height",bHeight)
                        .attr("x",function(d,i) {return x0+(bWidth+bSpace)*i;})
                        .attr("y",y0)
                        .attr("rx",5) //rx and ry give the buttons rounded corners
                        .attr("ry",5)
                        .attr("fill",defaultColor);

            //adding text to each toggle button group, centered
            //within the toggle button rect
            buttonGroups.append("text")
                        .attr("class","buttonText")
                        .attr("x",function(d,i) {
                            return x0 + (bWidth+bSpace)*i + bWidth/2;
                        })
                        .attr("y",y0+bHeight/2)
                        .attr("text-anchor","middle")
                        .attr("dominant-baseline","central")
                        .attr("fill","white")
                        .text(function(d) {return d;});

            function updateButtonColors(button, parent) {
                parent.selectAll("rect")
                        .attr("fill",defaultColor);

                button.select("rect")
                        .attr("fill",pressedColor);

            }

      },



      resize: function(width, height) {

        // TODO: code to re-render the widget with a new size

      }

    };
  }
});
