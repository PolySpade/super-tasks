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

  return (
    <div className="weekly-chart">
      <div className="weekly-chart-label">This Week by List</div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
        >
          <XAxis
            type="number"
            tick={{ fill: '#8888a8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#8888a8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={80}
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
