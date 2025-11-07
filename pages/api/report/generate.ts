import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { prisma } from '@/lib/prisma'
import { generateNumerologyReport } from '@/lib/numerology'
import { generatePDF } from '@/lib/pdf-generator'
import { generateDOCX } from '@/lib/docx-generator'
import { sendReportEmail } from '@/lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user || !user.fullName || !user.birthDate) {
      return res.status(400).json({ error: 'Please complete your profile first' })
    }

    const report = generateNumerologyReport(user.fullName, user.birthDate)

    // Save report to database
    await prisma.report.create({
      data: {
        userId: user.id,
        reportData: JSON.stringify(report),
      },
    })

    const { format } = req.query

    if (format === 'pdf') {
      const pdfBuffer = await generatePDF(report, user.fullName, user.birthDate)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=bao-cao-than-so-hoc.pdf`)
      return res.send(pdfBuffer)
    }

    if (format === 'docx') {
      const docxBuffer = await generateDOCX(report, user.fullName, user.birthDate)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      res.setHeader('Content-Disposition', `attachment; filename=bao-cao-than-so-hoc.docx`)
      return res.send(docxBuffer)
    }

    if (format === 'email') {
      const pdfBuffer = await generatePDF(report, user.fullName, user.birthDate)
      await sendReportEmail(user.email!, user.fullName, pdfBuffer)
      return res.status(200).json({ message: 'Email sent successfully' })
    }

    return res.status(200).json(report)
  } catch (error) {
    console.error('Error generating report:', error)
    return res.status(500).json({ error: 'Failed to generate report' })
  }
}
