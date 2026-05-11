import { createApp } from 'vue'
import './style.css'
import '@mdi/font/css/materialdesignicons.css'
import { supabase } from './utils/supabase'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.provide('supabase', supabase)
app.mount('#app')
