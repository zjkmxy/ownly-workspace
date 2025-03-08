import { createApp } from 'vue';
import App from '@/App.vue';
import router from '@/router';

import '@/assets/main.scss';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import 'vue3-toastify/dist/index.css';

// Initialize browser services
import { IDBStatsDb } from '@/services/database/stats_browser';
import { IDBProjDb } from './services/database/proj_db_browser';

globalThis._o = {
  stats: new IDBStatsDb(),
  ProjDb: IDBProjDb,
};

// Initialize Vue app
const app = createApp(App);
app.use(router);
app.mount('#app');
