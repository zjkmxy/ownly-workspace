import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import './assets/main.scss';
import 'vue-toast-notification/dist/theme-default.css';

const app = createApp(App);

app.use(router);

app.mount('#app');
