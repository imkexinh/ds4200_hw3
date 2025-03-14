// Reusable function to create SVG containers
function createSvg(selector, width, height, margin) {
  return d3.select(selector)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
}

// Reusable function to add axis labels
function addAxisLabels(svg, width, height, margin, xLabel, yLabel) {
  // Add x-axis label
  svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom / 2)
      .attr("text-anchor", "middle")
      .attr("class", "axis-label")
      .text(xLabel);

  // Add y-axis label
  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left / 2 - 10)
      .attr("text-anchor", "middle")
      .attr("class", "axis-label")
      .text(yLabel);
}

// ====================================
// PART 2.1: SIDE-BY-SIDE BOX PLOT
// ====================================
function createBoxPlot(data) {
  // Define the dimensions and margins for the SVG
  const margin = {top: 40, right: 30, bottom: 60, left: 60};
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Create the SVG container
  const svg = createSvg("#boxplot", width, height, margin);

  // Set up scales for x and y axes
  const xScale = d3.scaleBand()
      .domain([...new Set(data.map(d => d.Platform))])
      .range([0, width])
      .padding(0.3);
  
  const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.Likes)])
      .range([height, 0])
      .nice();

  // Add scales - x-axis
  svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale));
  
  // Add scales - y-axis
  svg.append("g")
      .call(d3.axisLeft(yScale));

  // Add axis labels
  addAxisLabels(svg, width, height, margin, "Platform", "Number of Likes");

  // Function to calculate boxplot statistics
  const rollupFunction = function(groupData) {
      const values = groupData.map(d => d.Likes).sort(d3.ascending);
      const min = d3.min(values); 
      const q1 = d3.quantile(values, 0.25);
      const median = d3.quantile(values, 0.5);
      const q3 = d3.quantile(values, 0.75);
      const max = d3.max(values);
      return {min, q1, median, q3, max};
  };

  // This line uses d3.rollup to group the data by Platform and calculate statistics for each group
  // d3.rollup creates a Map where keys are the Platform values and values are the results of rollupFunction
  const quantilesByGroups = d3.rollup(data, rollupFunction, d => d.Platform);

  // This forEach iterates through each Platform group in the Map
  // For each group, it calculates the x position and boxWidth for drawing the boxplot
  quantilesByGroups.forEach((quantiles, platform) => {
      const x = xScale(platform);
      const boxWidth = xScale.bandwidth();

      // Draw vertical lines from min to max
      svg.append("line")
          .attr("x1", x + boxWidth / 2)
          .attr("x2", x + boxWidth / 2)
          .attr("y1", yScale(quantiles.min))
          .attr("y2", yScale(quantiles.max))
          .attr("stroke", "black")
          .attr("stroke-width", 1);

      // Draw box from q1 to q3
      svg.append("rect")
          .attr("x", x)
          .attr("y", yScale(quantiles.q3))
          .attr("width", boxWidth)
          .attr("height", yScale(quantiles.q1) - yScale(quantiles.q3))
          .attr("stroke", "black")
          .attr("fill", "#69b3a2")
          .attr("opacity", 0.7);

      // Draw median line
      svg.append("line")
          .attr("x1", x)
          .attr("x2", x + boxWidth)
          .attr("y1", yScale(quantiles.median))
          .attr("y2", yScale(quantiles.median))
          .attr("stroke", "black")
          .attr("stroke-width", 2);
  });
}

// ====================================
// PART 2.2: SIDE-BY-SIDE BAR PLOT
// ====================================
function createBarPlot(data) {
  // Define the dimensions and margins for the SVG
  const margin = {top: 80, right: 30, bottom: 60, left: 60};
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Create the SVG container
  const svg = createSvg("#barplot", width, height, margin);
  
  // Process data to calculate average likes by platform and post type
  // Group by Platform and PostType, then calculate average Likes
  const avgLikesData = Array.from(
    d3.rollup(
      data, 
      group => d3.mean(group, d => d.Likes), 
      d => d.Platform, 
      d => d.PostType
    ),
    ([platform, types]) => 
      Array.from(
        types, 
        ([postType, avgLikes]) => ({
          Platform: platform,
          PostType: postType,
          AvgLikes: avgLikes
        })
      )
  ).flat();

  // Define four scales
  const x0 = d3.scaleBand()
      .domain([...new Set(avgLikesData.map(d => d.Platform))])
      .range([0, width])
      .padding(0.2);

  const x1 = d3.scaleBand()
      .domain([...new Set(avgLikesData.map(d => d.PostType))])
      .range([0, x0.bandwidth()])
      .padding(0.05);

  const y = d3.scaleLinear()
      .domain([0, d3.max(avgLikesData, d => d.AvgLikes)])
      .range([height, 0])
      .nice();

  const color = d3.scaleOrdinal()
      .domain([...new Set(avgLikesData.map(d => d.PostType))])
      .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);    
       
  // Add scales x0 and y     
  svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x0));
      
  svg.append("g")
      .call(d3.axisLeft(y));

  // Add axis labels
  addAxisLabels(svg, width, height, margin, "Platform", "Average Number of Likes");

  // Group container for bars
  const barGroups = svg.selectAll("bar")
      .data(avgLikesData)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${x0(d.Platform)},0)`);

  // Draw bars
  barGroups.append("rect")
      .attr("x", d => x1(d.PostType))
      .attr("y", d => y(d.AvgLikes))
      .attr("width", x1.bandwidth())
      .attr("height", d => height - y(d.AvgLikes))
      .attr("fill", d => color(d.PostType))
      .attr("opacity", 0.8);

  // Add the legend 
  const legend = svg.append("g")
      .attr("transform", `translate(${width - 200}, ${-30})`);  

  const types = [...new Set(avgLikesData.map(d => d.PostType))];

  types.forEach((type, i) => {
      // Add a colored square/rect next to the text with corresponding color
      legend.append("rect")
          .attr("x", 0)
          .attr("y", i * 20)
          .attr("width", 15)
          .attr("height", 15)
          .attr("fill", color(type));

      // Text information for the legend
      legend.append("text")
          .attr("x", 20)
          .attr("y", i * 20 + 12)
          .text(type)
          .attr("alignment-baseline", "middle");
  });
}

// ====================================
// PART 2.3: LINE PLOT
// ====================================
function createLinePlot(data) {
  // Define the dimensions and margins for the SVG
  const margin = {top: 40, right: 30, bottom: 120, left: 60};
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Create the SVG container
  const svg = createSvg("#lineplot", width, height, margin);
  
  // Process data to calculate average likes by date
  // Group by Date, then calculate average Likes
  const timeData = Array.from(
    d3.rollup(
      data, 
      group => d3.mean(group, d => d.Likes), 
      d => d.Date
    ),
    ([date, avgLikes]) => ({
      Date: date,
      AvgLikes: avgLikes
    })
  );
  
  // Sort by date
  timeData.sort((a, b) => new Date(a.Date) - new Date(b.Date));

  // Set up scales for x and y axes
  const xScale = d3.scaleBand()
      .domain(timeData.map(d => d.Date))
      .range([0, width])
      .padding(0.1);
      
  const yScale = d3.scaleLinear()
      .domain([0, d3.max(timeData, d => d.AvgLikes) * 1.1]) // Add 10% padding
      .range([height, 0])
      .nice();

  // Draw the axis, with rotated text for x-axis
  svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-25)");
      
  svg.append("g")
      .call(d3.axisLeft(yScale));

  // Add axis labels
  addAxisLabels(svg, width, height, margin, "Date", "Average Number of Likes");

  // Draw the line and path using curveNatural
  const line = d3.line()
      .x(d => xScale(d.Date) + xScale.bandwidth() / 2) // Center in the band
      .y(d => yScale(d.AvgLikes))
      .curve(d3.curveNatural);
      
  // Add the line path
  svg.append("path")
      .datum(timeData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2.5)
      .attr("d", line);
}

// Load all datasets and initialize visualizations
function loadDataAndVisualize() {
  // Define a function to load a dataset and preprocess it
  function loadData(file, callback, preprocessor) {
      d3.csv(file).then(data => {
          // Apply preprocessing function to the data
          if (preprocessor) {
              data = preprocessor(data);
          }
          callback(data);
      }).catch(error => {
          console.error(`Error loading ${file}:`, error);
      });
  }

  // Preprocessing functions for each dataset
  const preprocessSocialMedia = data => {
      data.forEach(d => { 
          d.Likes = +d.Likes; 
      });
      return data;
  };

  // Load the dataset once and then call all visualization functions with the same data
  loadData("socialMedia.csv", data => {
      // Process the data once
      data.forEach(d => { 
          d.Likes = +d.Likes; 
      });
      
      // Call each visualization function with the same preprocessed data
      createBoxPlot(data);
      createBarPlot(data);
      createLinePlot(data);
  });
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', loadDataAndVisualize);