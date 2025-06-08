import { createRouter, createWebHistory } from 'vue-router'
import pageList from './pageList'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: pageList
})

export default router
