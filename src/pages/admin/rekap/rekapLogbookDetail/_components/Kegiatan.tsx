import { CardWrapper } from "@/components/card/cardWrapper";
import { StatusBadge } from "@/components/statusBadge";
import dayjs from "dayjs";

interface Props {
  data: any;
}

export const Kegiatan = ({ data }: Props) => {
  return (
    <CardWrapper
      title="Kegiatan"
      contentClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {/* Row 1 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Date</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.date
            ? dayjs(data.date).locale("id").format("DD MMM YYYY - HH:mm")
            : "-"}
        </span>
      </div>
      {/* Row 2 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Activity</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.action ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Status</span>
        <StatusBadge status={data?.status ?? null} />
      </div>
      {/* Row 3 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Kategori</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.category ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Patient</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.patient ?? "-"}
        </span>
      </div>
      {/* Row 4 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Peran</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.peran ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Diagnosis</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.diagnosis ?? "-"}
        </span>
      </div>
      {/* Row 5 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Judul</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.title ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Treatment</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.treatment ?? "-"}
        </span>
      </div>
      {data?.attachment ? (
        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-sm text-gray-500 w-24">Catatan</span>
          <div className="flex flex-col w-1/2 gap-2">
            {(data.attachment as string).split(";").map((item: string) => {
              let url =
                import.meta.env.VITE_API_URL.split("/index.php")[0] +
                "/_file" +
                item.split("_file")[1];

              return (
                <img
                  src={url}
                  alt="img"
                  className="w-full h-auto"
                  onClick={() =>
                    window.open(
                      url,
                      "_blank", // <- This is what makes it open in a new window.
                    )
                  }
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 w-24">Catatan</span>
          <span className="text-sm font-medium text-gray-800">
            {data?.attachment ?? "-"}
          </span>
        </div>
      )}
    </CardWrapper>
  );
};
