interface UserCardProps {
  name: string;
  email: string;
  role: string;
}

export function UserCard({ name, email, role }: UserCardProps) {
  return (
    <div
      style={{
        padding: 16,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        background: '#fff',
      }}
    >
      <Avatar name={name} />
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>{name}</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>{email}</div>
        <Badge label={role} />
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('');
  return (
    <div
      style={{
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
      }}
    >
      {initials}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        marginTop: 6,
        padding: '2px 8px',
        borderRadius: 9999,
        background: '#f1f5f9',
        color: '#475569',
        fontSize: 12,
      }}
    >
      {label}
    </span>
  );
}
