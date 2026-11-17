import { CardWrapper } from "@/components/card/cardWrapper";

interface Props {
  data: any;
}

export const SkorCatatan = ({ data }: Props) => {
  return (
    <CardWrapper
      title="Skor & Catatan"
      contentClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {/* Row 1 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-28">Psikomotor</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.psikomotor ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-28">Knowledge</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.knowledge ?? "-"}
        </span>
      </div>
      {/* Row 2 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-28">Attitude</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.afektif ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-28">Total</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.total ?? "-"}
        </span>
      </div>
      {/* Row 3 - Notes (full width) */}
      <div className="sm:col-span-2 flex items-start gap-2">
        <span className="text-sm text-gray-500 w-28">Notes</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.notes ?? "-"}
        </span>
      </div>
    </CardWrapper>
  );
};
