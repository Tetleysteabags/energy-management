import { ForceLightMode } from "@/components/marketing/force-light-mode";

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ForceLightMode />
      {children}
    </>
  );
}
