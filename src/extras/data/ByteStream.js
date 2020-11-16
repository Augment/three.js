
/**
 * @author augment // (use revised code of gifuct-js by matt-way https://github.com/matt-way/gifuct-js)
 */

// Stream object for reading off bytes from a byte array
function ByteStream( data ) {

	this.data = data;
	this.pos = 0;

}

Object.assign( ByteStream.prototype, {
	// read the next byte off the stream
	readByte: function () {

		return this.data[ this.pos ++ ];

	},

	// look at the next byte in the stream without updating the stream position
	peekByte: function () {

		return this.data[ this.pos ];

	},

	// read an array of bytes
	readBytes: function ( n ) {

		var bytes = new Array( n );
		for ( var i = 0; i < n; i ++ ) {

			bytes[ i ] = this.readByte();

		}

		return bytes;

	},

	// peek at an array of bytes without updating the stream position
	peekBytes: function ( n ) {

		var bytes = new Array( n );
		for ( var i = 0; i < n; i ++ ) {

			bytes[ i ] = this.data[ this.pos + i ];

		}

		return bytes;

	},

	// read a string from a byte set
	readString: function ( len ) {

		var str = '';
		for ( var i = 0; i < len; i ++ ) {

			str += String.fromCharCode( this.readByte() );

		}

		return str;

	},

	// read a single byte and return an array of bit booleans
	readBitArray: function () {

		var arr = [];
		var bite = this.readByte();
		for ( var i = 7; i >= 0; i -- ) {

			arr.push( !! ( bite & ( 1 << i ) ) );

		}

		return arr;

	},

	// read an unsigned int with endian option
	readUnsigned: function ( littleEndian ) {

		var a = this.readBytes( 2 );
		if ( littleEndian ) {

			return ( a[ 1 ] << 8 ) + a[ 0 ];

		} else {

			return ( a[ 0 ] << 8 ) + a[ 1 ];

		}

	}

} );

export { ByteStream };
