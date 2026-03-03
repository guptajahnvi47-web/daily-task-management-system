"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEndOfDay = runEndOfDay;
const date_fns_1 = require("date-fns");
const prisma_1 = require("./prisma");
function toDateKey(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}
async function runEndOfDay(forDate) {
    const targetDateKey = forDate ?? toDateKey((0, date_fns_1.subDays)(new Date(), 1));
    await prisma_1.prisma.$transaction(async (tx) => {
        const tasks = await tx.task.findMany({
            where: { dateKey: targetDateKey },
            orderBy: { createdAt: 'asc' },
        });
        const totalCreated = tasks.length;
        const totalCompleted = tasks.filter((t) => t.status === 'COMPLETED').length;
        const totalPendingEndOfDay = tasks.filter((t) => t.status !== 'COMPLETED').length;
        const completionPercentage = totalCreated === 0 ? 0 : Math.round((totalCompleted / totalCreated) * 100);
        const summary = await tx.dailySummary.upsert({
            where: { dateKey: targetDateKey },
            create: {
                dateKey: targetDateKey,
                totalCreated,
                totalCompleted,
                totalPendingEndOfDay,
                completionPercentage,
            },
            update: {
                totalCreated,
                totalCompleted,
                totalPendingEndOfDay,
                completionPercentage,
                generatedAt: new Date(),
            },
        });
        const message = `Daily summary for ${targetDateKey}: created=${totalCreated}, completed=${totalCompleted}, pending=${totalPendingEndOfDay}, completion=${completionPercentage}%`;
        await tx.dailySummaryNotification.create({
            data: {
                dateKey: targetDateKey,
                summaryId: summary.id,
                message,
            },
        });
        await tx.task.updateMany({
            where: { dateKey: targetDateKey, status: 'IN_PROGRESS' },
            data: { status: 'NOT_COMPLETED' },
        });
        const finalTasks = await tx.task.findMany({
            where: { dateKey: targetDateKey },
        });
        if (finalTasks.length > 0) {
            await tx.archivedTask.createMany({
                data: finalTasks.map((t) => ({
                    originalTaskId: t.id,
                    title: t.title,
                    description: t.description,
                    status: t.status,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt,
                    completedAt: t.completedAt,
                    dateKey: t.dateKey,
                })),
            });
            await tx.task.deleteMany({
                where: { id: { in: finalTasks.map((t) => t.id) } },
            });
        }
    });
    return { dateKey: targetDateKey };
}
