// Admin email addresses that have access to the admin panel
export const ADMIN_EMAILS = [
  'steeven.russo94@gmail.com',
  'citrarodaniele90@gmail.com',
  'steward_russo94@hotmail.it',
];

// Check if a user email is an admin
export const isAdminEmail = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
