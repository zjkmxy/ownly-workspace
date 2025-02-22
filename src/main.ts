import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import './assets/main.scss';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import 'vue3-toastify/dist/index.css';

const app = createApp(App);

app.use(router);

app.mount('#app');
