import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/api/client'
import { downloadCsv, summary } from '@/api/reports'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { money } from '@/lib/format'

const Stat = ({ label, value }) => (
  <Card className="gap-1 py-4"><CardContent><p className="text-sm text-muted-foreground">{label}</p><p className="font-serif text-2xl font-semibold">{value}</p></CardContent></Card>
)

export default function Reports() {
  const [range, setRange] = useState({ from: '', to: '' })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    summary(range.from, range.to)
      .then((d) => { if (alive) { setData(d); setError('') } })
      .catch((e) => { if (alive) setError(errorMessage(e)) })
    return () => { alive = false }
  }, [range])

  const download = (kind) => downloadCsv(kind, range.from, range.to).catch((e) => toast.error(errorMessage(e)))
  const invalid = range.from && range.to && range.from > range.to

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1"><Label htmlFor="r-from">Desde (llegada)</Label>
          <Input id="r-from" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
        <div className="grid gap-1"><Label htmlFor="r-to">Hasta</Label>
          <Input id="r-to" type="date" value={range.to} aria-invalid={Boolean(invalid)} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
        <Button variant="outline" onClick={() => download('bookings')} disabled={invalid}><Download /> Reservas CSV</Button>
        <Button variant="outline" onClick={() => download('guests')} disabled={invalid}><Download /> Clientes CSV</Button>
      </div>
      {invalid && <p role="alert" className="text-sm text-destructive">El inicio no puede ser posterior al fin.</p>}
      {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!data && !error && <Skeleton className="h-40 w-full" />}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Reservas (sin canceladas)" value={data.totals.bookings} />
            <Stat label="Turistas atendidos" value={data.totals.tourists} />
            <Stat label="Ingresos proyectados" value={money(data.totals.projected_revenue)} />
          </div>
          <p className="text-xs text-muted-foreground">Los ingresos son proyectados (precio × días y personas), no contables.</p>
          {data.by_month.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sin datos en el periodo.</p> : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Por mes</CardTitle></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Mes</TableHead><TableHead>Reservas</TableHead><TableHead>Turistas</TableHead><TableHead>Ingresos</TableHead></TableRow></TableHeader>
                  <TableBody>{data.by_month.map((m) => <TableRow key={m.month}><TableCell>{m.month}</TableCell><TableCell>{m.bookings}</TableCell><TableCell>{m.tourists}</TableCell><TableCell>{money(m.revenue)}</TableCell></TableRow>)}</TableBody></Table>
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Por oferta</CardTitle></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Oferta</TableHead><TableHead>Reservas</TableHead><TableHead>Turistas</TableHead><TableHead>Ingresos</TableHead></TableRow></TableHeader>
                  <TableBody>{data.by_listing.map((l) => <TableRow key={l.listing_id}><TableCell className="max-w-48 truncate">{l.title}</TableCell><TableCell>{l.bookings}</TableCell><TableCell>{l.tourists}</TableCell><TableCell>{money(l.revenue)}</TableCell></TableRow>)}</TableBody></Table>
              </CardContent></Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
