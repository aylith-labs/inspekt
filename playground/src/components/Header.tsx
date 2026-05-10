interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{title}</h1>
      <p style={{ color: '#64748b', marginTop: 4 }}>
        A demo app for testing the Inspekt inspector
      </p>
    </header>
  );
}
