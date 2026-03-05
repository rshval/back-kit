import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function patternEmail() {
  return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/u;
}

export function patternPassword() {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=[\]{};:'",.<>?]{8,}$/;
}

export function isValidEmail(val: string) {
  const pattern = patternEmail();
  return new RegExp(pattern, 'u').test(val);
}

export function isValidPhoneNumber(val: string) {
  const phoneNumber = parsePhoneNumberFromString(val);
  return phoneNumber && phoneNumber.isValid();
}

export function isValidCode(code: number | string, length: number) {
  return String(code).length === length;
}

export function isEmpty(val: string | object) {
  if (typeof val === 'string') return val.trim().length === 0;
  if (typeof val === 'object') return Object.keys(val).length === 0;

  return false;
}
