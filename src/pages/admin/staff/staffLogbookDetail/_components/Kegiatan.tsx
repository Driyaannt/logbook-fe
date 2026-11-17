import { CardWrapper } from "@/components/card/cardWrapper";
import type { TStaffLogbookDetail } from "@/types/staff";
import { StatusBadge } from "@/components/statusBadge";
import dayjs from "dayjs";

interface Props {
  data: TStaffLogbookDetail | null;
}

export const Kegiatan = ({ data }: Props) => {
  return (
    <CardWrapper
      title="Kegiatan"
      contentClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {data?.category_name && <div className="flex items-center gap-2"><span className="text-sm text-gray-500">{data.is_other ? "Keterangan kategori" : "Kategori"}</span><span className="text-sm font-medium text-gray-800">{data.category_name}</span></div>}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Date</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.date
            ? dayjs(data.date).locale("id").format("DD MMM YYYY - HH:mm")
            : "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Activity</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.action_name ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Hospital</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.hospital_name ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Catatan</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.notes ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Status</span>
        <StatusBadge status={data?.status_logbook ?? null} />
      </div>
    </CardWrapper>
  );
};
