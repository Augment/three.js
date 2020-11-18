/**
 * @author augment
 */

import { AnimatedGifTexture } from '../textures/AnimatedGifTexture.js';
import { FileLoader } from './FileLoader.js';
import { DefaultLoadingManager } from './LoadingManager.js';
import { GifReader } from '../extras/images/GifReader.js';
import { RGBAFormat, UnsignedByteType } from '../constants.js';

function ImageGifLoader( manager ) {

	this.manager = ( manager !== undefined ) ? manager : DefaultLoadingManager;

}

Object.assign( ImageGifLoader.prototype, {

	crossOrigin: 'Anonymous',

	load: function ( url, onLoad, onProgress, onError ) {

		var texture = new AnimatedGifTexture();

		var loader = new FileLoader( this.manager );
		loader.setResponseType( 'arraybuffer' );

		loader.load( url, function ( buffer ) {

			var gifComponent = new GifReader( buffer );
			var frames = gifComponent.decompressFrames( true );

			if ( ! buffer ) return;

			if ( undefined !== frames[ 0 ] ) {

				texture.setFramesData( frames );
				texture.image.width = frames[ 0 ].dims.width;
				texture.image.height = frames[ 0 ].dims.height;

			}

			texture.format = RGBAFormat;
			texture.type = UnsignedByteType;

			texture.needsUpdate = true;

			if ( onLoad ) onLoad( texture, buffer );

		}, onProgress, onError );

		return texture;

	},

	setCrossOrigin: function ( value ) {

		this.crossOrigin = value;
		return this;

	},

	setPath: function ( value ) {

		this.path = value;
		return this;

	}
} );

export { ImageGifLoader };
