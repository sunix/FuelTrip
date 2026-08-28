import { registerSW } from 'virtual:pwa-register';
import { initializeApp } from './ui/app';
import './ui/styles.css';

registerSW({ immediate: true });

const rootElement = document.querySelector<HTMLDivElement>('#app');
if (!rootElement) {
  throw new Error('Unable to find #app element.');
}

initializeApp(rootElement);
