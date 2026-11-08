import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabaseClient'
import { formatPrice } from '../lib/utils'

interface HostAnalyticsProps {
  spaceIds: string[]
}

interface BookingRow {
  space_id: string
  check_in: string
  check_out: string
  status: 'confirmed' | 'cancelled' | 'pending_payment'
  total_price: number | null
}

function datesBetween(start: Date, end: Date): string[] {
  const days: string[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (cursor < last) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days.length > 0 ? days : [cursor.toISOString().slice(0, 10)]
}

function ChartTooltip({ active, payload, valueFormatter }: any) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]
  return (
    <div className="glass-modal rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-ink">{valueFormatter ? valueFormatter(point.value) : point.value}</p>
      <p className="text-[10px] text-ink-faint">{point.payload.label}</p>
    </div>
  )
}

export function HostAnalytics({ spaceIds }: HostAnalyticsProps) {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const spaceIdsKey = spaceIds.join(',')

  useEffect(() => {
    if (spaceIds.length === 0) {
      setBookings([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    supabase
      .from('bookings')
      .select('space_id, check_in, check_out, status, total_price')
      .in('space_id', spaceIds)
      .then(({ data }) => {
        if (!active) return
        setBookings((data as BookingRow[]) ?? [])
        setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceIdsKey])

  const accent = theme === 'light' ? '#4338ca' : '#a5b4fc'
  const gridColor = theme === 'light' ? 'rgba(23,21,42,0.08)' : 'rgba(255,255,255,0.08)'
  const tickColor = theme === 'light' ? '#78748c' : '#6b7280'

  const monthlyRevenue = useMemo(() => {
    const now = new Date()
    const months: { key: string; label: string; revenue: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const label = new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(d)
      months.push({ key, label: label.replace('.', ''), revenue: 0 })
    }
    for (const b of bookings) {
      if (b.status !== 'confirmed' || !b.total_price) continue
      const d = new Date(b.check_in)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const bucket = months.find((m) => m.key === key)
      if (bucket) bucket.revenue += b.total_price
    }
    return months
  }, [bookings, i18n.language])

  const weekdayDemand = useMemo(() => {
    const reference = new Date(2024, 0, 1) // a Monday
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(reference)
      d.setDate(d.getDate() + i)
      return {
        index: i,
        label: new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(d).replace('.', ''),
        bookings: 0,
      }
    })
    for (const b of bookings) {
      if (b.status !== 'confirmed') continue
      const d = new Date(b.check_in)
      const jsDay = d.getDay() // 0 = Sunday
      const mondayFirstIndex = (jsDay + 6) % 7
      days[mondayFirstIndex].bookings += 1
    }
    return days
  }, [bookings, i18n.language])

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${prevMonthDate.getMonth()}`

    let revenueThisMonth = 0
    let revenuePrevMonth = 0
    let confirmedThisMonth = 0
    let cancelledCount = 0
    let totalCount = 0
    const bookedDayKeys = new Set<string>()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

    for (const b of bookings) {
      totalCount += 1
      if (b.status === 'cancelled') {
        cancelledCount += 1
        continue
      }
      if (b.status !== 'confirmed') continue

      const checkInDate = new Date(b.check_in)
      const key = `${checkInDate.getFullYear()}-${checkInDate.getMonth()}`
      if (key === thisMonthKey) {
        revenueThisMonth += b.total_price ?? 0
        confirmedThisMonth += 1
      } else if (key === prevMonthKey) {
        revenuePrevMonth += b.total_price ?? 0
      }

      for (const dayStr of datesBetween(new Date(b.check_in), new Date(b.check_out))) {
        const [y, m] = dayStr.split('-').map(Number)
        if (y === now.getFullYear() && m - 1 === now.getMonth()) {
          bookedDayKeys.add(`${b.space_id}|${dayStr}`)
        }
      }
    }

    const revenueDelta = revenuePrevMonth > 0 ? ((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100 : null
    const occupancyRate = spaceIds.length > 0 ? (bookedDayKeys.size / (daysInMonth * spaceIds.length)) * 100 : 0
    const cancellationRate = totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0

    return { revenueThisMonth, revenueDelta, confirmedThisMonth, occupancyRate, cancellationRate }
  }, [bookings, spaceIds.length])

  if (loading) return null
  if (bookings.length === 0) return null

  return (
    <div className="w-full space-y-4">
      <h3 className="text-lg font-bold text-ink">{t('hostAnalytics.title')}</h3>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="glass-card space-y-1 rounded-2xl p-4">
          <p className="text-[11px] font-medium text-ink-faint">{t('hostAnalytics.revenueThisMonth')}</p>
          <p className="text-xl font-extrabold text-ink">{formatPrice(stats.revenueThisMonth)}</p>
          {stats.revenueDelta != null && (
            <p className={`text-[11px] font-semibold ${stats.revenueDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.revenueDelta >= 0 ? '+' : ''}
              {stats.revenueDelta.toFixed(0)}% {t('hostAnalytics.vsLastMonth')}
            </p>
          )}
        </div>
        <div className="glass-card space-y-1 rounded-2xl p-4">
          <p className="text-[11px] font-medium text-ink-faint">{t('hostAnalytics.confirmedBookings')}</p>
          <p className="text-xl font-extrabold text-ink">{stats.confirmedThisMonth}</p>
        </div>
        <div className="glass-card space-y-1 rounded-2xl p-4">
          <p className="text-[11px] font-medium text-ink-faint">{t('hostAnalytics.occupancyRate')}</p>
          <p className="text-xl font-extrabold text-ink">{stats.occupancyRate.toFixed(0)}%</p>
        </div>
        <div className="glass-card space-y-1 rounded-2xl p-4">
          <p className="text-[11px] font-medium text-ink-faint">{t('hostAnalytics.cancellationRate')}</p>
          <p className="text-xl font-extrabold text-ink">{stats.cancellationRate.toFixed(0)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-4">
          <p className="mb-2 text-xs font-semibold text-ink-muted">{t('hostAnalytics.revenueChartTitle')}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart key={theme} data={monthlyRevenue} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={gridColor} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: tickColor, fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: gridColor }}
                content={<ChartTooltip valueFormatter={(v: number) => formatPrice(v)} />}
              />
              <Bar dataKey="revenue" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={24}>
                <LabelList
                  dataKey="revenue"
                  position="top"
                  formatter={(v: unknown) => (typeof v === 'number' && v > 0 ? formatPrice(v) : '')}
                  fill={tickColor}
                  style={{ fontSize: 10 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <p className="mb-2 text-xs font-semibold text-ink-muted">{t('hostAnalytics.demandChartTitle')}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart key={theme} data={weekdayDemand} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={gridColor} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: tickColor, fontSize: 11 }}
              />
              <Tooltip cursor={{ fill: gridColor }} content={<ChartTooltip />} />
              <Bar dataKey="bookings" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={24}>
                <LabelList
                  dataKey="bookings"
                  position="top"
                  formatter={(v: unknown) => (typeof v === 'number' && v > 0 ? String(v) : '')}
                  fill={tickColor}
                  style={{ fontSize: 10 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
