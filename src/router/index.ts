import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import SpaceHomeView from '@/views/SpaceHomeView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/:space/',
      name: 'space',
      component: SpaceHomeView,
    }
  ],
});

export default router;
