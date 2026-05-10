import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { UserCard } from './components/UserCard';
export function App() {
    return (_jsxs("div", { style: { maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }, children: [_jsx(Header, { title: "Inspekt Playground" }), _jsx(SearchBar, {}), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }, children: [_jsx(UserCard, { name: "Alice Johnson", email: "alice@example.com", role: "Developer" }), _jsx(UserCard, { name: "Bob Smith", email: "bob@example.com", role: "Designer" }), _jsx(UserCard, { name: "Carol Williams", email: "carol@example.com", role: "Tech Lead" }), _jsx(UserCard, { name: "Dave Brown", email: "dave@example.com", role: "QA Engineer" })] }), _jsxs("footer", { style: { marginTop: 48, padding: '16px 0', borderTop: '1px solid #e5e7eb', color: '#6b7280', fontSize: 14 }, children: [_jsx("p", { children: "Ctrl+Alt+Click any element to inspect it. Shift+Alt+Click to open in editor." }), _jsx("p", { children: "Ctrl+Alt+I to toggle Inspekt. Ctrl+Alt+O to toggle overlay badges." })] })] }));
}
