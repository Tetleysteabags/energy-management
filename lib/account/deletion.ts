/** Typed by the user to confirm account deletion. Compared case-insensitively. */
export const DELETE_CONFIRMATION = "DELETE";

export function isDeletionConfirmed(input: string): boolean {
  return input.trim().toUpperCase() === DELETE_CONFIRMATION;
}
