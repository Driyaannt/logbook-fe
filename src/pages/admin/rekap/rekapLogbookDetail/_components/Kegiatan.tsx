import { CardWrapper } from "@/components/card/cardWrapper";
import { StatusBadge } from "@/components/statusBadge";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { useMemo } from "react";

interface Props {
  data: any;
}

export const Kegiatan = ({ data }: Props) => {
  const attachments = useMemo(() => {
    if (!data?.attachment) return [];

    const baseUrl = import.meta.env.VITE_API_URL.split("/index.php")[0];

    return (data.attachment as string)
      .split(";")
      .filter(Boolean)
      .map((item) => {
        const url = `${baseUrl}/_file${item.split("_file")[1]}`;

        let type: "attachmentBefore" | "attachmentAfter" | "attachment" =
          "attachment";

        if (item.includes("/attachment-before/")) {
          type = "attachmentBefore";
        } else if (item.includes("/attachment-after/")) {
          type = "attachmentAfter";
        }

        return {
          url,
          name: item.split("/").pop() || "Attachment",
          type,
        };
      });
  }, [data?.attachment]);

  const action = (data?.action as string)?.toUpperCase();

  const isOperationAction = [
    "KEGIATAN KAMAR OPERASI",
    "BIMBINGAN OPERASI",
  ].includes(action ?? "");

  const attachmentBefore = attachments.filter(
    (item) => item.type === "attachmentBefore",
  );

  const attachmentAfter = attachments.filter(
    (item) => item.type === "attachmentAfter",
  );

  const renderAttachments = (items: typeof attachments) =>
    items.length > 0 ? (
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        {items.map(({ url, name }) => (
          <img
            key={url}
            src={url}
            alt={name}
            className="w-full sm:w-[240px] h-auto rounded-lg border cursor-pointer object-cover"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          />
        ))}
      </div>
    ) : (
      <span className="text-sm font-medium text-gray-800">-</span>
    );

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

      {data?.action &&
        (data?.action as string).toLocaleUpperCase() !== "MORBIDITAS" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 w-24">Catatan</span>
            <span className="text-sm font-medium text-gray-800">
              {data?.notes ?? "-"}
            </span>
          </div>
        )}

      <div
        className={cn(
          "flex flex-col gap-2 sm:col-span-2",
          attachments.length === 0 && !isOperationAction && "flex-row",
        )}
      >
        <span className="text-sm text-gray-500 w-24 shrink-0">Attachment</span>

        {isOperationAction ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-500">Attachment Before</span>
              {renderAttachments(attachmentBefore)}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-500">Attachment After</span>
              {renderAttachments(attachmentAfter)}
            </div>
          </div>
        ) : (
          renderAttachments(
            attachments.filter((item) => item.type === "attachment"),
          )
        )}
      </div>
    </CardWrapper>
  );
};
