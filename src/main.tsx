import { createRoot } from 'react-dom/client';
import { App } from './App';
import '../css/style.css';

const root = document.getElementById('root');
if (!root) throw new Error('Echo Noteの表示先が見つかりません。');
createRoot(root).render(<App />);
