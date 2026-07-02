interface ViewHeaderProps {
  title: string;
  description?: string;
}

export default function ViewHeader({ title, description }: ViewHeaderProps) {
  return (
    <div className="view-header">
      <h2 className="view-header-title">{title}</h2>
      {description && <p className="view-header-description">{description}</p>}
    </div>
  );
}
