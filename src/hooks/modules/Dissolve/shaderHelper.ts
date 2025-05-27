import * as THREE from 'three';

export function setupUniforms(shader: THREE.WebGLProgramParametersWithUniforms, uniforms: { [uniform: string]: THREE.IUniform<any> }) {
    const keys = Object.keys(uniforms);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        shader.uniforms[key] = uniforms[key];
    }
}

export function setupShaderSnippets
    (shader: THREE.WebGLProgramParametersWithUniforms,
        vertexGlobal: string,
        vertexMain: string,
        fragmentGlobal: string,
        fragmentMain: string) {

    // vertex shader outside main
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
            ${vertexGlobal}
        `);

    // vertex shader inside main
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            ${vertexMain}
        `);
    // fragment shader outside main
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
            ${fragmentGlobal}
        `);
    // fragment shader inside main
    shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
            ${fragmentMain}
        `);
}
