import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          email: true,
          name: true,
          fullName: true,
          birthDate: true,
        },
      })

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      return res.status(200).json(user)
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch user profile' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { fullName, birthDate } = req.body

      if (!fullName || !birthDate) {
        return res.status(400).json({ error: 'Full name and birth date are required' })
      }

      const user = await prisma.user.update({
        where: { email: session.user.email },
        data: {
          fullName,
          birthDate: new Date(birthDate),
        },
      })

      return res.status(200).json(user)
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update user profile' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
