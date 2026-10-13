export const openAttachment = async (url: string, name: string) => {
  // Buka tab secara langsung dari klik user agar tidak diblokir popup blocker.
  const previewWindow = window.open("about:blank", "_blank");

  if (!previewWindow) return;

  previewWindow.opener = null;

  const ext = name.split(".").pop()?.toLowerCase();

  const officeExtensions = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];

  const isOfficeFile = officeExtensions.includes(ext ?? "");

  // Buat halaman preview dengan tombol download.
  const doc = previewWindow.document;
  doc.title = name;
  doc.body.innerHTML = "";

  const header = doc.createElement("div");
  header.style.cssText =
    "padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;font:14px Arial;border-bottom:1px solid #ddd";

  const title = doc.createElement("span");
  title.textContent = name;
  title.style.cssText = "overflow:hidden;text-overflow:ellipsis";

  const download = doc.createElement("a");
  download.href = url;
  download.textContent = "Download file";
  download.download = name;
  download.style.cssText =
    "padding:8px 12px;background:#2563eb;color:white;border-radius:6px;text-decoration:none;white-space:nowrap";

  header.append(title, download);

  const frame = doc.createElement("iframe");
  frame.style.cssText = "width:100%;height:calc(100vh - 58px);border:0";

  doc.body.style.cssText = "margin:0";
  doc.body.append(header, frame);

  if (isOfficeFile) {
    // Microsoft Viewer memerlukan URL file yang bisa diakses publik.
    frame.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    frame.src = blobUrl;
  } catch (error) {
    console.error("Gagal membuat preview:", error);

    // Fallback: buka file asli; server mungkin akan mengunduhnya.
    frame.src = url;
  }
};
