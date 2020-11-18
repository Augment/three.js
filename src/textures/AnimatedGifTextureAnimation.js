/**
 * @author augment
 */

function AnimatedGifTextureAnimationTicker() {

	var subscriptions = [];

	function update( time ) {

		subscriptions.forEach( function ( animation ) {

			animation.update( time );

		} );

		if ( 0 !== subscriptions.length ) {

			window.requestAnimationFrame( update );

		}

	}

	this.subscribe = function ( animatedGifTexture ) {

		if ( - 1 === subscriptions.findIndex( function ( elem ) {

			return ( elem === animatedGifTexture );

		} ) ) {

			subscriptions.push( animatedGifTexture );

			if ( 1 === subscriptions.length ) {

				window.requestAnimationFrame( update );

			}

		}

	};

	this.unsubscribe = function ( animatedGifTexture ) {

		var index = subscriptions.findIndex( function ( elem ) {

			return ( elem === animatedGifTexture );

		} );

		if ( - 1 !== index ) {

			subscriptions.splice( index, 0 );

		}

	};

}

function AnimatedGifTextureAnimation( frames, updateCallback ) {

	this.frames = frames;

	this.startTime = null;
	this.playing = false;
	this.currentFrameIndex = 0;
	this.timeline = [];
	this.duration = 0;
	this.initialized = false;

	this.onUpdateCallback = updateCallback;

	if ( frames ) {

		this.timeline = frames.map( ( function () {

			var sum = 0.0;
			return function ( entry ) {

				sum += entry.delay;
				return sum;

			};

		} )() );

		this.duration = this.timeline[ this.timeline.length - 1 ];

	}

}

Object.assign( AnimatedGifTextureAnimation.prototype, {

	start: function () {

		if ( 1 === this.frames.length )
			return;

		this.startTime = window.performance.now();
		this.playing = true;
		this.currentFrameIndex = 0;

		AnimatedGifTextureAnimation.Ticker.subscribe( this );

	},

	stop: function () {

		this.playing = false;
		this.initialized = false;
		AnimatedGifTextureAnimation.Ticker.unsubscribe( this );

	},

	update: function ( time ) {

		if ( 1 === this.frames.length )
			this.currentFrameIndex = 0;

		if ( this.playing && this.timeline ) {

			if ( ! this.initialized ) {

				this.initialized = true;
				this.startTime = time;

			}

			var animationTime = ( time - this.startTime ) % this.duration;
			var t = this.timeline[ this.currentFrameIndex ];

			if ( animationTime < t ) {

				this.currentFrameIndex = 0;
				t = this.timeline[ this.currentFrameIndex ];

			}

			while ( animationTime > t ) {

				t = this.timeline[ ++ this.currentFrameIndex ];

			}

		}

		this.onUpdateCallback();

	},

	getFrame: function () {

		return this.frames[ this.currentFrameIndex ];

	}
} );

AnimatedGifTextureAnimation.Ticker = new AnimatedGifTextureAnimationTicker();

export { AnimatedGifTextureAnimation };
