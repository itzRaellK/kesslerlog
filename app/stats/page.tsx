import dynamic from "next/dynamic";
import { Layout } from "@/components/Layout";

const StatsContent = dynamic(
  () =>
    import("@/components/stats/StatsContent").then((m) => ({
      default: m.StatsContent,
    })),
  {
    loading: () => (
      <div className="mx-auto max-w-[1600px] px-4 py-10 text-sm text-muted-foreground sm:px-8">
        Carregando stats…
      </div>
    ),
  },
);

export default function StatsPage() {
  return (
    <Layout>
      <StatsContent />
    </Layout>
  );
}
