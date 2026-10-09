// Placeholder until the real page is built.
export function ComingSoon({ title, feature }: { title: string; feature: number }) {
  return (
    <section className="rounded-card border border-border bg-surface p-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">This page is built in Feature {feature}.</p>
    </section>
  )
}
