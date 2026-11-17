import { CardWrapper } from "@/components/card/cardWrapper";
interface Props {
  data: any;
}

export const Skor = ({ data }: Props) => {
  return (
    <CardWrapper
      title="Skor"
      contentClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Psikomotor</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.psikomotor ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Knowledge</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.knowledge ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Attitude</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.afektif ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Total</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.total ?? "-"}
        </span>
      </div>
    </CardWrapper>
  );
};
