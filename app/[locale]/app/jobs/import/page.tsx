import { PageHeader } from "@/components/page-header";
import { ImportWizard } from "@/components/features/import-wizard";

export default function ImportJobsPage() {
  return (
    <div>
      <PageHeader
        title="Importar ofertas"
        description="Desde fichero (CSV, Excel, XML, JSON), URL o API externa. El sistema normaliza al schema interno y deduplica."
      />
      <ImportWizard />
    </div>
  );
}
