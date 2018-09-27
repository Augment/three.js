import { RGBAFormat, RGBFormat } from '../constants.js';
import { ImageLoader } from './ImageLoader.js';
import { Texture } from '../textures/Texture.js';
import { Loader } from './Loader.js';
import { ImageGifLoader } from '../extensions/gif.js';

function TextureLoader( manager ) {

	Loader.call( this, manager );

}

TextureLoader.prototype = Object.assign( Object.create( Loader.prototype ), {

	constructor: TextureLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var texture = null;

		var isGIF = url.search( /\.gif$/ ) > 0 || url.search( /^data\:image\/gif/ ) === 0;

		if ( isGIF ) {

			if ( ImageGifLoader == undefined ) {

				onError( new Error( 'THREE.TextureLoader: gif format is not supported' ) );
				return;

			}

			var gifLoader = new ImageGifLoader( this.manager );
			gifLoader.setCrossOrigin( this.crossOrigin );
			gifLoader.setPath( this.path );
			gifLoader.load( url, function ( texture ) {

				if ( onLoad !== undefined ) {

					texture.animation.start();

					onLoad( texture );

				}

			}, onProgress, onError );

		} else {

			const loader = new ImageLoader( this.manager );
			loader.setCrossOrigin( this.crossOrigin );
			loader.setPath( this.path );

			texture = new Texture();
			loader.load( url, function ( image ) {

				texture.image = image;

				// JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
				const isJPEG = url.search( /\.(jpg|jpeg)$/ ) > 0 || url.search( /^data\:image\/jpeg/ ) === 0;

				texture.format = isJPEG ? RGBFormat : RGBAFormat;
				texture.needsUpdate = true;

				if ( onLoad !== undefined ) {

					onLoad( texture );

				}

			}, onProgress, onError );

		}

		return texture;

	}

} );


export { TextureLoader };
