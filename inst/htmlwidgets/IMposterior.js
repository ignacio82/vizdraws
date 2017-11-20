HTMLWidgets.widget({

  name: 'IMposterior',

  type: 'output',

  factory: function(el, width, height) {

    // TODO: define shared variables for this instance

    return {

      renderValue: function(opts) {

        console.log("MME: ", opts.MME);
        console.log("threshold: ", opts.threshold);
        console.log("prob: ", opts.prob);
        console.log("colors: ", opts.colors);
        console.log("data: ", opts.data);


        var margin = {left:50,right:50,top:40,bottom:0};

        xMax = d3.max(opts.data, function(d) { return d.x ; });
        yMax = d3.max(opts.data, function(d) { return d.y ; });
        xMin = d3.min(opts.data, function(d) { return d.x ; });
        yMin = d3.min(opts.data, function(d) { return d.y ; });

        var y = d3.scaleLinear()
                    .domain([0,yMax])
                    .range([height,0]);

        var x = d3.scaleLinear()
                    .domain([xMin,xMax])
                    .range([0,width]);


        var yAxis = d3.axisLeft(y);
        var xAxis = d3.axisBottom(x);


        var area = d3.area()
                         .x(function(d){ return x(d.x) ;})
                         .y0(height)
                         .y1(function(d){ return y(d.y); });

        var svg = d3.select(el).append('svg').attr("height","100%").attr("width","100%");
        var chartGroup = svg.append("g").attr("transform","translate("+margin.left+","+margin.top+")");


        chartGroup.append("path")
             .attr("d", area(opts.data.filter(function(d){  return d.x< -opts.MME ;})))
             .style("fill", opts.colors[0]);

        chartGroup.append("path")
             .attr("d", area(opts.data.filter(function(d){  return d.x > opts.MME ;})))
             .style("fill", opts.colors[2]);

        if(opts.MME !==0){
          chartGroup.append("path")
             .attr("d", area(opts.data.filter(function(d){  return (d.x < opts.MME & d.x > -opts.MME) ;})))
             .style("fill", opts.colors[1]);
        }


        chartGroup.append("g")
            .attr("class","axis x")
            .attr("transform","translate(0,"+height+")")
            .call(xAxis);


      },

      resize: function(width, height) {

        // TODO: code to re-render the widget with a new size

      }

    };
  }
});
