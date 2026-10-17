import { CardWrapper } from "@/components/card/cardWrapper";
import { getFileIcon, isImageFile } from "@/functions/getFileIcon";
import { openAttachment } from "@/functions/openAttachment";
import { cn } from "@/lib/utils";
import { TMorbidityByUserDetail } from "@/types/morbidity";
import dayjs from "dayjs";
import { useMemo } from "react";

interface Props {
  data: TMorbidityByUserDetail | null;
}

export const Detail = ({ data }: Props) => {
  const lampiran = useMemo(() => {
    if (!data?.lampiran || data.lampiran.trim() === "-") return null;

    const url =
      `${import.meta.env.VITE_API_URL.split("/index.php")[0]}/_file` +
      data.lampiran.split("_file")[1];

    const name = decodeURIComponent(
      data.lampiran.split("/").pop() || "Lampiran",
    );

    return {
      url,
      name,
      isImage: isImageFile(name),
    };
  }, [data?.lampiran]);

  return (
    <CardWrapper
      title="Detail"
      contentClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {/* Row 1 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">PX Name</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.patient_name ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Age</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.umur ?? "-"}
        </span>
      </div>
      {/* Row 2 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">CM</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.cm ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Dx Awal</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.dx_awal ?? "-"}
        </span>
      </div>
      {/* Row 3 */}
      <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
        <span className="text-sm text-gray-500 w-24">Kronologi Morbiditas</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.kronologi_morbiditas ?? "-"}
        </span>
      </div>
      {/* Row 4 */}

      {/* Row 5 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Date Morbidity</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.date
            ? dayjs(data?.date).locale("id").format("DD MMMM YYYY")
            : "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Staff Pelapor</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.staff_pelapor ?? "-"}
        </span>
      </div>
      {/* Row 6 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Staff Penilai / GKM</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.staff_penilai ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Staff KPS</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.staff_kps ?? "-"}
        </span>
      </div>
      {/* Row 7 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 w-24">Category</span>
        <span className="text-sm font-medium text-gray-800">
          {data?.category ?? "-"}
        </span>
      </div>

      <div
        className={cn(
          "flex flex-col gap-2 sm:col-span-2",
          !lampiran && "flex-row",
        )}
      >
        <span className="text-sm text-gray-500 w-24">Lampiran (Opsional)</span>

        {lampiran ? (
          <div className="w-full">
            {lampiran.isImage ? (
              <img
                src={lampiran.url}
                alt={lampiran.name}
                className="w-full sm:w-[240px] h-auto rounded-lg border cursor-pointer object-cover"
                onClick={() => openAttachment(lampiran.url, lampiran.name)}
              />
            ) : (
              <button
                type="button"
                onClick={() => openAttachment(lampiran.url, lampiran.name)}
                className="flex items-center gap-3 w-full min-h-[76px] p-3 rounded-lg border text-left hover:bg-gray-50 transition-colors"
              >
                {getFileIcon(lampiran.name)}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {lampiran.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {lampiran.name.split(".").pop()?.toUpperCase()} · Buka file
                  </p>
                </div>
              </button>
            )}
          </div>
        ) : (
          <span className="text-sm font-medium text-gray-800">-</span>
        )}
      </div>
      <div></div>
    </CardWrapper>
  );
};
