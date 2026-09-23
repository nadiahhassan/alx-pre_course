import { PageHeader } from "@/components/ui";
import { ParameterForm } from "@/components/forms/parameter-form";
import { createLibraryParameter } from "@/server/parameter-actions";

export default function NewLibraryParameterPage() {
  return (
    <div>
      <PageHeader title="New library definition" back={{ href: "/library", label: "Parameter library" }} />
      <ParameterForm action={createLibraryParameter} mode="library" cancelHref="/library" submitLabel="Save definition" />
    </div>
  );
}
