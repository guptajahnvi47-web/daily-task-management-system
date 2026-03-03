"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const date_fns_1 = require("date-fns");
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("./prisma");
const eod_1 = require("./eod");
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const TaskStatusEnum = zod_1.z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED']);
const createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    description: zod_1.z.string().optional(),
    status: TaskStatusEnum.default('PENDING').optional(),
});
const updateTaskSchema = createTaskSchema.partial();
function toDateKey(date) {
    return (0, date_fns_1.format)(date, 'yyyy-MM-dd');
}
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/tasks', async (req, res) => {
    try {
        const rawDate = req.query.date ?? toDateKey(new Date());
        const dateKey = rawDate;
        const tasks = await prisma_1.prisma.task.findMany({
            where: { dateKey },
            orderBy: { createdAt: 'desc' },
        });
        res.json(tasks);
    }
    catch (err) {
        console.error('GET /tasks failed', err);
        res.status(500).json({ error: 'Failed to load tasks' });
    }
});
app.post('/tasks', async (req, res) => {
    const parse = createTaskSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ errors: parse.error.flatten().fieldErrors });
    }
    const { title, description, status = 'PENDING' } = parse.data;
    const now = new Date();
    const dateKey = toDateKey(now);
    const task = await prisma_1.prisma.task.create({
        data: {
            title,
            description,
            status,
            createdAt: now,
            updatedAt: now,
            completedAt: status === 'COMPLETED' ? now : null,
            dateKey,
        },
    });
    res.status(201).json(task);
});
app.put('/tasks/:id', async (req, res) => {
    const id = req.params.id;
    const parse = updateTaskSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ errors: parse.error.flatten().fieldErrors });
    }
    const existing = await prisma_1.prisma.task.findUnique({ where: { id } });
    if (!existing) {
        return res.status(404).json({ error: 'Task not found' });
    }
    const now = new Date();
    const data = parse.data;
    let completedAt = existing.completedAt;
    if (data.status === 'COMPLETED' && !existing.completedAt) {
        completedAt = now;
    }
    else if (data.status && (data.status === 'PENDING' || data.status === 'IN_PROGRESS')) {
        completedAt = null;
    }
    const updated = await prisma_1.prisma.task.update({
        where: { id },
        data: {
            title: data.title ?? existing.title,
            description: data.description ?? existing.description,
            status: data.status ?? existing.status,
            updatedAt: now,
            completedAt,
        },
    });
    res.json(updated);
});
app.delete('/tasks/:id', async (req, res) => {
    const id = req.params.id;
    const existing = await prisma_1.prisma.task.findUnique({ where: { id } });
    if (!existing) {
        return res.status(404).json({ error: 'Task not found' });
    }
    await prisma_1.prisma.task.delete({ where: { id } });
    res.status(204).send();
});
app.get('/summaries/:dateKey', async (req, res) => {
    const { dateKey } = req.params;
    const summary = await prisma_1.prisma.dailySummary.findUnique({ where: { dateKey } });
    if (!summary) {
        return res.status(404).json({ error: 'Summary not found' });
    }
    res.json(summary);
});
app.get('/notifications', async (req, res) => {
    const dateKey = req.query.date ?? toDateKey(new Date());
    const notifications = await prisma_1.prisma.dailySummaryNotification.findMany({
        where: { dateKey },
        orderBy: { sentAt: 'desc' },
    });
    res.json(notifications);
});
app.get('/history/tasks', async (req, res) => {
    const dateKey = req.query.date ?? toDateKey(new Date());
    const tasks = await prisma_1.prisma.archivedTask.findMany({
        where: { dateKey },
        orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
});
app.get('/history/dates', async (_req, res) => {
    const archivedDates = await prisma_1.prisma.archivedTask.findMany({
        distinct: ['dateKey'],
        select: { dateKey: true },
        orderBy: { dateKey: 'desc' },
    });
    const summaryDates = await prisma_1.prisma.dailySummary.findMany({
        distinct: ['dateKey'],
        select: { dateKey: true },
        orderBy: { dateKey: 'desc' },
    });
    const set = new Set([...archivedDates, ...summaryDates].map((r) => r.dateKey));
    res.json(Array.from(set).sort((a, b) => (a < b ? 1 : -1)));
});
app.post('/eod/run', async (req, res) => {
    const dateKey = req.query.date || undefined;
    try {
        const result = await (0, eod_1.runEndOfDay)(dateKey);
        res.json({ ok: true, ...result });
    }
    catch (err) {
        console.error('EOD failed', err);
        res.status(500).json({ error: 'EOD execution failed' });
    }
});
node_cron_1.default.schedule('0 0 * * *', () => {
    (0, eod_1.runEndOfDay)().catch((err) => {
        console.error('Scheduled EOD failed', err);
    });
}, { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
});
