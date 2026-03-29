import { useState } from 'react';

export function SearchBar() {
  const [query, setQuery] = useState('');

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        placeholder="Search components..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: 8,
          fontSize: 14,
          outline: 'none',
        }}
      />
      <button
        style={{
          padding: '8px 16px',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Search
      </button>
    </div>
  );
}
