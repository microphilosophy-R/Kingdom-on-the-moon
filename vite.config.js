import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    base: '/Kingdom-on-the-moon/',
    plugins: [react()],
});
