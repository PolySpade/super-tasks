import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'

interface WeeklyChartProps {
  data: { name: string; count: number }[]
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  if (data.length === 0) {
    return (
      <div className="weekly-chart">
        <div className="weekly-chart-empty">No tasks due this week</div>
      </div>
    )
  }

  const chartHeight = Math.max(100, data.length * 32 + 16)

  return (
    <div className="weekly-chart">
      <div className="weekly-chart-label">Pending by List</div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fill: '#c0c0d0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#e0e0ec', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={110}
            tickFormatter={(value: string) => value.length > 16 ? value.slice(0, 15) + '…' : value}
          />
          <Bar
            dataKey="count"
            fill="#4a7dff"
            radius={[0, 4, 4, 0]}
            barSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
