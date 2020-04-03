var canvas;
var context;

    function init(){ //set up canvas environment and load chosen image onto canvas
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    readImage();

    class CanvasData { //class used to store pixel data of the canvas after each stage
        constructor (original, greyscale, edgeDetection, edgesSelected) { //allows for functions to access values globally
            this.original = original;
            this.greyscale = greyscale;
            this.edgeDetection = edgeDetection;
            this.edgesSelected = edgesSelected;
        }
    }
    canvasData = new CanvasData (0,0,0,0);

    }

    function greyscale(canvasData){
        canvasData.original = pixelData();
        canvasData.greyscale = convertGreyscale(pixelData());
    }

    function edgeDetection(canvasData){
        canvasData.edgeDetection = sobelOperation(pixelData());
    }

    function edgeSelection(canvasData){
        context.putImageData(canvasData.edgeDetection, 0,0);
        var edges = getEdgeList();
        var strongEdgesCoord = checkEdgeStrength(edges)
        canvasData.edgesSelected = strongEdgesCoord
    }

    function artGeneration(canvasData){
       context.putImageData(canvasData.edgeDetection, 0,0);
       initialCircles(canvasData.edgesSelected, canvasData.original);
    }

    function random(canvasData){ //repeats artGeneration function to generate new arrangement of circles
        var i = 0 
        while (i < 6) {
        artGeneration(canvasData);
        i++;
        }
    }


  
function readImage() { //load pre-selected image onto canvas
    var selectedImage = document.getElementById("inputImage"); //access image selected from HTML
    selectedImage.addEventListener('change', (event) => { //when value of selectedImage changes, call function
    var reader = new FileReader();
    var img = new Image();
    img.onload = function() {
        context.drawImage(img, 0, 0, 600, 600); //draw image on canvas 600px by 600px
    }
    reader.onload = function() {
        img.src = reader.result;
    }
    reader.readAsDataURL(event.target.files[0]); //read contents of file
    });
}

function pixelData(){ //store the RGB pixel data for each pixel of image
    var imgData = context.getImageData(0,0,600,600); //Uint8Array object
    var pixelData = imgData.data; //Continuous 1d array of rgba values for each pixel
    return pixelData;
}

function convertGreyscale(imgData){ //convert image to greyscale
    var pixelsGreyscale = []; // array for greyscale values to be added to 
    var rgbSum;
    for (var j = 0; j < imgData.length; j +=4){ //loop through imgData array, examining every 4th item (each pixel's data takes up 4 indexes)
        rgbSum = 0 
        for (var i = 0; i < 3; i++){ //loop through each red, green and blue value for individual pixel 
            var k = i + j 
            rgbSum += imgData[k] //sum rbg value for each pixel 
        }
        greyscaleValue = rgbSum/3; //divide sum by 3 to obtain greyscale value
        pixelsGreyscale[j] = greyscaleValue; //add greyscale value of pixel to array
        pixelsGreyscale[j+1] = greyscaleValue; //value must be replicated 3 times in order to suit format of Uint8Array so that array can paint pixels back onto canvas
        pixelsGreyscale [j+2] = greyscaleValue;
        pixelsGreyscale [j+3] = imgData[j+3]; //original alpha value used to keep levels 
    }
    var greyscaleImage = Uint8ClampedArray.from(pixelsGreyscale);
    var imageData = new ImageData(greyscaleImage, 600);
    context.putImageData(imageData, 0,0); // paint greyscale image data back onto the canvas
    return imageData;
}     

function sumGrid (imgData, x, y, numCol, kernel) { //sum greyscale value for 9 pixels around (and incl.) pixel having edge detection algorithm run on.
    var sumGrid = 0 ;
    sumGrid += imgData[((y-1)*numCol*4)+((x-1)*4)+0] * kernel[0]; //each greyscale value multiplied by a specific weighting set by whether xKernel or yKernel used.
    sumGrid += imgData[((y)*numCol*4)+((x-1)*4)+0] * kernel[1];
    sumGrid += imgData[((y+1)*numCol*4)+((x-1)*4)+0] * kernel[2];
    sumGrid += imgData[((y-1)*numCol*4)+((x)*4)+0] * kernel[3];
    sumGrid += imgData[((y)*numCol*4)+((x)*4)+0] * kernel[4];
    sumGrid += imgData[((y+1)*numCol*4)+((x)*4)+0] * kernel[5];
    sumGrid += imgData[((y-1)*numCol*4)+((x+1)*4)+0] * kernel[6];
    sumGrid += imgData[((y)*numCol*4)+((x+1)*4)+0] * kernel[7];
    sumGrid += imgData[((y+1)*numCol*4)+((x+1)*4)+0] * kernel[8];
    return sumGrid;
}

function sobelOperation (imgData) { //calculates change in greyscale values across image to calculate strength of edges
    var averages = []; //array to store edge strength and alpha values to paint back onto canvas 
    var yKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1]; //weighting when analysing horizontal gradient 
    var xKernel = [1, 0, -1, 2, 0, -2, 1, 0, -1]; //weighting when analysing vertical gradient 
    var width = canvas.width;
    var height = canvas.height;
    for (var row = 1; row < height-1; row ++) { //can't start at 0,0 as no row to left or above
        for (var column = 1; column < width-1; column ++) {
            var sumX = sumGrid(imgData, column , row, width, xKernel); //sum weighted values in X-direction
            var sumY = sumGrid(imgData, column , row, width, yKernel); //sum weighted values in Y-direction
            var xEdge = sumX/4;
            var yEdge = sumY/4;
            var edge = ((xEdge ** 2) + (yEdge ** 2)) ** 0.5; //calculate average strength of edge
            averages.push(edge); //store strength of edge in averages array
            averages.push(edge); //repeated to match format of Uint8Array (rgba)
            averages.push(edge); //each r,g,b value = edge strength
            averages.push(255); //maximum alpha level to make edge detection image opaque
        }
    }
    var edgeImage = Uint8ClampedArray.from(averages); //create new Uint8ClampedArray to paint edge detection image back onto canvas
    var edgeData = new ImageData(edgeImage, 598); //omitted first row and column so edge detection image painted onto 598 pixels 
    context.putImageData(edgeData, 0,0); // paint greyscale image data back onto the canvas
    var edgeImageData = edgeImage.data;
    return edgeData;   
}

function getEdgeList() {
    edgeArray = context.getImageData(0,0,600,600);
    edgeImage = edgeArray.data;
    var edges = []; //array for edge strength of each pixel (only stored once per pixel)
    for (var i = 0; i < edgeImage.length; i+=4){ //loop through each red, green and blue value for individual pixel 
        edges.push(edgeImage[i]);
    }
    return edges;

}

function checkEdgeStrength (edgeList) {

    class ColourPixel { 
        constructor (x, y, radius) {
            this.x = x;
            this.y = y;
            this.radius = radius;
        }

        highlight (x, y, radius) { //highlight selected pixels by drawing small circle in place of pixel
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2, true);
            context.strokeStyle = "rgba(255,255,255,0.4)";
            context.stroke();
        }
    }
    var slider = document.getElementById("edgeRangeSlider"); //user changes slider to dictate how many edges to pick up
    var strongEdges = [];
    var strongEdgesCoord = [];
    for (var i = 0; i < edgeList.length; i++) {
        if (edgeList[i] > slider.value) { //slider set edge threshold
            strongEdges.push(i)
            var column = Math.floor(i / 600);
            var row = i % 600;
            strongEdgesCoord.push(column, row, edgeList[i]); //create array of 'strong' edges (edges over threshold)
            var pixel = new ColourPixel(row, column, 1);
            pixel.highlight(row, column, 1);
        }
    }
    return strongEdgesCoord;
}

function initialCircles (strongEdgesList, imgData) {
    class Circle { 
        constructor (x, y, radius) {
            this.x = x;
            this.y = y;
            this.radius = radius;
        }
  
        place (x, y, radius, imgData) { //place circle on canvas
          context.beginPath();
          context.arc(x, y, radius,0, Math.PI * 2, true);
          var numCol = canvas.width;
          var red = imgData[((y)*numCol*4)+((x)*4)+0]; //use colour from original pixel
          var green = imgData[((y)*numCol*4)+((x)*4)+1];
          var blue = imgData[((y)*numCol*4)+((x)*4)+2];
          context.strokeStyle = "rgba(" + red +"," + green + "," + blue + ", 1)"; //circle colour white, opacity = 0.5
          context.stroke();
        }


    }


    function generateCircles (edgeStrength, row, column, circlesArray, imgData) {
        var circlePlaced = false;
        var slider = document.getElementById("edgeRangeSlider")
        if ((edgeStrength => slider.value) && (edgeStrength <= (slider.value)+10)) { 
            next = new Circle(row, column, 2); //weaker edges place a smaller circle
            next.place(row, column, 2, imgData);
            circlesArray.push([row, column]); //add circle information to array
            circlePlaced = true;
        }

        if (edgeStrength > (slider.value)+10) { //if edge exceeds the slider value + 10 (aka is a very strong edge) 
            next = new Circle(row, column, 3);
            next.place(row, column, 3, imgData);
            circlesArray.push([row, column]);
            generateFromStrong(row, column, imgData); //create more circles around pixel
            circlePlaced = true;
        }

        else { 
            next = new Circle(row, column, 1);
            next.place(row, column, 1, imgData);
            circlesArray.push([row, column]);
            generateFromStrong(row, column, imgData);
            circlePlaced = true;
        }

        return circlePlaced
    }

    function generateFromStrong (row, column, imgData) { //generate more circles around strongest edges
        var iterateRange = Math.floor(Math.random() * 4 + 1) //repeat circle placement between 1 and 4 times
        for (var i = 0; i < iterateRange; i++) {
            var xRange = Math.floor(Math.random() * 20); //x coordinate within 20 pixels of original
            var yRange = Math.floor(Math.random() * 10); //y coordinate within 10 pixels of original
            newRow = row + yRange
            newColumn = column + xRange
            var size = Math.floor(Math.random() * 6) //size of circle between 0 and 8
            next = new Circle(newRow, newColumn, size);
            next.place(newRow, newColumn, size, imgData);
        }
    }

    var circles = [];
    for (var i = 0; i < strongEdgesList.length; i += (3*10)) { //find edge strength of every 10th pixel
        var column = strongEdgesList[i];
        var row = strongEdgesList[i+1];
        var edgeStrength = strongEdgesList[i+2];
        generateCircles(edgeStrength, row, column, circles, imgData)
        if (circlePlaced = true){
            i += 66;
        }
    }
}