'use server'

interface EmailOptions {
  to: string | string[]
  subject: string
  body: string
}

export async function sendEmail({ to, subject, body }: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST

  if (smtpHost) {
    try {
      const nodemailer = await import('nodemailer')
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'system@imet.sk',
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        html: body,
      })
      return { success: true }
    } catch (err) {
      console.error('[EMAIL] SMTP error:', err)
      return { success: false, error: 'SMTP error' }
    }
  }

  console.log(`[EMAIL] To: ${Array.isArray(to) ? to.join(',') : to} | Subject: ${subject}`)
  return { success: true }
}
