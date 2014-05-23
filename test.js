var util = require('util');
var geoip = require("./geoip.js");

function random_test_ip() {
    var o1 = 1 + Math.round(Math.random() * 254);
    var o2 = 1 + Math.round(Math.random() * 254);
    var o3 = 1 + Math.round(Math.random() * 254);
    var o4 = 1 + Math.round(Math.random() * 254);
    return o1 + "." + o2 + "." + o3 + "." + o4;
}

function static_test_ip() {
    return "8.8.8.8";
}

var ip_for_test = random_test_ip;

function test() {
    var total = 0;
    var numtests = 100;
    var numwarmups = 10;
    var numiterations = 1000000;

    console.log("starting test: geoip-native");

    function oneTest(warmup) {

            var start = new Date().getTime();

            for (var i = 0; i < numiterations; i++) {
                geoip.lookup(ip_for_test());
            }

            var finish = new Date().getTime();

            if(!warmup) {
                total += (finish - start);
                console.log("time for " + numiterations + " iterations: " + (finish - start) + " ms.");
                console.log("time per lookup: " + ((finish - start) / numiterations) + " ms.");
            }
    }
    // Warmup runs
    for (var w = 0; w < numwarmups; w++) {
        oneTest(true);
    }
    console.log("Memory usage after warmup:" );
    console.log(util.inspect(process.memoryUsage()));

    // Actual runs
    for (var t = 0; t < numtests; t++) {
        console.log("Starting test number "+t);
        oneTest(false);
    }
    console.log("average: " + (total / numtests));
    console.log("Memory usage at end of test:" );
    console.log(util.inspect(process.memoryUsage()));
}

console.log("Initial memory usage:" );
console.log(util.inspect(process.memoryUsage()));

setTimeout(test, 3000);
