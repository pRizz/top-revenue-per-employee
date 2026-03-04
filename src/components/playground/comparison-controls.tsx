import type { CompanyRecord } from "@/types/company-data";

interface ComparisonControlsProps {
  companies: CompanyRecord[];
  selectedCompanyIds: string[];
  selectedBucketId: string;
  bucketIds: string[];
  onBucketChange: (bucketId: string) => void;
  onToggleCompany: (companyId: string) => void;
}

export function ComparisonControls(props: ComparisonControlsProps) {
  return (
    <section class="grid gap-4 rounded-xl border bg-card p-4 shadow-soft lg:grid-cols-[220px_1fr]">
      <div>
        <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bucket
        </label>
        <select
          class="w-full rounded-md border bg-white px-3 py-2 text-sm"
          value={props.selectedBucketId}
          onChange={(event) => props.onBucketChange(event.currentTarget.value)}
        >
          {props.bucketIds.map((bucketId) => (
            <option value={bucketId}>{bucketId}</option>
          ))}
        </select>
      </div>

      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Compare companies
        </p>
        <div class="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-2 md:grid-cols-3 lg:grid-cols-4">
          {props.companies.map((company) => (
            <label class="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={props.selectedCompanyIds.includes(company.id)}
                onChange={() => props.onToggleCompany(company.id)}
              />
              <span>{company.symbol}</span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
