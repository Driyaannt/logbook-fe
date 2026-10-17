import { File, FileText } from "lucide-react";

export const isImageFile = (filename: string) =>
  /\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i.test(filename);

export const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return <FileText className="h-8 w-8 text-red-500 shrink-0" />;
  }

  if (["doc", "docx", "txt", "rtf"].includes(ext ?? "")) {
    return <FileText className="h-8 w-8 text-blue-700 shrink-0" />;
  }

  return <File className="h-8 w-8 text-gray-500 shrink-0" />;
};
