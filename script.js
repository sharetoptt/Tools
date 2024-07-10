document.getElementById('upload').addEventListener('change', loadImage);
document.querySelectorAll('.controls input[type=range]').forEach(input => {
    input.addEventListener('input', () => requestAnimationFrame(updateImage));
});
document.getElementById('save').addEventListener('click', saveImage);
document.getElementById('reset').addEventListener('click', resetControls);

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let img = new Image();
let scaledWidth, scaledHeight;

function loadImage(event) {
    let reader = new FileReader();
    reader.onload = function(e) {
        img.onload = function() {
            let maxWidth = 800; // 設置最大寬度
            let scale = maxWidth / img.width;
            scaledWidth = img.width * scale;
            scaledHeight = img.height * scale;
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;
            ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
            updateImage();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(event.target.files[0]);
}

function updateImage() {
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    let exposure = parseFloat(document.getElementById('exposure').value);
    let black = parseFloat(document.getElementById('black').value);
    let shadows = parseFloat(document.getElementById('shadows').value);
    let contrast = parseFloat(document.getElementById('contrast').value);
    let colorTemperature = parseFloat(document.getElementById('colorTemperature').value);
    let saturation = parseFloat(document.getElementById('saturation').value);
    let sharpness = parseFloat(document.getElementById('sharpness').value);
    let vignette = parseFloat(document.getElementById('vignette').value);

    // 簡化的圖像處理算法示例
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 曝光調整
        r = clamp(r * (1 + exposure / 100));
        g = clamp(g * (1 + exposure / 100));
        b = clamp(b * (1 + exposure / 100));

        // 黑色深度調整
        r = clamp(r - black);
        g = clamp(g - black);
        b = clamp(b - black);

        // 陰影調整
        r = clamp(r + shadows);
        g = clamp(g + shadows);
        b = clamp(b + shadows);

        // 對比調整
        r = clamp((r - 128) * (contrast / 100 + 1) + 128);
        g = clamp((g - 128) * (contrast / 100 + 1) + 128);
        b = clamp((b - 128) * (contrast / 100 + 1) + 128);

        // 色溫調整
        r = clamp(r + colorTemperature);
        b = clamp(b - colorTemperature);

        // 飽和度調整
        let avg = (r + g + b) / 3;
        r = clamp(avg + (r - avg) * (1 + saturation / 100));
        g = clamp(avg + (g - avg) * (1 + saturation / 100));
        b = clamp(avg + (b - avg) * (1 + saturation / 100));

        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(b);
    }

    // 銳利度調整
    if (sharpness > 0) {
        let weight = sharpness / 10;
        let sharpKernel = [
            0, -weight, 0,
            -weight, 1 + 4 * weight, -weight,
            0, -weight, 0
        ];
        imageData = applyConvolution(imageData, sharpKernel);
    }

    // 暈影效果
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;
    let maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    for (let i = 0; i < data.length; i += 4) {
        let currentDistance = Math.sqrt((i / 4 % canvas.width - centerX) ** 2 + (Math.floor(i / 4 / canvas.width) - centerY) ** 2);
        let vignetteEffect = 1 - (vignette / 100) * (currentDistance / maxDistance);
        data[i] *= vignetteEffect;
        data[i + 1] *= vignetteEffect;
        data[i + 2] *= vignetteEffect;
    }

    ctx.putImageData(imageData, 0, 0);
}

function clamp(value) {
    return Math.max(0, Math.min(255, value));
}

function saveImage() {
    let link = document.createElement('a');
    link.download = 'edited_image.png';
    link.href = canvas.toDataURL();
    link.click();
}

function resetControls() {
    document.getElementById('exposure').value = 0;
    document.getElementById('black').value = 0;
    document.getElementById('shadows').value = 0;
    document.getElementById('contrast').value = 0;
    document.getElementById('colorTemperature').value = 0;
    document.getElementById('saturation').value = 0;
    document.getElementById('sharpness').value = 0;
    document.getElementById('vignette').value = 0;
    updateImage();
}

function applyConvolution(imageData, kernel) {
    let src = imageData.data;
    let sw = imageData.width;
    let sh = imageData.height;
    let w = sw;
    let h = sh;
    let output = ctx.createImageData(w, h);
    let dst = output.data;

    let side = Math.round(Math.sqrt(kernel.length));
    let halfSide = Math.floor(side / 2);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let r = 0, g = 0, b = 0;
            for (let cy = 0; cy < side; cy++) {
                for (let cx = 0; cx < side; cx++) {
                    let scy = y + cy - halfSide;
                    let scx = x + cx - halfSide;
                    if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                        let srcOff = (scy * sw + scx) * 4;
                        let wt = kernel[cy * side + cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                    }
                }
            }
            let dstOff = (y * w + x) * 4;
            dst[dstOff] = clamp(r);
            dst[dstOff + 1] = clamp(g);
            dst[dstOff + 2] = clamp(b);
            dst[dstOff + 3] = 255;
        }
    }
    return output;
}
