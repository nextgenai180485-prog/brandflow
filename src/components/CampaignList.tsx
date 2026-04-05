import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Campaign, CampaignStatus } from "@/types/campaigns";

interface CampaignListProps {
  campaigns: Campaign[];
}

const statusVariant: Record<CampaignStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  generating: "outline",
  review: "default",
  approved: "default",
};

const statusLabel: Record<CampaignStatus, string> = {
  draft: "Draft",
  generating: "Generating",
  review: "In Review",
  approved: "Approved",
};

const CampaignList = ({ campaigns }: CampaignListProps) => {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id} className="cursor-pointer">
              <TableCell className="font-medium">{campaign.title}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[campaign.status]}>
                  {statusLabel[campaign.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {format(new Date(campaign.created_at), "MMM d, yyyy")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CampaignList;
