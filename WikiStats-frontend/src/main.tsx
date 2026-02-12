import { render } from 'preact';
import { App } from './App';
import './style.css';

const app = document.getElementById('app');

if (!app) {
  throw new Error('Missing #app mount element');
}

render(<App />, app);
