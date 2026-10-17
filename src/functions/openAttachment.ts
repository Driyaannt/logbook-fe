import { isImageFile } from "@/functions/getFileIcon";

export const openAttachment = async (url: string, name: string) => {
  // Buka tab langsung dari klik user agar tidak diblokir popup blocker.
  const previewWindow = window.open("about:blank", "_blank");

  if (!previewWindow) return;

  previewWindow.opener = null;

  const ext = name.split(".").pop()?.toLowerCase();

  const officeExtensions = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];

  const isOfficeFile = officeExtensions.includes(ext ?? "");
  const isImage = isImageFile(name);

  const doc = previewWindow.document;
  doc.title = name;
  doc.head.innerHTML = "";

  const viewport = doc.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1";
  doc.head.appendChild(viewport);

  doc.body.innerHTML = "";

  doc.documentElement.style.cssText = `
    min-height: 100%;
    height: 100%;
  `;

  doc.body.style.cssText = `
    margin: 0;
    min-height: 100vh;
    background: #f3f4f6;
    font-family: Arial, sans-serif;
  `;

  // Header
  const header = doc.createElement("header");
  header.style.cssText = `
    position: sticky;
    top: 0;
    z-index: 10;
    box-sizing: border-box;
    width: 100%;
    min-height: 58px;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
  `;

  const title = doc.createElement("span");
  title.textContent = name;
  title.title = name;
  title.style.cssText = `
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    color: #111827;
  `;

  const download = doc.createElement("a");
  download.href = url;
  download.textContent = "Download file";
  download.download = name;
  download.style.cssText = `
    flex-shrink: 0;
    padding: 9px 14px;
    background: #2563eb;
    color: #ffffff;
    border-radius: 6px;
    text-decoration: none;
    font-size: 13px;
    white-space: nowrap;
  `;

  header.append(title, download);

  // Area preview
  const container = doc.createElement("main");
  container.style.cssText = `
    box-sizing: border-box;
    width: 100%;
    min-height: calc(100vh - 58px);
    padding: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Frame untuk PDF dan dokumen
  const frame = doc.createElement("iframe");
  frame.title = name;
  frame.style.cssText = `
    display: block;
    width: 100%;
    height: calc(100vh - 122px);
    min-height: 400px;
    border: none;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  `;

  container.appendChild(frame);
  doc.body.append(header, container);

  // Responsive padding untuk layar kecil
  const style = doc.createElement("style");
  style.textContent = `
    @media (max-width: 640px) {
      header {
        padding: 10px 12px !important;
      }

      main {
        padding: 16px !important;
      }

      iframe {
        height: calc(100vh - 100px) !important;
        min-height: 300px !important;
      }
    }
  `;
  doc.head.appendChild(style);

  // Office Viewer memerlukan URL file yang dapat diakses publik.
  if (isOfficeFile) {
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

    if (isImage) {
      const img = doc.createElement("img");

      img.src = blobUrl;
      img.alt = name;
      img.style.cssText = `
        display: block;
        max-width: 100%;
        max-height: calc(100vh - 122px);
        width: auto;
        height: auto;
        object-fit: contain;
        margin: auto;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      `;

      container.replaceChildren(img);
    } else {
      frame.src = blobUrl;
    }

    // Bebaskan object URL ketika tab preview ditutup.
    previewWindow.addEventListener(
      "beforeunload",
      () => URL.revokeObjectURL(blobUrl),
      { once: true },
    );
  } catch (error) {
    console.error("Gagal membuat preview:", error);

    // Fallback jika fetch gagal, misalnya karena kendala CORS.
    if (isImage) {
      const img = doc.createElement("img");

      img.src = url;
      img.alt = name;
      img.style.cssText = `
        display: block;
        max-width: 100%;
        max-height: calc(100vh - 122px);
        width: auto;
        height: auto;
        object-fit: contain;
        margin: auto;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      `;

      container.replaceChildren(img);
    } else {
      frame.src = url;
    }
  }
};
