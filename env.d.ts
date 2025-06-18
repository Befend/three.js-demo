/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}

// global.d.ts
declare module '*.exr' {
  const content: string
  export default content
}

declare module '*.glsl' {
  const value: string
  export default value
}
