import Link from "next/link";
import { redirect } from "next/navigation";
import { toggleLlmNotes } from "@/app/actions/notes-settings";
import { confirmNoteTagAction } from "@/app/actions/settings";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function NotesSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isDevelopment = process.env.NODE_ENV === "development";

  const { data: settings } = await supabase
    .from("user_settings")
    .select("llm_notes_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: tags } = await supabase
    .from("note_tags")
    .select("id, tag, confirmed, daily_log_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/settings" className="text-muted-foreground text-sm hover:underline">
          ← Settings
        </Link>
        <h1 className="text-xl font-medium">Notes tagging</h1>
        <p className="text-muted-foreground text-sm">
          Off by default. Tags never count until you confirm them.
        </p>
      </div>

      <div className="border-border/60 space-y-2 rounded-lg border px-4 py-4">
        <p className="text-sm font-medium">Not built yet</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The idea is that your notes could be read for recurring themes and offered back as tags
          you confirm or reject. Nothing does that today — your notes are stored and shown back to
          you, and are not sent to any language model or outside service.
        </p>
      </div>

      {isDevelopment ? (
        <form action={toggleLlmNotes.bind(null, settings?.llm_notes_enabled ?? false)}>
          <Button type="submit" variant="outline" className="w-full">
            {settings?.llm_notes_enabled ? "Disable" : "Enable"} the flag (dev only — nothing reads it)
          </Button>
        </form>
      ) : null}

      {tags?.length ? (
        <ul className="space-y-2">
          {tags.map((tag) => (
            <li key={tag.id} className="border-border/60 rounded-lg border px-3 py-2 text-sm">
              <p>{tag.tag}</p>
              <p className="text-muted-foreground text-xs">
                {tag.confirmed ? "Confirmed" : "Awaiting confirmation"}
              </p>
              {!tag.confirmed ? (
                <form action={confirmNoteTagAction.bind(null, tag.id, true)} className="mt-2">
                  <Button type="submit" size="xs" variant="outline">
                    Confirm tag
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No suggested tags yet.</p>
      )}
    </div>
  );
}
