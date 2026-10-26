export default function Placeholder({ title }: { title: string }) {
  return (
    <header className="flex h-11 items-center">
      <h1 className="font-display text-[26px]">{title}</h1>
    </header>
  );
}
