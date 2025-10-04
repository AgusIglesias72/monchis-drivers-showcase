"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

const data = [
  { name: "Ene", total: 12 },
  { name: "Feb", total: 18 },
  { name: "Mar", total: 24 },
  { name: "Abr", total: 15 },
  { name: "May", total: 28 },
  { name: "Jun", total: 32 },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} />
        <YAxis stroke="#888888" fontSize={12} />
        <Bar dataKey="total" fill="#E31D39" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}