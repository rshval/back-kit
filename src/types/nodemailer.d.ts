declare module 'nodemailer' {
  const nodemailer: {
    createTransport: (config: unknown) => {
      sendMail: (mailOptions: unknown) => Promise<{ response: string }>;
    };
  };

  export default nodemailer;
}
