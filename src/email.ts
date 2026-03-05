import nodemailer from 'nodemailer';

export interface MailOptionsBody {
  subject: { title: string };
  name: string;
  email: string;
  comment: string;
  mail: string;
}

interface NodemailerConfig {
  auth: {
    user: string;
  };
  [key: string]: unknown;
}

export function createMailOptions({
  from,
  to,
  subject,
  text,
}: {
  from: string;
  to: MailOptionsBody | string;
  subject: string;
  text: string;
}) {
  const body = typeof to === 'object' ? to : null;

  return {
    from,
    to,
    subject: body
      ? `${body.subject.title}: ${body.name}, ${body.mail}`
      : subject,
    html: body
      ? `Отправитель: ${body.name}, ${body.mail}<br/>${body.comment}`
      : text,
  };
}

export const sendEmailWithConfig = async ({
  nodemailerConfig,
  to,
  subject,
  text,
}: {
  nodemailerConfig: NodemailerConfig;
  to: MailOptionsBody | string;
  subject: string;
  text: string;
}) => {
  const transporter = await nodemailer.createTransport(nodemailerConfig);
  const mailOptions = createMailOptions({
    from: nodemailerConfig.auth.user,
    to,
    subject,
    text,
  });

  const info = await transporter.sendMail(mailOptions);
  return `Email sent: ${info.response}`;
};
