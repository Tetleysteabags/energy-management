import Link from "next/link";
import { redirect } from "next/navigation";
import { removeSupplementAction } from "@/app/actions/supplements";
import { getSupplementStack } from "@/lib/supplements/queries";
import { Button } from "@/components/ui/button";

export default async function SupplementsSettingsPage() {
  const stack = await getSupplementStack();

  if (stack === null) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/settings" className="text-muted-foreground text-sm hover:underline">
          ← Settings
        </Link>
        <h1 className="text-xl font-medium">Supplements</h1>
        <p className="text-muted-foreground text-sm">Your regular stack for evening check-in.</p>
      </div>

      <ul className="space-y-2">
        {stack.map((item) => (
          <li
            key={item.id}
            className="border-border/60 flex items-center justify-between rounded-lg border px-4 py-3"
          >
            <span className="text-sm">{item.name}</span>
            <form action={removeSupplementAction.bind(null, item.id)}>
              <Button type="submit" variant="ghost" size="xs">
                Remove
              </Button>
            </form>
          </li>
        ))}
      </ul>

      {!stack.length ? (
        <p className="text-muted-foreground text-sm">
          Add supplements from the evening check-in form.
        </p>
      ) : null}
    </div>
  );
}
