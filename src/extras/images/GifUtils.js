/**
 * @author augment // (use revised code of gifuct-js by matt-way https://github.com/matt-way/gifuct-js)
 */

var GifUtils = {};
GifUtils.parsers = {
	// read a byte
	readByte: function () {

		return function ( stream ) {

			return stream.readByte();

		};

	},
	// read an array of bytes
	readBytes: function ( length ) {

		return function ( stream ) {

			return stream.readBytes( length );

		};

	},
	// read a string from bytes
	readString: function ( length ) {

		return function ( stream ) {

			return stream.readString( length );

		};

	},
	// read an unsigned int (with endian)
	readUnsigned: function ( littleEndian ) {

		return function ( stream ) {

			return stream.readUnsigned( littleEndian );

		};

	},
	// read an array of byte sets
	readArray: function ( size, countFunc ) {

		return function ( stream, obj, parent ) {

			var count = countFunc( stream, obj, parent );
			var arr = new Array( count );
			for ( var i = 0; i < count; i ++ ) {

				arr[ i ] = stream.readBytes( size );

			}

			return arr;

		};

	}
};

// Schema for the js file parser to use to parse gif files
// For js object convenience (re-use), the schema objects are approximately reverse ordered

// a set of 0x00 terminated subblocks
GifUtils.subBlocks = {
	label: 'blocks',
	parser: function ( stream ) {

		var out = [];
		var terminator = 0x00;
		for ( var size = stream.readByte(); size !== terminator; size = stream.readByte() ) {

			out = out.concat( stream.readBytes( size ) );

		}

		return out;

	}
};

// global control extension
GifUtils.gce = {
	label: 'gce',
	requires: function ( stream ) {

		// just peek at the top two bytes, and if true do this
		var codes = stream.peekBytes( 2 );
		return codes[ 0 ] === 0x21 && codes[ 1 ] === 0xF9;

	},
	parts: [
		{ label: 'codes', parser: GifUtils.parsers.readBytes( 2 ), skip: true },
		{ label: 'byteSize', parser: GifUtils.parsers.readByte() },
		{ label: 'extras', bits: {
			future: { index: 0, length: 3 },
			disposal: { index: 3, length: 3 },
			userInput: { index: 6 },
			transparentColorGiven: { index: 7 }
		} },
		{ label: 'delay', parser: GifUtils.parsers.readUnsigned( true ) },
		{ label: 'transparentColorIndex', parser: GifUtils.parsers.readByte() },
		{ label: 'terminator', parser: GifUtils.parsers.readByte(), skip: true }
	]
};

// image pipeline block
GifUtils.image = {
	label: 'image',
	requires: function ( stream ) {

		// peek at the next byte
		var code = stream.peekByte();
		return code === 0x2C;

	},
	parts: [
		{ label: 'code', parser: GifUtils.parsers.readByte(), skip: true },
		{
			label: 'descriptor', // image descriptor
			parts: [
				{ label: 'left', parser: GifUtils.parsers.readUnsigned( true ) },
				{ label: 'top', parser: GifUtils.parsers.readUnsigned( true ) },
				{ label: 'width', parser: GifUtils.parsers.readUnsigned( true ) },
				{ label: 'height', parser: GifUtils.parsers.readUnsigned( true ) },
				{ label: 'lct', bits: {
					exists: { index: 0 },
					interlaced: { index: 1 },
					sort: { index: 2 },
					future: { index: 3, length: 2 },
					size: { index: 5, length: 3 }
				} }
			]
		}, {
			label: 'lct', // optional local color table
			requires: function ( stream, obj, parent ) {

				return parent.descriptor.lct.exists;

			},
			parser: GifUtils.parsers.readArray( 3, function ( stream, obj, parent ) {

				return Math.pow( 2, parent.descriptor.lct.size + 1 );

			} )
		}, {
			label: 'data', // the image data blocks
			parts: [
				{ label: 'minCodeSize', parser: GifUtils.parsers.readByte() },
				GifUtils.subBlocks
			]
		}
	]
};

// plain text block
GifUtils.text = {
	label: 'text',
	requires: function ( stream ) {

		// just peek at the top two bytes, and if true do this
		var codes = stream.peekBytes( 2 );
		return codes[ 0 ] === 0x21 && codes[ 1 ] === 0x01;

	},
	parts: [
		{ label: 'codes', parser: GifUtils.parsers.readBytes( 2 ), skip: true },
		{ label: 'blockSize', parser: GifUtils.parsers.readByte() },
		{
			label: 'preData',
			parser: function ( stream, obj, parent ) {

				return stream.readBytes( parent.text.blockSize );

			}
		},
		GifUtils.subBlocks
	]
};

// application block
GifUtils.application = {
	label: 'application',
	requires: function ( stream ) {

		// make sure this frame doesn't already have a gce, text, comment, or image
		// as that means this block should be attached to the next frame
		//if(parent.gce || parent.text || parent.image || parent.comment){ return false; }

		// peek at the top two bytes
		var codes = stream.peekBytes( 2 );
		return codes[ 0 ] === 0x21 && codes[ 1 ] === 0xFF;

	},
	parts: [
		{ label: 'codes', parser: GifUtils.parsers.readBytes( 2 ), skip: true },
		{ label: 'blockSize', parser: GifUtils.parsers.readByte() },
		{
			label: 'id',
			parser: function ( stream, obj, parent ) {

				return stream.readString( parent.blockSize );

			}
		},
		GifUtils.subBlocks
	]
};

// comment block
GifUtils.comment = {
	label: 'comment',
	requires: function ( stream ) {

		// make sure this frame doesn't already have a gce, text, comment, or image
		// as that means this block should be attached to the next frame
		//if(parent.gce || parent.text || parent.image || parent.comment){ return false; }

		// peek at the top two bytes
		var codes = stream.peekBytes( 2 );
		return codes[ 0 ] === 0x21 && codes[ 1 ] === 0xFE;

	},
	parts: [
		{ label: 'codes', parser: GifUtils.parsers.readBytes( 2 ), skip: true },
		GifUtils.subBlocks
	]
};

// frames of ext and image data
GifUtils.frames = {
	label: 'frames',
	parts: [
		GifUtils.gce,
		GifUtils.application,
		GifUtils.comment,
		GifUtils.image,
		GifUtils.text
	],
	loop: function ( stream ) {

		var nextCode = stream.peekByte();
		// rather than check for a terminator, we should check for the existence
		// of an ext or image block to avoid infinite loops
		//var terminator = 0x3B;
		//return nextCode !== terminator;
		return nextCode === 0x21 || nextCode === 0x2C;

	}
};

// main GIF schema
GifUtils.schemaGIF = [
	{
		label: 'header', // gif header
		parts: [
			{ label: 'signature', parser: GifUtils.parsers.readString( 3 ) },
			{ label: 'version', parser: GifUtils.parsers.readString( 3 ) }
		]
	}, {
		label: 'lsd', // local screen descriptor
		parts: [
			{ label: 'width', parser: GifUtils.parsers.readUnsigned( true ) },
			{ label: 'height', parser: GifUtils.parsers.readUnsigned( true ) },
			{ label: 'gct', bits: {
				exists: { index: 0 },
				resolution: { index: 1, length: 3 },
				sort: { index: 4 },
				size: { index: 5, length: 3 }
			} },
			{ label: 'backgroundColorIndex', parser: GifUtils.parsers.readByte() },
			{ label: 'pixelAspectRatio', parser: GifUtils.parsers.readByte() }
		]
	}, {
		label: 'gct', // global color table
		requires: function ( stream, obj ) {

			return obj.lsd.gct.exists;

		},
		parser: GifUtils.parsers.readArray( 3, function ( stream, obj ) {

			return Math.pow( 2, obj.lsd.gct.size + 1 );

		} )
	},
	GifUtils.frames // content frames
];

export { GifUtils };
