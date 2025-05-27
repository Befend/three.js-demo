// all uniform related data stay here 
import GenColor from "./GenColor";
export const edgeColor1 = new GenColor('#4d9bff');
export const edgeColor2 = new GenColor('#0733ff');

// 溶解贴图参数数据
export const dissolveUniformData = {
  uEdgeColor1: {
    value: edgeColor1.vec3,
  },
  uEdgeColor2: {
    value: edgeColor2.vec3,
  },
  uFreq: {
    value: 0.45,
  },
  uAmp: {
    value: 16.0
  },
  uProgress: {
    value: -7.0
  },
  uEdge: {
    value: 0.8
  }

};
