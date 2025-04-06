<template>
  <div ref="canvasRef" id="canvas"></div>
  <div id="fps"></div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useBubble } from '@/hooks/useBubble'
const { initBubble } = useBubble()
const canvasRef: any = ref()

onMounted(() => {
  initBubble(canvasRef.value)
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
