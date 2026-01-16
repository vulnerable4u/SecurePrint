import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

