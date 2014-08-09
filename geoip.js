'use strict';

var locations = [];
var totalLocations = 0;

var geoip = module.exports = {

    ready: false,

    lookup: function( ip ) {

        if ( !geoip.ready ) {
            return {
                error: "GeoIP not ready"
            };
        }

        var ipl = iplong( ip );

        if ( ipl === 0 ) {
            return {
                error: "Invalid ip address " + ip + " -> " + ipl + " as integer"
            };
        }

        return find( ipl );
    }
};

function iplong( ip ) {

    if ( !ip ) {
        return 0;
    }

    ip = ip.toString();

    if ( isNaN( ip ) && ip.indexOf( "." ) == -1 ) {
        return 0;
    }

    if ( ip.indexOf( "." ) == -1 ) {

        try {
            ip = parseFloat( ip );
            return ip < 0 || ip > 4294967296 ? 0 : ip;
        }
        catch ( s ) {}
    }

    var parts = ip.split( "." );

    if ( parts.length != 4 ) {
        return 0;
    }

    var ipl = 0;

    for ( var i = 0; i < 4; i++ ) {
        parts[ i ] = parseInt( parts[ i ], 10 );

        if ( parts[ i ] < 0 || parts[ i ] > 255 ) {
            return 0;
        }

        ipl += parts[ 3 - i ] * ( Math.pow( 256, i ) );
    }

    return ipl > 4294967296 ? 0 : ipl;
}

/**
 * A qcuick little binary search
 * @param ip the ip we're looking for
 * @return {*}
 */
function find( ipl ) {

    var imax = totalLocations - 1,
        imin = 0;

    while ( imax >= imin ) {
        var imid = Math.floor( ( imin + imax ) / 2 );
        var location = locations[ imid ];
        if ( location.ipstart <= ipl && location.ipend >= ipl ) {
            return location;
        }
        else if ( location.ipstart < ipl ) {
            imin = imid + 1;
        }
        else {
            imax = imid - 1;
        }
    }

    return undefined;
}

/**
 * Prepare the data.  This uses the standard free GeoIP CSV database
 * from MaxMind, you should be able to update it at any time by just
 * overwriting GeoIPASNum2.csv with a new version.
 */
( function() {

    var async = require( 'async' );
    var extend = require( 'node.extend' );
    var csv = require( 'csv-stream' );
    var fs = require( 'fs' );

    var blocks = {};
    
    async.series( [
        // load blocks
        function( next ) {

            var csvStream = csv.createStream( {
                columns: [ 'startIpNum', 'endIpNum', 'locId' ],
                enclosedChar: '"'
            } );

            fs.createReadStream( __dirname + '/GeoLiteCity-Blocks.csv' ).pipe( csvStream )
            .on( 'error', next )
            .on( 'end', next )
            .on( 'data', function( data ) {
                var locId = parseInt( data.locId );
                var start = parseInt( data.startIpNum );
                var end = parseInt( data.endIpNum );

                if ( isNaN( locId ) || isNaN( start ) || isNaN( end ) ) {
                    return;
                }

                blocks[ locId ] = {
                    start: start,
                    end: end
                };
            } );
        },

        // load city data
        function( next ) {
            var csvStream = csv.createStream( {
                columns: [ 'locId', 'country', 'region', 'city', 'postalCode', 'latitude', 'longitude', 'metroCode', 'areaCode' ],
                enclosedChar: '"'
            } );

            fs.createReadStream( __dirname + '/GeoLiteCity-Location.csv' ).pipe( csvStream )
            .on( 'error', next )
            .on( 'end', next )
            .on( 'data', function( data ) {
                
                var locId = parseInt( data.locId );
                if ( isNaN( locId ) ) {
                    return;
                }

                var block = blocks[ locId ];
                if ( !block ) {
                    return;
                }
                
                var location = extend( data, {
                    ipstart: blocks[ locId ].start,
                    ipend: blocks[ locId ].end   
                } );
                
                for ( var key in location ) {
                    location[ key ] = location[ key ] || null;
                }
                
                location.locId = parseInt( locId );
                location.metroCode = location.metroCode ? parseInt( location.metroCode ) : location.metroCode;
                location.areaCode = location.areaCode ? parseInt( location.areaCode ) : location.areaCode;
                location.longitude = location.longitude ? parseFloat( location.longitude ) : location.longitude;
                location.latitude = location.latitude ? parseFloat( location.latitude ) : location.latitude;

                locations.push( location );
            } );
        }
    ], function( error ) {
        if ( error ) {
            throw new Error( error );
        }
        
        locations.sort( function( l, r ) {
            return l.ipstart - r.ipstart;
        });

        totalLocations = locations.length;
        geoip.ready = true;
    } );

}() );