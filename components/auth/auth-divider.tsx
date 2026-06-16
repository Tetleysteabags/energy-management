export function AuthDivider() {
  return (
    <div className="relative py-1">
      <div className="border-border/60 absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card text-muted-foreground px-2 text-xs">or use email</span>
      </div>
    </div>
  );
}
