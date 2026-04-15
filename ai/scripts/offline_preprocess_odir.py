import os
import cv2
import pandas as pd
import numpy as np
from tqdm import tqdm
import glob

# Re-use our existing crop logic
def crop_image_from_gray(img, tol=7):
    """Detect circular ROI and crop tightly"""
    if img.ndim == 2:
        mask = img > tol
        return img[np.ix_(mask.any(1),mask.any(0))]
    elif img.ndim == 3:
        gray_img = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        mask = gray_img > tol
        
        check_shape = img[:,:,0][np.ix_(mask.any(1),mask.any(0))].shape[0]
        if (check_shape == 0):
            return img
        else:
            img1=img[:,:,0][np.ix_(mask.any(1),mask.any(0))]
            img2=img[:,:,1][np.ix_(mask.any(1),mask.any(0))]
            img3=img[:,:,2][np.ix_(mask.any(1),mask.any(0))]
            img = np.dstack([img1,img2,img3])
        return img

def apply_ben_graham(img, image_size=380):
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = crop_image_from_gray(img)
    img = cv2.resize(img, (image_size, image_size))
    img = cv2.addWeighted(img, 4, cv2.GaussianBlur(img, (0,0), image_size/10), -4, 128)
    return cv2.cvtColor(img, cv2.COLOR_RGB2BGR) # Convert back for cv2.imwrite

def main():
    base_dir = r"D:\Software\ClinicaEye-NLP\Data\ODIR-5K"
    csv_file = os.path.join(base_dir, "full_df.csv")
    output_dir = os.path.join(base_dir, "preprocessed_images")
    
    os.makedirs(output_dir, exist_ok=True)
    
    df = pd.read_csv(csv_file)
    print(f"Loaded {len(df)} rows from {csv_file}")
    
    # Locate where the original images are. We'll search for the first valid file to infer path
    search_dirs = [
        base_dir,
        os.path.join(base_dir, "ODIR-5K"),
        os.path.join(base_dir, "ODIR-5K", "Training Images"),
        os.path.join(base_dir, "ODIR-5K", "Testing Images")
    ]
    
    def find_image(filename):
        for d in search_dirs:
            path = os.path.join(d, filename)
            if os.path.exists(path):
                return path
        # Fallback to recursive search if not found
        for filepath in glob.iglob(base_dir + f"/**/{filename}", recursive=True):
            return filepath
        return None

    success_count = 0
    fail_count = 0
    
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Preprocessing"):
        filename = row.get("filename")
        if pd.isna(filename):
            continue
            
        out_path = os.path.join(output_dir, filename)
        if os.path.exists(out_path):
            success_count += 1
            continue # Already processed
            
        img_path = find_image(filename)
        if img_path is None:
            fail_count += 1
            continue
            
        img = cv2.imread(img_path)
        if img is None:
            fail_count += 1
            continue
            
        try:
            processed_img = apply_ben_graham(img, image_size=380)
            cv2.imwrite(out_path, processed_img)
            success_count += 1
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            fail_count += 1
            
    print(f"Preprocessing Complete: {success_count} success, {fail_count} failures.")

if __name__ == "__main__":
    main()
