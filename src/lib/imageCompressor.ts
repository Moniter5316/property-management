/**
 * Compresses an image file in the browser using HTML Canvas.
 * Converts to WebP format and shrinks dimensions to save database / API bandwidth.
 * Target file size is approximately 30-50 KB.
 */
export function compressImage(file: File, maxWidth = 500, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Canvas compression can only run in the browser client'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down dimensions if exceeding max width
        if (width > maxWidth) {
          height = Math.round((maxWidth / width) * height);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2D context from canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert image to webp format with quality compression
        const base64WebP = canvas.toDataURL('image/webp', quality);
        resolve(base64WebP);
      };

      img.onerror = (err) => {
        reject(new Error('Failed to load image file. ' + err));
      };
    };

    reader.onerror = (err) => {
      reject(new Error('Failed to read file reader. ' + err));
    };
  });
}
