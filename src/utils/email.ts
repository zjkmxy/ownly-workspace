/**
 * Validate email address
 * @param email Email to validate
 * @returns True if email is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  return !!email
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    );
}

export function convertEmailToName(email: string): string {
  const splitEmail = email.split('@');
  const userName = splitEmail[0];
  const subNames = splitEmail[1].split('.').reverse();
  let ndnName = "/ndn/";
  for (const subName of subNames) {
    ndnName += subName;
    ndnName += '/';
  }
  ndnName += userName;
  return ndnName;
}
