/**
 * @author augment
 */

import { Texture } from './Texture.js';
import { AnimatedGifTextureAnimation } from './AnimatedGifTextureAnimation.js';
import { NearestFilter, ClampToEdgeWrapping } from '../constants.js';

function AnimatedGifTexture( framesData, width, height, format, type, mapping, wrapS, wrapT, magFilter, minFilter, anisotropy, encoding ) {

	Texture.call( this, null, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, encoding );

	this.image = {
		data: null,
		width: width,
		height: height
	};

	this.magFilter = NearestFilter;
	this.minFilter = NearestFilter;
	this.wrapS = ClampToEdgeWrapping;
	this.wrapT = ClampToEdgeWrapping;

	this.generateMipmaps = false;
	this.flipY = false;
	this.unpackAlignment = 4;

	this.animation = null;
	if ( framesData ) {

		this.setFramesData( framesData );

	}

}

AnimatedGifTexture.prototype = Object.create( Texture.prototype );
AnimatedGifTexture.prototype.constructor = AnimatedGifTexture;

AnimatedGifTexture.prototype.isAnimatedTexture = true;

Object.assign( AnimatedGifTexture.prototype, {

	dispose: function () {

		if ( this.animation ) {

			this.animation.stop();

		}

		Texture.prototype.dispose.call( this );

	},

	setFramesData: function ( data ) {

		function onUpdate() {

			self.needsUpdate = true;

		}

		if ( data ) {

			var self = this;

			this.animation = new AnimatedGifTextureAnimation( this.prepareFullFrames( data ), onUpdate );

		}

	},

	getFrame: function () {

		if ( this.animation ) {

			return this.animation.getFrame();

		} else {

			return undefined;

		}

	},

	preparePatchFrames: function ( frames ) {

		var width = frames[ 0 ].dims.width, height = frames[ 0 ].dims.height, depth = 4, count = frames.length;
		var frameLineWidth = width * depth, patchLineWidth = 0, newPatchLineWidth = 0;
		var previousCompleteFrame, frame, newPatchData, dims, area, frameArea;
		var processedPatches = [];

		var patch = { data: [], height: 0, left: 0, parial: false, top: 0, width: 0 };

		for ( var i = 0; i < count; ++ i ) {

			frame = frames[ i ];
			dims = frame.dims;
			patch = { data: [], delay: frame.delay, height: dims.height, left: dims.left, partial: false, top: dims.top, width: dims.width };

			if ( width === dims.width && height === dims.height ) {

				patch.data = frame.patch;
				patch.partial = false;
				previousCompleteFrame = patch.data;

			} else {

				patchLineWidth = dims.width * depth;

				if ( false ) { // 8-bit copy

					if ( previousCompleteFrame ) {

						newPatchData = new Uint8Array( frame.patch );
						area = newPatchData;
						newPatchLineWidth = patchLineWidth;

					} else {

						newPatchData = new Uint8Array( depth * width * height );
						area = newPatchData.subarray( dims.top * frameLineWidth + dims.left * depth );
						newPatchLineWidth = frameLineWidth;

					}

					frameArea = previousCompleteFrame.subarray( dims.top * frameLineWidth + dims.left * depth );

					for ( var fr = 0, pr = 0; pr < dims.height * newPatchLineWidth; fr += frameLineWidth, pr += newPatchLineWidth ) {

						for ( var c = 0; c < patchLineWidth; c += depth ) {

							// copy the existing background only if the pixel is transparent
							if ( 0 === area[ pr + c + 3 ] ) { // alpha is 0 or 255

								area[ pr + c + 0 ] = frameArea[ fr + c + 0 ];
								area[ pr + c + 1 ] = frameArea[ fr + c + 1 ];
								area[ pr + c + 2 ] = frameArea[ fr + c + 2 ];

							}

						}

					}

				} else { // 32-bit copy

					if ( previousCompleteFrame ) {

						var buffer = new ArrayBuffer( depth * dims.width * dims.height );
						newPatchData = new Uint8Array( buffer );
						newPatchData.set( frame.patch, 0 );
						area = new Uint32Array( buffer );
						newPatchLineWidth = dims.width;

						frameArea = new Uint32Array( previousCompleteFrame.buffer );
						frameArea = frameArea.subarray( dims.top * width + dims.left );

					} else {

						var buffer = new ArrayBuffer( depth * width * height );
						newPatchData = new Uint8Array( buffer );
						area = ( new Uint32Array( buffer ) ).subarray( dims.top * width + dims.left );
						newPatchLineWidth = width;

						frameArea = new Uint32Array( width * height );
						frameArea = frameArea.subarray( dims.top * width + dims.left );

					}

					frameLineWidth = width;
					patchLineWidth = dims.width;

					for ( var fr = 0, pr = 0; pr < dims.height * newPatchLineWidth; fr += frameLineWidth, pr += newPatchLineWidth ) {

						for ( var c = 0; c < patchLineWidth; ++ c ) {

							// copy the existing background only if the pixel is transparent
							if ( 0 === ( area[ pr + c ] & 0xff000000 ) ) { // alpha is 0 or 255

								area[ pr + c ] = frameArea[ fr + c ];

							}

						}

					}

				}

				patch.data = newPatchData;
				patch.partial = true;

			}

			processedPatches.push( patch );

		}

		if ( processedPatches.length !== count ) {

			//console.log("[THREE.AnimatedGifTexture.preparePatchFrames] frames lost");

		}

		return processedPatches;

	},

	prepareFullFrames: function ( frames ) {

		var width = frames[ 0 ].dims.width, height = frames[ 0 ].dims.height, count = frames.length;
		var originalpatchLineWidth = 0;
		var previousCompleteFrame, frame, dims, area, originalPatchArea;
		var processedFrames = [];

		var patch = { data: [], height: 0, left: 0, parial: false, top: 0, width: 0 };

		for ( var i = 0; i < count; ++ i ) {

			frame = frames[ i ];
			dims = frame.dims;
			patch = { data: [], delay: frame.delay, height: height, left: 0, partial: false, top: 0, width: width };

			if ( width === dims.width && height === dims.height ) {

				patch.data = frame.patch;
				patch.partial = false;
				previousCompleteFrame = patch.data;

			} else {

				var buffer = new ArrayBuffer( previousCompleteFrame.buffer.byteLength );
				patch.data = new Uint8Array( buffer );
				patch.data.set( previousCompleteFrame, 0 ); // copy the whole previous image
				area = ( new Uint32Array( buffer ) ).subarray( dims.top * width + dims.left );

				originalPatchArea = new Uint32Array( frame.patch.buffer );
				originalpatchLineWidth = dims.width;

				var greenLine = new Uint32Array( dims.width );
				for ( var c = 0; c < dims.width; ++ c ) {

					greenLine[ c ] = 0x00ff00ff;

				}

				for ( var fr = 0, pr = 0; pr < dims.height * originalpatchLineWidth; fr += width, pr += originalpatchLineWidth ) {

					for ( var c = 0; c < originalpatchLineWidth; ++ c ) {

						// copy the new patch when the pixel is not transparent
						if ( 0 !== ( originalPatchArea[ pr + c ] & 0xff000000 ) ) { // alpha is 0 or 255

							area[ fr + c ] = originalPatchArea[ pr + c ];

						}

					}

					//area.set(greenLine, fr);

				}

				patch.partial = false;
				previousCompleteFrame = patch.data;

			}

			processedFrames.push( patch );

		}

		if ( processedFrames.length !== count ) {

			//console.log("[THREE.AnimatedGifTexture.prepareFullFrames] frames lost");

		}

		return processedFrames;

	}
} );

export { AnimatedGifTexture };
