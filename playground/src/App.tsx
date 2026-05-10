import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { UserCard } from './components/UserCard';

export function App() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <Header title="Inspekt Playground" />
      <SearchBar />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <UserCard name="Alice Johnson" email="alice@example.com" role="Developer" />
        <UserCard name="Bob Smith" email="bob@example.com" role="Designer" />
        <UserCard name="Carol Williams" email="carol@example.com" role="Tech Lead" />
        <UserCard name="Dave Brown" email="dave@example.com" role="QA Engineer" />
      </div>
      <footer style={{ marginTop: 48, padding: '16px 0', borderTop: '1px solid #e5e7eb', color: '#6b7280', fontSize: 14 }}>
        <p>Ctrl+Alt+Click any element to inspect it. Shift+Alt+Click to open in editor.</p>
        <p>Ctrl+Alt+I to toggle Inspekt. Ctrl+Alt+O to toggle overlay badges.</p>
      </footer>
    </div>
  );
}
