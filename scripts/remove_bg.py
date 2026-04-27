from PIL import Image
import sys

def remove_checkerboard(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    pixdata = img.load()
    
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixdata[x, y]
            
            # If it's grayish/whiteish
            # Check for white (255, 255, 255) or light gray (e.g. 204, 204, 204)
            is_gray = (abs(r - g) < 5 and abs(g - b) < 5 and r > 180)
            
            if is_gray:
                pixdata[x, y] = (0, 0, 0, 0)
                
    img.save(output_path)

if __name__ == "__main__":
    remove_checkerboard(sys.argv[1], sys.argv[2])
