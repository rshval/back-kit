import { describe, expect, test, vi } from 'vitest';

import { createMailOptions, sendEmailWithConfig } from './email.js';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(async () => ({
      sendMail: vi.fn(async () => ({ response: '250 OK' })),
    })),
  },
}));

describe('email helpers', () => {
  test('createMailOptions builds plain message', () => {
    const result = createMailOptions({
      from: 'no-reply@test.ru',
      to: 'a@test.ru',
      subject: 'Hello',
      text: 'World',
    });

    expect(result.subject).toBe('Hello');
    expect(result.html).toBe('World');
  });

  test('createMailOptions builds body-based message', () => {
    const result = createMailOptions({
      from: 'no-reply@test.ru',
      to: {
        subject: { title: 'Заявка' },
        name: 'Иван',
        email: 'ivan@test.ru',
        comment: 'Текст',
        mail: 'ivan@test.ru',
      },
      subject: 'ignored',
      text: 'ignored',
    });

    expect(result.subject).toBe('Заявка: Иван, ivan@test.ru');
    expect(result.html).toContain('Отправитель: Иван, ivan@test.ru');
  });

  test('sendEmailWithConfig sends mail and returns response text', async () => {
    const result = await sendEmailWithConfig({
      nodemailerConfig: { auth: { user: 'no-reply@test.ru' } },
      to: 'a@test.ru',
      subject: 'Hello',
      text: 'World',
    });

    expect(result).toBe('Email sent: 250 OK');
  });
});
