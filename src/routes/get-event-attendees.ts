import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export async function getEventAttendees(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get('/events/:eventId/attendees', {
      schema: {
        summary: 'Get event attendees',
        tags: ['events'],
        params: z.object({
          eventId: z.string().uuid(),
        }),
        querystring: z.object({
          query: z.string().nullish(),
          pageIndex: z.string().nullish().default('0').transform(Number),
        }),
        response: {
          200: z.object({
            attendees: z.array(
              z.object({
                id: z.number(),
                name: z.string(),
                email: z.string().email(),
                createAt: z.date(),
                checkedInAt: z.date().nullable(),
              })
            ),
            total: z.number(),
          }),
        },
      }
    }, async (request, reply) => {
      const { eventId } = request.params
      const { pageIndex, query } = request.query

      const [attendees, total] = await Promise.all([
        prisma.attendees.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            createAt: true,
            checkIn: {
              select: {
                createAt: true,
              }
            }
          },
          where: query ? {
            eventsId: eventId,
            name: {
              contains: query,
            }
          } : {
            eventsId: eventId,
          },
          take: 10,
          skip: pageIndex * 10,
          orderBy: {
            createAt: 'desc'
          }
        }),
        prisma.attendees.count({
          where: query ? {
           eventsId: eventId,
            name: {
              contains: query,
            }
          } : {
            eventsId: eventId,
          },
        })
      ])

      return reply.send({ 
        attendees: attendees.map(attendee => {
          return {
            id: attendee.id,
            name: attendee.name,
            email: attendee.email,
            createAt: attendee.createAt,
            checkedInAt: attendee.checkIn?.createAt ?? null,
          }
        }),
        total,
      })
    })
}