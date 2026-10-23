function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob) {
  return readAsDataUrl(new File([blob], "receipt.jpg", { type: blob.type })).then((url) => url.split(",")[1] || "");
}

export async function fileToJpeg(file: File) {
  if (!file.type.startsWith("image/") && !/\.(heic|heif|jpg|jpeg|png|webp)$/i.test(file.name)) {
    throw new Error("Choose a photo of the receipt.");
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = null;
  }

  if (!bitmap) {
    const dataUrl = await readAsDataUrl(file);
    const base64 = dataUrl.split(",")[1] || "";
    if (!base64) throw new Error("Could not read that photo.");
    return { base64, contentType: file.type || "image/jpeg", previewUrl: dataUrl };
  }

  // Keep enough detail for OCR while staying under the API payload limit.
  const max = 2200;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Could not read that photo.");
  const previewUrl = URL.createObjectURL(blob);
  const base64 = await blobToBase64(blob);
  return { base64, contentType: "image/jpeg", previewUrl };
}
