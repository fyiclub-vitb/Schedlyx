// pages/event/[slug].tsx
import { GetServerSideProps } from 'next';

export default function EventPage({ event, error }: { event: any, error: string | null }) {
  // Show error if fetch failed
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-red-600">Event Not Found</h1>
        <p className="mt-4 text-gray-600">{error}</p>
      </div>
    );
  }

  // Show event if found
  if (event) {
    return (
      <div className="max-w-4xl mx-auto p-8 py-20">
        <h1 className="text-4xl font-bold mb-6">{event.title}</h1>
        <p className="text-xl text-gray-600 mb-12">{event.description || 'No description'}</p>
        <div className="bg-blue-50 p-8 rounded-2xl mb-12">
          <h2 className="text-3xl font-semibold">📅 {new Date(event.date).toLocaleString()}</h2>
        </div>
        <div>Registration form goes here</div>
      </div>
    );
  }

  return <div className="p-8">Loading event...</div>;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  try {
    // Your existing Supabase URL/env vars
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // DEBUG: Check if env vars exist
    if (!supabaseUrl || !supabaseKey) {
      return {
        props: { 
          event: null, 
          error: 'Missing Supabase config (check .env.local)' 
        }
      };
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/events?slug=eq.${params?.slug}&is_public=eq.true`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    console.log('Event fetch status:', response.status); // DEBUG

    if (response.ok) {
      const events = await response.json();
      return {
        props: { 
          event: events[0] || null, 
          error: null 
        }
      };
    }

    return {
      props: { 
        event: null, 
        error: `Failed to fetch: ${response.status}` 
      }
    };
  } catch (error) {
    console.error('Event page error:', error);
    return {
      props: { 
        event: null, 
        error: 'Failed to load event' 
      }
    };
  }
};
