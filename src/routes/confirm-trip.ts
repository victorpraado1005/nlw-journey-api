import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import "dayjs/locale/pt-br"
import { z } from "zod"
import { prisma } from "../lib/prisma";
import dayjs from "dayjs";

// import { Resend } from 'resend';

// const resend = new Resend('re_CBj1vmfj_Ayi5RXPjss6nSsdSFYhEFrRC');


export async function confirmTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/confirm', {
    schema: {
      params: z.object({
        tripId: z.string().uuid()
      })
    }
  }, async (request, reply) => {
    const { tripId } = request.params

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        participants: {
          where: {
            is_owner: false
          }
        }
      }
    })

    if (!trip) {
      throw new Error('Trip not found.')
    }

    if (trip.is_confirmed) {
      return reply.redirect(`http://localhost:3000/trips/${tripId}`)
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: { is_confirmed: true },
    })

    const formattedStartDate = dayjs(trip.starts_at).format('LL')
    const formattedEndDate = dayjs(trip.ends_at).format('LL')

    await Promise.all(
      trip.participants.map(async (participant) => {
        const confirmationLink = `http://localhost:3000/participants/${participant.id}/confirm`
        // const { data, error } = await resend.emails.send({
        //   from: 'Victor <onboarding@resend.dev>',
        //   to: [`${participant.email}`], 
        //   subject: 'Teste resend',
        //   html: '<strong>Link de confirmacao: ${confirmationLink}</strong>',
        // });

        // if (error) {
        //   return console.error({ error });
        // }
      })
    )

    return reply.redirect(`http://localhost:3000/trips/${tripId}`)
  }
  )
}