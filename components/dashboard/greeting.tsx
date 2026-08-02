/**
 * The greeting comes from the server, computed against the user's stored
 * timezone — so there is nothing left to correct after mount.
 */
export function Greeting({ initial }: { initial: string }) {
  return <h1 className="text-2xl font-medium tracking-tight">{initial}</h1>;
}
