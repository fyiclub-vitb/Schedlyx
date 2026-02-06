
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { CalendarService } from '../lib/calendar'
import { supabase } from '../lib/supabase'
import { CalendarDaysIcon, ArrowPathIcon, XCircleIcon } from '@heroicons/react/24/outline'

export function IntegrationsPage() {
    const { user } = useAuth()
    const [integrations, setIntegrations] = useState<any[]>([])

    useEffect(() => {
        fetchIntegrations()

        const handleCallback = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.provider_token && user) {
                // Logic to save token would go here if needed
            }
        }

        handleCallback()
    }, [user])

    const fetchIntegrations = async () => {
        if (!user) return
        try {
            const { data, error } = await supabase
                .from('calendar_integrations')
                .select('*')
                .eq('user_id', user.id)

            if (error) throw error
            setIntegrations(data || [])
        } catch (err) {
            console.error('Error fetching integrations:', err)
        }
    }

    const handleConnect = async (provider: 'google' | 'outlook') => {
        try {
            await CalendarService.connectCalendar(provider)
        } catch (err) {
            console.error(`Failed to connect ${provider}:`, err)
            alert(`Failed to connect ${provider}`)
        }
    }

    const handleDisconnect = async (id: string) => {
        try {
            const { error } = await supabase
                .from('calendar_integrations')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchIntegrations()
        } catch (err) {
            console.error('Failed to disconnect:', err)
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                        Integrations
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Connect your calendars to sync availability and prevent double bookings.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Google Calendar Card */}
                <IntegrationCard
                    title="Google Calendar"
                    description="Sync bookings to your Google Calendar and check for conflicts."
                    icon="/images/google-calendar.svg"
                    connected={integrations.some((i: any) => i.provider === 'google')}
                    onConnect={() => handleConnect('google')}
                    onDisconnect={() => handleDisconnect(integrations.find((i: any) => i.provider === 'google')?.id)}
                    lastSync={integrations.find((i: any) => i.provider === 'google')?.last_sync_at}
                />

                {/* Outlook Calendar Card */}
                <IntegrationCard
                    title="Outlook Calendar"
                    description="Connect your Outlook calendar for two-way synchronization."
                    icon="/images/outlook-calendar.svg"
                    connected={integrations.some((i: any) => i.provider === 'outlook')}
                    onConnect={() => handleConnect('outlook')}
                    onDisconnect={() => handleDisconnect(integrations.find((i: any) => i.provider === 'outlook')?.id)}
                    lastSync={integrations.find((i: any) => i.provider === 'outlook')?.last_sync_at}
                />
            </div>
        </div>
    )
}

function IntegrationCard({
    title,
    description,
    icon,
    connected,
    onConnect,
    onDisconnect,
    lastSync
}: any) {
    return (
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-6">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <img
                            src={icon}
                            alt={title}
                            className="h-10 w-10"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                            }}
                        />
                        <CalendarDaysIcon className="h-10 w-10 text-gray-400 hidden fallback-icon" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                        {connected && (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                Connected
                            </span>
                        )}
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-sm text-gray-500">{description}</p>
                </div>

                {connected && lastSync && (
                    <div className="mt-2 text-xs text-gray-400">
                        Last synced: {new Date(lastSync).toLocaleString()}
                    </div>
                )}

            </div>
            <div className="bg-gray-50 px-6 py-4">
                <div className="text-sm">
                    {connected ? (
                        <button
                            onClick={onDisconnect}
                            className="font-medium text-red-600 hover:text-red-500 flex items-center"
                        >
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Disconnect
                        </button>
                    ) : (
                        <button
                            onClick={onConnect}
                            className="font-medium text-primary-600 hover:text-primary-500 flex items-center"
                        >
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                            Connect
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
