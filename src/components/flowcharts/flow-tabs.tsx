import { SegmentedTabs } from "@/components/ui/segmented-tabs";

type FlowTabsProps = {
  value: string;
  items: Array<{
    label: string;
    value: string;
    href: string;
    count?: number;
  }>;
};

export function FlowTabs({ value, items }: FlowTabsProps) {
  return <SegmentedTabs value={value} items={items} />;
}
