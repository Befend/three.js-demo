<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import router from '@/router'
const routes = computed(() => router.options.routes)
</script>

<template>
  <div class="app-container">
    <nav class="left-panel">
      <RouterLink v-for="(item, index) in routes" :to="item.path" :key="index">
        <span>{{ item.name }}</span>
      </RouterLink>
    </nav>
    <div class="right-panel">
      <RouterView />
    </div>
  </div>
</template>

<style lang="less" scoped>
.app-container {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: row;
  overflow: hidden;
  .left-panel {
    display: flex;
    width: 160px;
    height: 100%;
    font-size: 14px;
    margin-top: 0;
    flex-direction: column;
    border-right: 1px solid var(--color-border);
    box-sizing: border-box;
    a {
      width: 100%;
      padding: 4px 12px;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
      text-decoration: none;
      &.router-link-exact-active {
        color: #00bd7e;
        background-color: rgba(0, 189, 126, 0.2);
      }
      &:hover {
        color: rgb(0, 189, 126);
        background-color: rgba(0, 189, 126, 0.2);
      }
      &:last-child {
        border: 0;
      }
    }
  }
  .right-panel {
    position: relative;
    width: calc(100% - 160px);
    height: 100%;
  }
}
</style>
