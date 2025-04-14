<template>
  <div ref="canvasRef" id="canvas"></div>
  <div id="fps"></div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useGalaxy } from '@/hooks/useGalaxy'
const { initGalaxy, destroy } = useGalaxy()
const canvasRef: any = ref()

onMounted(() => {
  initGalaxy(canvasRef.value)
})
onBeforeUnmount(() => {
  destroy()
})
</script>

<style>
@media (min-width: 1024px) {
  #canvas {
    width: 100%;
    height: 100%;
  }
  #fps {
    position: absolute;
    top: 12px;
    left: 12px;
    width: max-content;
    color: #fff;
    font-size: 20px;
    font-weight: bold;
    & > div {
      position: absolute !important;
    }
  }
}
</style>
