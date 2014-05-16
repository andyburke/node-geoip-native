var geoip = require("./geoip.js");


function random_test_ip() {
    var o1 = 1 + Math.round(Math.random() * 254);
    var o2 = 1 + Math.round(Math.random() * 254);
    var o3 = 1 + Math.round(Math.random() * 254);
    var o4 = 1 + Math.round(Math.random() * 254);
    return o1 + "." + o2 + "." + o3 + "." + o4;
}

function static_test_ip() {
//    return "8.8.8.8";
    return "8.8.8.8";
}

var ip_for_test = static_test_ip;

function test() {

    var total = 0;
    var numtests = 20;
    var numiterations = 10; //1000000;

    console.log("starting test: geoip-native");

    for (var t = 0; t < numtests; t++) {

        var start = new Date().getTime();

        for (var i = 0; i < numiterations; i++) {
            console.log(geoip.lookup(ip_for_test()));
        }

        var finish = new Date().getTime();

        total += (finish - start);
        console.log("time for " + numiterations + " iterations: " + (finish - start) + " ms.");
        console.log("time per lookup: " + ((finish - start) / numiterations) + " ms.");
    }

    console.log("average: " + (total / numtests));

}

setTimeout(test, 3000);
