import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import dayjs from "dayjs";
import localizedFormat from 'dayjs/plugin/localizedFormat'
import "dayjs/locale/pt-br"
import nodemailer from "nodemailer"
import { z } from "zod"
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
// import { Resend } from 'resend';

// const resend = new Resend('re_CBj1vmfj_Ayi5RXPjss6nSsdSFYhEFrRC');

dayjs.locale('pt-br')
dayjs.extend(localizedFormat)

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/trips', {
    schema: {
      body: z.object({
        destination: z.string().min(4),
        starts_at: z.coerce.date(),
        ends_at: z.coerce.date(),
        owner_name: z.string(),
        owner_email: z.string().email(),
        emails_to_invite: z.array(z.string().email())
      })
    }
  }, async (request) => {
    const { destination, starts_at, ends_at, owner_name, owner_email, emails_to_invite } = request.body

    if (dayjs(starts_at).isBefore(new Date())) {
      throw new Error('Invalid trip start date.')
    }

    if (dayjs(ends_at).isBefore(starts_at)) {
      throw new Error('Invalid trip end date.')
    }

    const trip = await prisma.trip.create({
      data: {
        destination,
        starts_at,
        ends_at,
        participants: {
          createMany: {
            data: [
              {
                name: owner_name,
                email: owner_email,
                is_owner: true,
                is_confirmed: true
              },
              ...emails_to_invite.map(email => {
                return { email }
              })
            ],
          }
        }
      }
    })

    const formattedStartDate = dayjs(starts_at).format('LL')
    const formattedEndDate = dayjs(ends_at).format('LL')

    console.log(formattedStartDate)
    console.log(formattedEndDate)

    const mail = await getMailClient()

    const message = await mail.sendMail({
      from: {
        name: 'Equipe plann.er',
        address: 'oi@plann.er.com.br',
      },
      to: {
        name: owner_name,
        address: owner_email
      },
      subject: 'Testando envio de e-mail',
      html: '<p>Teste do envio de e-mail</p>'
    })

    console.log(nodemailer.getTestMessageUrl(message))


    // const { data, error } = await resend.emails.send({
    //   from: 'Victor <onboarding@resend.dev>',
    //   to: ['prado.victor1005@gmail.com'],
    //   subject: 'Teste resend',
    //   html: '<strong>It works!</strong>',
    // });

    // if (error) {
    //   return console.error({ error });
    // }

    // console.log({ data });

    return { tripId: trip.id }
  })
}