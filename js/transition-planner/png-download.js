d3.select("#downloadPng")
.on('click', function(){
    // Get the d3js SVG element and save using saveSvgAsPng.js
    saveSvgAsPng(document.getElementsByTagName("svg")[0], "plot.png", {scale: 2, backgroundColor: "#FFFFFF"});
})