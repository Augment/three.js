export default /* glsl */`
#ifdef USE_MAP

	vec4 texelColor = texture2D( map, vUv );

	if (opacityRenderingMode!=0) {
		if ((opacityRenderingMode==1 && texelColor.a<0.95) || (opacityRenderingMode==2 && texelColor.a>0.989)) {
			discard;
		}
	}

	texelColor = mapTexelToLinear( texelColor );
	diffuseColor *= texelColor;

#endif
`;
