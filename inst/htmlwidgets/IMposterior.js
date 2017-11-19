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


        var margin = {left:50,right:50,top:40,bottom:0};

        var xMax = opts.x.reduce(function(a, b) {
          return Math.max(a, b);

        });
        var yMax = opts.y.reduce(function(a, b) {
          return Math.max(a, b);

        });
        var xMin = opts.x.reduce(function(a, b) {
          return Math.min(a, b);

        });
        var yMin = opts.y.reduce(function(a, b) {
          return Math.min(a, b);

        });


        var y = d3.scaleLinear()
                    .domain([0,yMax])
                    .range([height,0]);

        var x = d3.scaleLinear()
                    .domain([xMin,xMax])
                    .range([0,width]);


        var yAxis = d3.axisLeft(y);
        var xAxis = d3.axisBottom(x);


        var area = d3.area()
                         .x(function(d,i){ return x(opts.x[i]) ;})
                         .y0(height)
                         .y1(function(d){ return y(d); });

        var svg = d3.select(el).append('svg').attr("height","100%").attr("width","100%");
        var chartGroup = svg.append("g").attr("transform","translate("+margin.left+","+margin.top+")");


        chartGroup.append("path")
             .attr("d", area(opts.y));


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
