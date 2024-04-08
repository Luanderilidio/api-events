import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export async function registerForEvent(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/events/:eventsId/attendees",
    {
      schema: {
        summary: "Register an attendee",
        tags: ["attendees"],
        body: z.object({
          name: z.string().min(4),
          email: z.string().email(),
        }),
        params: z.object({
          eventsId: z.string().uuid(),
        }),
        response: {
          201: z.object({
            attendeeId: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { eventsId } = request.params;
      const { name, email } = request.body;

      const attendeeFromEmail = await prisma.attendees.findFirst({
        where: {
          email,
          eventsId
        },
      });

      if (attendeeFromEmail !== null) {
        throw new Error("This email is already resgistred for this event");
      }

      const [event, amountOfAttendeesForEvent] = await Promise.all([
        prisma.events.findUnique({
          where: {
            id: eventsId,
          },
        }),
        prisma.attendees.count({
          where: {
            eventsId: eventsId,
          },
        }),
      ]);

      if (
        event?.maximumAttendees &&
        amountOfAttendeesForEvent >= event.maximumAttendees
      ) {
        throw new Error(
          "The maximum number of attendees for event has been reached."
        );
      }

      const attendee = await prisma.attendees.create({
        data: {
          name,
          email,
          eventsId,
        },
      });

      return reply.status(201).send({ attendeeId: attendee.id });
    }
  );
}
