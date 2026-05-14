export const extractDominantColor = (imageUrl) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0, g = 0, b = 0;
            const count = imageData.length / 4;
            
            for (let i = 0; i < imageData.length; i += 40) { // Sample every 10th pixel for speed
                r += imageData[i];
                g += imageData[i + 1];
                b += imageData[i + 2];
            }
            
            const pixelCount = count / 10;
            const avgR = Math.round(r / pixelCount);
            const avgG = Math.round(g / pixelCount);
            const avgB = Math.round(b / pixelCount);
            
            // Convert to Hex
            const toHex = (n) => n.toString(16).padStart(2, '0');
            resolve(`#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`);
        };
        img.onerror = () => resolve('#00ffff'); // Fallback
    });
};
