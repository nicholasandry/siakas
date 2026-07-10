import {
  donationRecipientKindLabels,
  donationRecipientKinds,
  type DonationRecipientKind,
} from "@/lib/asset-disposals/constants";
import { getUnitKindLabel } from "@/lib/master-data-options";
import type { SearchableSelectGroup } from "@/components/ui/searchable-select";

export function isDonationRecipientKind(value: string | null | undefined): value is DonationRecipientKind {
  return donationRecipientKinds.includes(value as DonationRecipientKind);
}

export function buildDonationUnitSelectGroups(
  unitRows: Array<{ id: string; name: string; kind: string; code: string }>,
  options?: { excludeUnitId?: string | null }
) {
  const filtered = unitRows.filter((unit) => unit.id !== options?.excludeUnitId);
  const groups = new Map<string, SearchableSelectGroup["options"]>();

  for (const unit of filtered) {
    const groupLabel = getUnitKindLabel(unit.kind);
    const current = groups.get(groupLabel) ?? [];
    current.push({
      value: unit.id,
      label: unit.code ? `${unit.name} (${unit.code})` : unit.name,
      searchText: `${unit.name} ${unit.code} ${unit.kind}`,
    });
    groups.set(groupLabel, current);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "id"))
    .map(([label, groupOptions]) => ({
      label,
      options: groupOptions.sort((left, right) => left.label.localeCompare(right.label, "id")),
    }));
}

export function describeDonationRecipient(input: {
  donationRecipientKind: string | null;
  recipientName: string | null;
  recipientUnitName?: string | null;
}) {
  if (input.donationRecipientKind === "INTERNAL_UNIT") {
    const unitLabel = input.recipientUnitName ?? input.recipientName ?? "Unit tidak diketahui";
    return `${donationRecipientKindLabels.INTERNAL_UNIT}: ${unitLabel}`;
  }

  if (input.donationRecipientKind === "EXTERNAL_PARTY") {
    return `${donationRecipientKindLabels.EXTERNAL_PARTY}: ${input.recipientName ?? "-"}`;
  }

  return input.recipientName ?? "-";
}

export function isInternalDonationDisposal(input: {
  disposalMethod: string;
  donationRecipientKind: string | null;
  recipientUnitId: string | null;
}) {
  return (
    input.disposalMethod === "DONATION" &&
    (input.donationRecipientKind === "INTERNAL_UNIT" || (!input.donationRecipientKind && Boolean(input.recipientUnitId)))
  );
}
