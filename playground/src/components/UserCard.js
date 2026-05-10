import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function UserCard({ name, email, role }) {
    return (_jsxs("div", { style: {
            padding: 16,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            background: '#fff',
        }, children: [_jsx(Avatar, { name: name }), _jsxs("div", { style: { marginTop: 8 }, children: [_jsx("div", { style: { fontWeight: 600, color: '#1e293b' }, children: name }), _jsx("div", { style: { fontSize: 13, color: '#64748b' }, children: email }), _jsx(Badge, { label: role })] })] }));
}
function Avatar({ name }) {
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('');
    return (_jsx("div", { style: {
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#dbeafe',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 14,
        }, children: initials }));
}
function Badge({ label }) {
    return (_jsx("span", { style: {
            display: 'inline-block',
            marginTop: 6,
            padding: '2px 8px',
            borderRadius: 9999,
            background: '#f1f5f9',
            color: '#475569',
            fontSize: 12,
        }, children: label }));
}
