import { createApp } from 'vue';
import App from './App.vue';
import vueGridLayout from '../packages';

const app = createApp(App);
app.use(vueGridLayout);

app.mount('#app');
