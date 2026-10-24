import {defineConfig} from 'vite';
export default defineConfig({esbuild:{jsxFactory:'i18nElement',jsxInject:"import {i18nElement} from '/src/i18n.js'"},server:{proxy:{'/api':'http://127.0.0.1:3000'}}});
