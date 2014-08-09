'use strict';

var blocks = [];
var locations = {};
var totalBlocks = 0;

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

    var minIndex = 0;
    var maxIndex = totalBlocks - 1;
    var currentIndex;
    var block;
    var curBlock;

    while( minIndex <= maxIndex ) {
        currentIndex = ( minIndex + maxIndex ) / 2 | 0;
        curBlock = blocks[ currentIndex ];

        if ( curBlock.end < ipl ) {
            minIndex = currentIndex + 1;
        }
        else if ( curBlock.start > ipl ) {
            maxIndex = currentIndex - 1;
        }
        else {
            block = curBlock;
            break;
        }
    }

    if ( !block ) {
        return undefined;
    }
    
    return locations[ block.locId ];
}

/**
 * Prepare the data.  This uses the standard free GeoIP CSV database
 * from MaxMind, you should be able to update it at any time by just
 * overwriting GeoIPASNum2.csv with a new version.
 */
( function() {

    var async = require( 'async' );
    var csv = require( 'csv-stream' );
    var fs = require( 'fs' );

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

                blocks.push( {
                    locId: locId,
                    start: start,
                    end: end
                } );
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

                var location = {
                    id: locId,
                    country: data.country || null,
                    region: data.region || null,
                    city: data.city || null,
                    postalCode: data.postalCode || null,
                    latitude: data.latitude ? parseFloat( data.latitude ) : null,
                    longitude: data.longitude ? parseFloat( data.longitude ) : null,
                    metroCode: data.metroCode ? parseInt( data.metroCode ) : null,
                    areaCode: data.areaCode ? parseInt( data.areaCode ) : null
                };

                locations[ locId ] = location;
            } );
        }
    ], function( error ) {
        if ( error ) {
            throw new Error( error );
        }
        
        blocks.sort( function( l, r ) {
            return l.start - r.end;
        } );

        totalBlocks = blocks.length;
        geoip.ready = true;
    } );

}() );