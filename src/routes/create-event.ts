import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { generateSlug } from "../utils/generateSlug";
import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function createEvent(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/events",
    {
      schema: {
        summary: 'Criar evento' ,
        tags: ['events'],
        body: z.object({
          title: z.string().min(4),
          details: z.string().nullable(),
          maximumAttendees: z.number().int().positive().nullable(),
        }),
        response: {
          201: z.object({
            eventId: z.string().uuid(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { title, details, maximumAttendees } = request.body;

      console.log(request.body);

      const slug = generateSlug(title);

      const eventSameWithSlug = await prisma.events.findUnique({
        where: {
          slug,
        },
      });

      if (eventSameWithSlug !== null) {
        throw new Error("Another event with same title already exists.");
      }

      const event = await prisma.events.create({
        data: {
          title,
          details,
          maximumAttendees,
          slug: slug,
        },
      });

      return reply.status(201).send({ eventId: event.id });
    }
  );
}
