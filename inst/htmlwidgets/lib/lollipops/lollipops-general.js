function factory(el, width, height) {

  return {
      setupSvg: function() {
        d3.select(el).selectAll('*').remove();
        // not necessary but more convenient to access later with this.svg
        this.svg = d3.select(el).append('svg'); // Assign to the higher-scoped svg variable
      },
    draw: function(opts) {
      this.actualDraw(opts);

      // Load and display the logo if path is provided
      if (opts.logoPath) {
        this.loadAndDisplayLogo(opts);
      }
    },
      actualDraw: function(opts) {
        console.log('opts', opts);
        const svg = this.svg;
        // set up constants used throughout script
        const margin = {
          top: 80,
          right: 100,
          bottom: 80,
          left: 100
        };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        const lineWidth = 4;
        const mediumText = opts.mediumText;
        const bigText = opts.bigText;
        const fontFamily = "Roboto, sans-serif";
        const plotBackgroundColor = opts.plotBackgroundColor;
        const plotBackgroundOpacity = opts.plotBackgroundOpacity;
        // Initialize d3-tip
        const tip = d3.tip()
          .attr('class', 'd3-tip')
          .offset([-10, 0])
          .html(function(d) {
            const name = d.Name.charAt(0).toUpperCase() + d.Name.slice(1);
            let priorSentence, posteriorSentence;

            if (d.Posterior > 0.5) {
              priorSentence = `For ${name}, our prior of a ${opts.rightArea.toLowerCase()} impact was ${d.Prior * 100}%`;
              posteriorSentence = `. After analyzing the data, we estimate that the probability of a ${opts.rightArea.toLowerCase()} impact is ${d.Posterior * 100}%.`;
            } else {
              priorSentence = `For ${name}, our prior of a ${opts.leftArea.toLowerCase()} impact was ${d.Prior * 100}%`;
              posteriorSentence = `. After analyzing the data, we estimate that the probability of a ${opts.leftArea.toLowerCase()} impact is ${(1 - d.Posterior) * 100}%.`;
            }
            return priorSentence + posteriorSentence;
          });

      // Tooltip for opts.rightArea
      const rightAreaTip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
          return opts.rightAreaText;
        });

      // Tooltip for opts.leftArea
      const leftAreaTip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
          return opts.leftAreaText;
        });


        svg.call(tip); // Call the main tip function on your SVG element
        svg.call(rightAreaTip); // Call the right area tip function on your SVG element
        svg.call(leftAreaTip); // Call the left area tip function on your SVG element


        // set width and height of svg element (plot + margin)
        svg.attr("width", plotWidth + margin.left + margin.right)
          .attr("height", plotHeight + margin.top + margin.bottom)
          .style("background-color", plotBackgroundColor) // Set plot background color
          .style("opacity", plotBackgroundOpacity); // Set plot background opacity

        // create plot group and move it
        let plotGroup = svg.append('g')
                         .attr('transform',
                               'translate(' + margin.left + ',' + margin.top + ')');
        // x-axis
        let xAxis = d3.scaleLinear()
            .domain([0, 1])
            .range([0, plotWidth]);

        // add x-axis to plot
        plotGroup.append("g")
        .attr("transform", "translate(0," + plotHeight + ")")
        .attr("class", "axis-text")
        .call(d3.axisBottom(xAxis).tickFormat(d3.format(
          ".0%"))) // Format ticks as percentage
        .attr("stroke-width", lineWidth)
        .attr("font-size", mediumText);
        // Remove existing x-axis ticks and numbers
        plotGroup.selectAll(".tick").remove();
        // New x-axis ticks and labels
        let customTicks = [0, 0.1, 0.33, 0.66, 0.9, 1];
        let tickLabels = ["Very", "Likely", "About as likely as not", "Likely", "Very"];
        // Add new x-axis ticks and labels
        plotGroup.append("g")
        .attr("transform", "translate(0," + plotHeight + ")")
        .attr("class", "axis-text")
        .call(d3.axisBottom(xAxis)
              .tickValues(customTicks)
              .tickSize(0) // Hide tick lines
              .tickFormat(() => "")
        );
        // Add custom labels between the specified ranges
        for (let i = 0; i < customTicks.length - 1; i++) {
          let startX = xAxis(customTicks[i]);
          let endX = xAxis(customTicks[i + 1]);
          let labelX = startX + (endX - startX) / 2;
          let label = tickLabels[i];
          plotGroup.append("text")
          .attr("x", labelX)
          .attr("y", plotHeight +
                  20) // Adjust the vertical position of the labels
          .attr("text-anchor", "middle")
          .attr("font-size", mediumText)
          .text(label);
        }

      // y-axis
      // y-axis goes from height of plot to 0
      let yAxis = d3.scaleBand()
      .domain(opts.data.map(function(d) {
        return d.Name;
      }))
      .padding(1)
      .range([plotHeight, 0]);

      // add y-axis to plot
      // set stroke width and font size
      plotGroup.append("g")
        .call(d3.axisLeft(yAxis))
        .attr("stroke-width", lineWidth)
        .attr("font-size", mediumText)
      // add Uncertanty Areas
      // Very
      plotGroup.append("rect")
        .attr("x", xAxis(0.9))
        .attr("y", 0)
        .attr("width", xAxis(1) - xAxis(0.9))
        .attr("height", plotHeight)
        .attr("fill", "#2196f3");
      plotGroup.append("rect")
        .attr("x", xAxis(0))
        .attr("y", 0)
        .attr("width", xAxis(0.1) - xAxis(0))
        .attr("height", plotHeight)
        .attr("fill", "#2196f3");
      // Likely
      plotGroup.append("rect")
        .attr("x", xAxis(0.66))
        .attr("y", 0)
        .attr("width", xAxis(0.9) - xAxis(0.66))
        .attr("height", plotHeight)
        .attr("fill", "#42a5f5");
      plotGroup.append("rect")
        .attr("x", xAxis(0.1))
        .attr("y", 0)
        .attr("width", xAxis(0.33) - xAxis(0.1))
        .attr("height", plotHeight)
        .attr("fill", "#42a5f5");
      // About as likely as not
      plotGroup.append("rect")
        .attr("x", xAxis(0.33))
        .attr("y", 0)
        .attr("width", xAxis(0.66) - xAxis(0.33))
        .attr("height", plotHeight)
        .attr("fill", "#90caf9");

      // Lines
      plotGroup.selectAll("myline")
        .data(opts.data)
        .enter()
        .append("line")
          .attr("class", "line")
          .attr("x1", xAxis(0.5))
          .attr("x2", function(d) { return xAxis(d.Prior); })
          .attr("y1", function(d) { return yAxis(d.Name); })
          .attr("y2", function(d) { return yAxis(d.Name); })
          .attr("stroke-width", lineWidth)
          .attr("stroke", "grey");

      // Circles -> start at priors
      plotGroup.selectAll("mycircle")
        .data(opts.data)
        .enter()
        .append("circle")
          .attr("cx", function(d) { return xAxis(d.Prior); })
          .attr("cy", function(d) { return yAxis(d.Name); })
          .attr("r", "7")
          .style("fill", "#EA4335")
          .attr("stroke", "black")
          .on('mouseover', tip.show) // Display tooltip on mouseover
          .on('mouseout', tip.hide); // Hide tooltip on mouseout

      // Change the X coordinates of line and circle
      plotGroup.selectAll("circle")
        .transition()
        .duration(2000)
        .attr("cx", function(d) { return xAxis(d.Posterior); });

      plotGroup.selectAll("line")
        .transition()
        .duration(2000)
        .attr("x2", function(d) { return xAxis(d.Posterior); });

      // Add a dashed vertical line at x = 0.5
      plotGroup.append("line")
          .attr("x1", xAxis(0.5))
          .attr("y1", 0)
          .attr("x2", xAxis(0.5))
          .attr("y2", plotHeight)
          .attr("stroke", "black")
          .attr("stroke-width", lineWidth)
          .attr("stroke-dasharray", "4");  // Make the line dashed

      // Add title starting from the left
      svg.append("text")
          .attr("x", margin.left)  // Start from the left margin
          .attr("y", margin.top / 2)
          .attr("text-anchor", "start")  // Align to the start (left)
          .attr("font-size", bigText)
          .attr("font-family", fontFamily)
          .attr("font-weight", "bold")
          .text(opts.title);

      // Add x-axis label
      svg.append("text")
          .attr("x", margin.left + plotWidth)
          .attr("y", margin.top + plotHeight + margin.bottom / 1.5)
          .attr("text-anchor", "end")  // Right-align the x-axis label
          .attr("font-size", mediumText)  // Smaller font size
          .attr("font-family", fontFamily)
          .attr("font-weight", "bold")
          .text("Likelihood");

      // Add y-axis label
      svg.append("text")
        .attr("x", margin.left / 2)
        .attr("y", margin.top ) // Changed from -margin.top / 2
        .attr("text-anchor", "middle")
        .attr("font-size", mediumText)
        .attr("font-family", fontFamily)
        .attr("font-weight", "bold")
        .text("Outcome");

      // Add the text "Negative" centered between 0 and 0.5
      svg.append("text")
          .attr("x", margin.left + xAxis(0.25))  // Centered between 0 and 0.5
          .attr("y", margin.top / .75)
          .attr("text-anchor", "middle")
          .attr("font-size", mediumText)
          .attr("font-family", fontFamily)
          .attr("font-weight", "bold")
          .text(opts.leftArea)
          .on('mouseover', leftAreaTip.show) // Display left area tooltip on mouseover
          .on('mouseout', leftAreaTip.hide); // Hide left area tooltip on mouseout


      // Add the text "Positive" centered between 0.5 and 1
      svg.append("text")
          .attr("x", margin.left + xAxis(0.75))  // Centered between 0.5 and 1
          .attr("y", margin.top / .75)
          .attr("text-anchor", "middle")
          .attr("font-size", mediumText)
          .attr("font-family", fontFamily)
          .attr("font-weight", "bold")
          .text(opts.rightArea)
          .on('mouseover', rightAreaTip.show) // Display right area tooltip on mouseover
          .on('mouseout', rightAreaTip.hide); // Hide right area tooltip on mouseout

      // Add a button
      const buttonWidth = 100;
      const buttonHeight = 30;

      let buttonText = "Posterior"; // Initial text

      const button = svg.append("rect")
          .attr("x", plotWidth + margin.left - buttonWidth)
          .attr("y", margin.top / 2 - buttonHeight / 2)
          .attr("width", buttonWidth)
          .attr("height", buttonHeight)
          .attr("rx", 5) // rounded corners
          .attr("ry", 5)
          .attr("fill", "blue")  // Button color
          .attr("cursor", "pointer") // Change cursor on hover
          .attr("class", "prior-posterior") // Add a class for identification
          .on("click", buttonClick);

      const buttonTextElement = svg.append("text")
          .attr("x", plotWidth + margin.left - buttonWidth / 2)
          .attr("y", margin.top / 2)
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "middle")
          .attr("font-family", fontFamily)
          .attr("font-size", mediumText)
          .attr("fill", "white")
          .attr("cursor", "pointer")
          .text(buttonText)
          .attr("class", "prior-posterior") // Add a class for identification
          .on("click", buttonClick);

      // Define a button to download the chart as PNG
      const ICON = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-download'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'></path><polyline points='7 10 12 15 17 10'></polyline><line x1='12' y1='15' x2='12' y2='3'></line></svg>";
      let save_as_image = svg.append('g')
        .append('svg')
        .attr('width', 20)
        .attr('height', 20)
        .attr('x', plotWidth + 1.4 * margin.left)
        .attr('y', plotHeight + 1.45 * margin.top)
        .attr("cursor", "pointer")
        .html(ICON)
        .on("click", saveAsImage);


        // Click event handler for the button
        function buttonClick() {
            // Toggle between "Posterior" and "Prior"
            buttonText = (buttonText === "Posterior") ? "Prior" : "Posterior";
            buttonTextElement.text(buttonText);

            // Update x-coordinates of circles based on the button text
            plotGroup.selectAll("circle")
              .transition()
              .duration(2000)
              .attr("cx", function(d) { return xAxis(buttonText === "Posterior" ? d.Posterior : d.Prior); });

          // Update x2-coordinates of lines based on the button text
            plotGroup.selectAll("line.line")
              .transition()
              .duration(2000)
              .attr("x2", function(d) { return xAxis(buttonText === "Posterior" ? d.Posterior : d.Prior); });

        }

      // Click event handler for the "save_as_image" button
      function saveAsImage() {
          // Create a clone of the SVG element
          const svgClone = svg.node().cloneNode(true);

          // Set background color and opacity for the cloned SVG element
          d3.select(svgClone)
              .style("background-color", plotBackgroundColor)
              .style("opacity", plotBackgroundOpacity);

          // Create a background rectangle and append it to the cloned SVG
          d3.select(svgClone)
              .insert("rect", ":first-child")
              .attr("width", plotWidth + margin.left + margin.right)
              .attr("height", plotHeight + margin.top + margin.bottom)
              .attr("fill", plotBackgroundColor)
              .attr("opacity", plotBackgroundOpacity);

          // Remove the "save_as_image" icon and the "Posterior" button from the clone
          d3.select(svgClone).select('.feather-download').remove(); // Remove the download icon
          d3.select(svgClone).selectAll('.prior-posterior').remove();
          // Create a Blob with the modified SVG content
          const svgBlob = new Blob([new XMLSerializer().serializeToString(svgClone)], { type: 'image/svg+xml' });
          // Create a temporary link element
          const link = document.createElement('a');
          link.href = URL.createObjectURL(svgBlob);
          link.download = 'lollipop-probabilities.png';
          // Append the link to the body and trigger a click event to download the image
          document.body.appendChild(link);
          link.click();
          // Remove the link from the body
          document.body.removeChild(link);
      }


      },

      renderValue: function(opts) {
        // keep options for resize
        options = opts;
        this.setupSvg();
        this.draw(opts);
      },

    resize: function(newWidth, newHeight) {
      console.log('resize w, h', newWidth, newHeight);

      const margin = {
        top: 80,
        right: 100,
        bottom: 80,
        left: 100
      };

      const plotWidth = newWidth - margin.left - margin.right;
      const plotHeight = newHeight - margin.top - margin.bottom;

      // Clear existing elements before redrawing
      this.svg.selectAll('*').remove();

      // Update the dimensions of the SVG element
      this.svg.attr('width', plotWidth);
      this.svg.attr('height', plotHeight);

      // Update the width and height variables
      width = newWidth;
      height = newHeight;

      // Re-render the plot with the updated dimensions
      this.draw(options);
    },

    loadAndDisplayLogo: function(opts) {
      const logoSize = opts.logoSize || 100; // Default logo size in pixels
      const logoLocation = opts.logoLocation || 'bottom-right'; // Default location

      // Load the SVG logo
      d3.xml(opts.logoPath).then((data) => {
        let logo = d3.select(data).select('svg');

        // Set the size of the logo
        logo.attr('width', logoSize)
            .attr('height', logoSize);

        // Append the logo to the SVG element
        const logoG = this.svg.append('g').node().appendChild(logo.node());

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
