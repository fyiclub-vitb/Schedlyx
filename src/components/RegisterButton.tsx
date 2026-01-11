import { useState } from 'react';

interface Props {
  eventId: string;
}

export default function RegisterButton({ eventId }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, email })
    });

    const result = await response.json();
    alert(result.error ? 'Registration failed' : '✅ Registered!');
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleRegister} className="space-y-4">
        <input
          type="email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-4 border rounded-xl focus:ring-2"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full bg-blue-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-700"
        >
          {loading ? '⏳ Registering...' : '🎫 Register Now'}
        </button>
      </form>
    </div>
  );
}
