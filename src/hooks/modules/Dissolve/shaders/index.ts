// shader snippet for edge 
export const vertexGlobal = `
    varying vec3 vPos;
`;

export const vertexMain = `
    vPos = position;
`;
export const fragmentGlobal = `
    varying vec3 vPos;
    uniform vec3 uEdgeColor1;
    uniform vec3 uEdgeColor2;
    uniform float uFreq;
    uniform float uAmp;
    uniform float uProgress;
    uniform float uEdge;
`;
export const fragmentMain = `
    float noise = cnoise(vPos* uFreq)*uAmp;

    if(noise < uProgress) discard;

    float edgeWidth = uProgress + uEdge;
    if(noise > uProgress && noise < edgeWidth){
        gl_FragColor = vec4(uEdgeColor1,noise);
    }
    gl_FragColor = vec4(gl_FragColor.xyz,1.0);
`;
