import cv2
import numpy as np
import torch
import torch.nn.functional as F
import base64
from captum.attr import LayerGradCam

def crop_image_from_gray(img, tol=7):
    """Detect circular ROI and crop tightly"""
    if img.ndim == 2:
        mask = img > tol
        return img[np.ix_(mask.any(1),mask.any(0))]
    elif img.ndim == 3:
        gray_img = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        mask = gray_img > tol
        
        check_shape = img[:,:,0][np.ix_(mask.any(1),mask.any(0))].shape[0]
        if (check_shape == 0): # image is too dark so that we crop out everything,
            return img         # return original image
        else:
            img1=img[:,:,0][np.ix_(mask.any(1),mask.any(0))]
            img2=img[:,:,1][np.ix_(mask.any(1),mask.any(0))]
            img3=img[:,:,2][np.ix_(mask.any(1),mask.any(0))]
            img = np.dstack([img1,img2,img3])
        return img

def preprocess_image(image_bytes: bytes, image_size=380) -> np.ndarray:
    """Implement Ben Graham's method for fundus preprocessing"""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image file provided.")
        
    # Convert BGR to RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Tight crop
    img = crop_image_from_gray(img)
    
    # Resize
    img = cv2.resize(img, (image_size, image_size))
    
    # Local Color Subtraction using Gaussian Blur
    img = cv2.addWeighted(img, 4, cv2.GaussianBlur(img, (0,0), image_size/10), -4, 128)
    
    return img

class VisionExplainer:
    def __init__(self, model, target_layer):
        """
        Uses Captum LayerGradCam on a target layer to generate heatmaps.
        For EfficientNet-B4, target_layer is typically model.features[-1]
        """
        self.model = model
        self.gradcam = LayerGradCam(model, target_layer)

    def explain(self, input_tensor: torch.Tensor, target_class: int, original_img: np.ndarray) -> str:
        """
        Generate Grad-CAM for a given class, overlay on the original image, 
        and return base64 jpeg.
        """
        # Ensure gradients are enabled for the input tensor
        attr = self.gradcam.attribute(input_tensor, target=target_class, relu_attributions=True)
        
        # Interpolate to original image size -> (1, 1, 380, 380)
        attr = F.interpolate(attr, size=(original_img.shape[0], original_img.shape[1]), mode="bilinear", align_corners=False)
        attr = attr.squeeze().cpu().detach().numpy()
        
        # Normalize to 0-255
        if attr.max() > 0:
            attr = (attr - attr.min()) / (attr.max() - attr.min())
            attr = np.uint8(255 * attr)
        else:
            attr = np.zeros_like(attr, dtype=np.uint8)
            
        # Apply colormap
        heatmap = cv2.applyColorMap(attr, cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        
        # Overlay heatmap on original image
        overlay = cv2.addWeighted(original_img, 0.5, heatmap, 0.5, 0)
        
        # Convert to BGR for encoding
        overlay_bgr = cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR)
        _, buffer = cv2.imencode('.jpg', overlay_bgr)
        return base64.b64encode(buffer).decode('utf-8')
