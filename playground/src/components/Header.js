import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Header({ title }) {
    return (_jsxs("header", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { fontSize: 28, fontWeight: 700, color: '#1e293b' }, children: title }), _jsx("p", { style: { color: '#64748b', marginTop: 4 }, children: "A demo app for testing the Inspekt inspector" })] }));
}
