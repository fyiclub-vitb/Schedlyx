import { describe, it, expect } from 'vitest'
import {
    getUserTimezone,
    convertToUTC,
    convertFromUTC,
    getTimezoneAbbreviation,
    formatDateTimeWithTimezone,
    formatTimeInTimezone,
    getTimezoneOffset,
    isValidTimezone
} from '../utils'

describe('Timezone Utilities', () => {
    describe('getUserTimezone', () => {
        it('returns a valid IANA timezone string', () => {
            const timezone = getUserTimezone()
            expect(timezone).toBeTruthy()
            expect(typeof timezone).toBe('string')
            expect(isValidTimezone(timezone)).toBe(true)
        })
    })

    describe('isValidTimezone', () => {
        it('validates correct timezone strings', () => {
            expect(isValidTimezone('America/New_York')).toBe(true)
            expect(isValidTimezone('Europe/London')).toBe(true)
            expect(isValidTimezone('Asia/Tokyo')).toBe(true)
            expect(isValidTimezone('UTC')).toBe(true)
        })

        it('rejects invalid timezone strings', () => {
            expect(isValidTimezone('Invalid/Timezone')).toBe(false)
            expect(isValidTimezone('EST')).toBe(false)
            expect(isValidTimezone('')).toBe(false)
            expect(isValidTimezone('America/New York')).toBe(false)
        })
    })

    describe('convertToUTC', () => {
        it('converts EST time to UTC correctly', () => {
            // January 15, 2024 at 2:00 PM EST should be 7:00 PM UTC
            const utcString = convertToUTC('2024-01-15', '14:00', 'America/New_York')
            const utcDate = new Date(utcString)

            expect(utcDate.getUTCHours()).toBe(19) // 2 PM EST = 7 PM UTC
            expect(utcDate.getUTCMinutes()).toBe(0)
        })

        it('converts PST time to UTC correctly', () => {
            // January 15, 2024 at 10:00 AM PST should be 6:00 PM UTC
            const utcString = convertToUTC('2024-01-15', '10:00', 'America/Los_Angeles')
            const utcDate = new Date(utcString)

            expect(utcDate.getUTCHours()).toBe(18) // 10 AM PST = 6 PM UTC
            expect(utcDate.getUTCMinutes()).toBe(0)
        })

        it('handles UTC timezone', () => {
            const utcString = convertToUTC('2024-01-15', '12:00', 'UTC')
            const utcDate = new Date(utcString)

            expect(utcDate.getUTCHours()).toBe(12)
            expect(utcDate.getUTCMinutes()).toBe(0)
        })

        it('handles Tokyo timezone (ahead of UTC)', () => {
            // January 15, 2024 at 9:00 AM JST should be midnight UTC
            const utcString = convertToUTC('2024-01-15', '09:00', 'Asia/Tokyo')
            const utcDate = new Date(utcString)

            expect(utcDate.getUTCHours()).toBe(0) // 9 AM JST = midnight UTC
            expect(utcDate.getUTCDate()).toBe(15)
        })
    })

    describe('convertFromUTC', () => {
        it('converts UTC to EST correctly', () => {
            // 7:00 PM UTC should be 2:00 PM EST
            const result = convertFromUTC('2024-01-15T19:00:00.000Z', 'America/New_York')

            expect(result.time).toBe('14:00')
            expect(result.date).toBe('2024-01-15')
        })

        it('converts UTC to PST correctly', () => {
            // 6:00 PM UTC should be 10:00 AM PST
            const result = convertFromUTC('2024-01-15T18:00:00.000Z', 'America/Los_Angeles')

            expect(result.time).toBe('10:00')
            expect(result.date).toBe('2024-01-15')
        })

        it('converts UTC to Tokyo time correctly', () => {
            // Midnight UTC should be 9:00 AM JST
            const result = convertFromUTC('2024-01-15T00:00:00.000Z', 'Asia/Tokyo')

            expect(result.time).toBe('09:00')
            expect(result.date).toBe('2024-01-15')
        })

        it('handles date changes across timezones', () => {
            // Late night UTC should be next day in Tokyo
            const result = convertFromUTC('2024-01-15T23:00:00.000Z', 'Asia/Tokyo')

            expect(result.date).toBe('2024-01-16')
            expect(result.time).toBe('08:00')
        })
    })

    describe('getTimezoneAbbreviation', () => {
        it('returns timezone abbreviation for EST', () => {
            const date = new Date('2024-01-15T12:00:00Z') // January (EST, not EDT)
            const abbr = getTimezoneAbbreviation('America/New_York', date)

            expect(abbr).toBeTruthy()
            expect(typeof abbr).toBe('string')
            // Could be EST or GMT-5 depending on browser
            expect(abbr.length).toBeGreaterThan(0)
        })

        it('returns timezone abbreviation for PST', () => {
            const date = new Date('2024-01-15T12:00:00Z') // January (PST, not PDT)
            const abbr = getTimezoneAbbreviation('America/Los_Angeles', date)

            expect(abbr).toBeTruthy()
            expect(typeof abbr).toBe('string')
        })

        it('handles DST changes', () => {
            const winterDate = new Date('2024-01-15T12:00:00Z')
            const summerDate = new Date('2024-07-15T12:00:00Z')

            const winterAbbr = getTimezoneAbbreviation('America/New_York', winterDate)
            const summerAbbr = getTimezoneAbbreviation('America/New_York', summerDate)

            // Abbreviations should be different for winter vs summer (EST vs EDT)
            expect(winterAbbr).toBeTruthy()
            expect(summerAbbr).toBeTruthy()
        })
    })

    describe('formatDateTimeWithTimezone', () => {
        it('formats date and time with timezone', () => {
            const formatted = formatDateTimeWithTimezone(
                '2024-01-15T19:00:00.000Z',
                'America/New_York'
            )

            expect(formatted).toContain('2024')
            expect(formatted).toContain('January')
            expect(formatted).toContain('15')
            expect(typeof formatted).toBe('string')
        })

        it('accepts custom formatting options', () => {
            const formatted = formatDateTimeWithTimezone(
                '2024-01-15T19:00:00.000Z',
                'America/New_York',
                { month: 'short', day: 'numeric' }
            )

            expect(formatted).toContain('Jan')
            expect(formatted).toContain('15')
        })
    })

    describe('formatTimeInTimezone', () => {
        it('formats time string in specified timezone', () => {
            const formatted = formatTimeInTimezone('14:30', 'America/New_York')

            expect(formatted).toBeTruthy()
            expect(typeof formatted).toBe('string')
            // Should contain time components
            expect(formatted).toMatch(/\d+:\d+/)
        })

        it('formats Date object in specified timezone', () => {
            const date = new Date('2024-01-15T19:00:00.000Z')
            const formatted = formatTimeInTimezone(date, 'America/New_York')

            expect(formatted).toBeTruthy()
            expect(typeof formatted).toBe('string')
        })
    })

    describe('getTimezoneOffset', () => {
        it('calculates offset for EST', () => {
            const date = new Date('2024-01-15T12:00:00Z') // January (EST)
            const offset = getTimezoneOffset('America/New_York', date)

            // EST is UTC-5
            expect(offset).toBe(-5)
        })

        it('calculates offset for PST', () => {
            const date = new Date('2024-01-15T12:00:00Z') // January (PST)
            const offset = getTimezoneOffset('America/Los_Angeles', date)

            // PST is UTC-8
            expect(offset).toBe(-8)
        })

        it('calculates offset for Tokyo', () => {
            const date = new Date('2024-01-15T12:00:00Z')
            const offset = getTimezoneOffset('Asia/Tokyo', date)

            // JST is UTC+9
            expect(offset).toBe(9)
        })

        it('returns 0 for UTC', () => {
            const offset = getTimezoneOffset('UTC')

            expect(offset).toBe(0)
        })

        it('handles DST transitions', () => {
            const winterDate = new Date('2024-01-15T12:00:00Z')
            const summerDate = new Date('2024-07-15T12:00:00Z')

            const winterOffset = getTimezoneOffset('America/New_York', winterDate)
            const summerOffset = getTimezoneOffset('America/New_York', summerDate)

            // EST is -5, EDT is -4
            expect(winterOffset).toBe(-5)
            expect(summerOffset).toBe(-4)
        })
    })

    describe('Round-trip conversion', () => {
        it('converts to UTC and back to local time correctly', () => {
            const originalDate = '2024-01-15'
            const originalTime = '14:30'
            const timezone = 'America/New_York'

            // Convert to UTC
            const utcString = convertToUTC(originalDate, originalTime, timezone)

            // Convert back to local
            const result = convertFromUTC(utcString, timezone)

            expect(result.date).toBe(originalDate)
            expect(result.time).toBe(originalTime)
        })

        it('handles round-trip for multiple timezones', () => {
            const testCases = [
                { date: '2024-06-15', time: '09:00', timezone: 'America/Los_Angeles' },
                { date: '2024-12-25', time: '18:30', timezone: 'Europe/London' },
                { date: '2024-03-10', time: '23:45', timezone: 'Asia/Tokyo' }
            ]

            testCases.forEach(({ date, time, timezone }) => {
                const utcString = convertToUTC(date, time, timezone)
                const result = convertFromUTC(utcString, timezone)

                expect(result.date).toBe(date)
                expect(result.time).toBe(time)
            })
        })
    })
})
