/**
 * Detects if the current device is running iOS
 * @returns {boolean}
 */
export const isIOS = () => {
  return (
    ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes("Mac") && "ontouchend" in document) ||
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  );
};

/**
 * Handles cross-platform file exports
 * @param {Blob} blob - The file content as a Blob
 * @param {string} fileName - The desired name for the file
 * @returns {Promise<void>}
 */
export const exportFile = async (blob, fileName) => {
  const isiOS = isIOS();
  
  if (isiOS && navigator.share) {
    try {
      const file = new File([blob], fileName, { type: blob.type });
      
      // Check if the file can be shared
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
        });
        return;
      }
    } catch (error) {
      console.error("Error sharing file on iOS:", error);
      // Fallback to traditional download if share fails
    }
  }

  // Traditional Browser Download Fallback
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
};
