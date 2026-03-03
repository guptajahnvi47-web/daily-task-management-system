import { subDays } from 'date-fns'
import { prisma } from './prisma'

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function runEndOfDay(forDate?: string) {
  const targetDateKey = forDate ?? toDateKey(subDays(new Date(), 1))

  await prisma.$transaction(async (tx) => {
    const tasks = await (tx as typeof prisma).task.findMany({
      where: { dateKey: targetDateKey },
      orderBy: { createdAt: 'asc' },
    })

    const totalCreated = tasks.length
    const totalCompleted = tasks.filter((t: any) => t.status === 'COMPLETED').length
    const totalPendingEndOfDay = tasks.filter((t: any) => t.status !== 'COMPLETED').length
    const completionPercentage =
      totalCreated === 0 ? 0 : Math.round((totalCompleted / totalCreated) * 100)

    const summary = await (tx as typeof prisma).dailySummary.upsert({
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
    })

    const message = `Daily summary for ${targetDateKey}: created=${totalCreated}, completed=${totalCompleted}, pending=${totalPendingEndOfDay}, completion=${completionPercentage}%`

    await (tx as typeof prisma).dailySummaryNotification.create({
      data: {
        dateKey: targetDateKey,
        summaryId: summary.id,
        message,
      },
    })

    await (tx as typeof prisma).task.updateMany({
      where: { dateKey: targetDateKey, status: 'IN_PROGRESS' },
      data: { status: 'NOT_COMPLETED' },
    })

    const finalTasks = await (tx as typeof prisma).task.findMany({
      where: { dateKey: targetDateKey },
    })

    if (finalTasks.length > 0) {
      await (tx as typeof prisma).archivedTask.createMany({
        data: finalTasks.map((t: any) => ({
          originalTaskId: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          completedAt: t.completedAt,
          dateKey: t.dateKey,
        })),
      })

      await (tx as typeof prisma).task.deleteMany({
        where: { id: { in: finalTasks.map((t: any) => t.id) } },
      })
    }
  })

  return { dateKey: targetDateKey }
}

