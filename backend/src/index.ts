import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { format } from 'date-fns'
import cron from 'node-cron'
import { prisma } from './prisma'
import { runEndOfDay } from './eod'

const app = express()
const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

const TaskStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED'])

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: TaskStatusEnum.default('PENDING').optional(),
})

const updateTaskSchema = createTaskSchema.partial()

function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/tasks', async (req, res) => {
  try {
    const rawDate = (req.query.date as string | undefined) ?? toDateKey(new Date())
    const dateKey = rawDate

    const tasks = await prisma.task.findMany({
      where: { dateKey },
      orderBy: { createdAt: 'desc' },
    })

    res.json(tasks)
  } catch (err) {
    console.error('GET /tasks failed', err)
    res.status(500).json({ error: 'Failed to load tasks' })
  }
})

app.post('/tasks', async (req, res) => {
  const parse = createTaskSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ errors: parse.error.flatten().fieldErrors })
  }

  const { title, description, status = 'PENDING' } = parse.data
  const now = new Date()
  const dateKey = toDateKey(now)

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status,
      createdAt: now,
      updatedAt: now,
      completedAt: status === 'COMPLETED' ? now : null,
      dateKey,
    },
  })

  res.status(201).json(task)
})

app.put('/tasks/:id', async (req, res) => {
  const id = req.params.id
  const parse = updateTaskSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ errors: parse.error.flatten().fieldErrors })
  }

  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' })
  }

  const now = new Date()
  const data = parse.data
  let completedAt = existing.completedAt

  if (data.status === 'COMPLETED' && !existing.completedAt) {
    completedAt = now
  } else if (data.status && (data.status === 'PENDING' || data.status === 'IN_PROGRESS')) {
    completedAt = null
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      title: data.title ?? existing.title,
      description: data.description ?? existing.description,
      status: (data.status as any) ?? existing.status,
      updatedAt: now,
      completedAt,
    },
  })

  res.json(updated)
})

app.delete('/tasks/:id', async (req, res) => {
  const id = req.params.id
  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' })
  }

  await prisma.task.delete({ where: { id } })
  res.status(204).send()
})

app.get('/summaries/:dateKey', async (req, res) => {
  const { dateKey } = req.params
  const summary = await prisma.dailySummary.findUnique({ where: { dateKey } })
  if (!summary) {
    return res.status(404).json({ error: 'Summary not found' })
  }
  res.json(summary)
})

app.get('/notifications', async (req, res) => {
  const dateKey = (req.query.date as string | undefined) ?? toDateKey(new Date())
  const notifications = await prisma.dailySummaryNotification.findMany({
    where: { dateKey },
    orderBy: { sentAt: 'desc' },
  })
  res.json(notifications)
})

app.get('/history/tasks', async (req, res) => {
  const dateKey = (req.query.date as string | undefined) ?? toDateKey(new Date())
  const tasks = await prisma.archivedTask.findMany({
    where: { dateKey },
    orderBy: { createdAt: 'desc' },
  })
  res.json(tasks)
})

app.get('/history/dates', async (_req, res) => {
  const archivedDates = await prisma.archivedTask.findMany({
    distinct: ['dateKey'],
    select: { dateKey: true },
    orderBy: { dateKey: 'desc' },
  })
  const summaryDates = await prisma.dailySummary.findMany({
    distinct: ['dateKey'],
    select: { dateKey: true },
    orderBy: { dateKey: 'desc' },
  })
  const set = new Set<string>([...archivedDates, ...summaryDates].map((r) => r.dateKey))
  res.json(Array.from(set).sort((a, b) => (a < b ? 1 : -1)))
})

app.post('/eod/run', async (req, res) => {
  const dateKey = (req.query.date as string | undefined) || undefined
  try {
    const result = await runEndOfDay(dateKey)
    res.json({ ok: true, ...result })
  } catch (err) {
    console.error('EOD failed', err)
    res.status(500).json({ error: 'EOD execution failed' })
  }
})

cron.schedule(
  '0 0 * * *',
  () => {
    runEndOfDay().catch((err) => {
      console.error('Scheduled EOD failed', err)
    })
  },
  { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
)

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`)
})

