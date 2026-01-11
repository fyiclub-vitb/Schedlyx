'use client';
import { useState } from 'react';

export default function RegisterButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, email })
    });

    const result = await response.json();
    
    if (result.error) {
      alert('Registration failed: ' + result.error.message);
    } else {
      alert('✅ Registered successfully! Check your email.');
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleRegister} className="space-y-4">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={loading || !email}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-2xl text-xl font-bold hover:from-blue-700 hover:to-indigo-700 shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50"
        >
          {loading ? '⏳ Registering...' : '🎫 Register Now'}
        </button>
      </form>
    </div>
  );
}
