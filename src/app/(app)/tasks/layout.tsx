import { StandaloneTasksTabs } from "@/components/layout/standalone-tasks-tabs";

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StandaloneTasksTabs />
      {children}
    </>
  );
}
