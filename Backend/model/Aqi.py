import os
import rasterio
import matplotlib.pyplot as plt
import numpy as np
import cv2
from PIL import Image
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow.keras import layers, models

# Install required packages (if not already installed)
# Uncomment the following line if you need to install the packages
# os.system("pip install rasterio opencv-python-headless pillow matplotlib tensorflow")

# File path to the GeoTIFF file
file_path = r"C:/Users/yashb/OneDrive/Desktop/Coding/aqi/backend/data/Delhi_NO2_Jan2023.tif"

# Visualize the GeoTIFF file
with rasterio.open(file_path) as src:
    image = src.read(1)

plt.imshow(image, cmap='viridis')
plt.title("AQI Image - NO2 Levels")
plt.axis("off")
plt.colorbar(label="NO₂ Concentration")
plt.show()

# Function to create patches from the image
def create_patches(img, size=64, stride=64, save_dir="dataset"):
    os.makedirs(save_dir, exist_ok=True)
    count = 0
    for i in range(0, img.shape[0] - size + 1, stride):
        for j in range(0, img.shape[1] - size + 1, stride):
            patch = img[i:i+size, j:j+size]
            patch_img = Image.fromarray(patch.astype(np.uint8))
            patch_img.save(f"{save_dir}/patch_{count}.png")
            count += 1
    print(f"✅ Saved {count} patches in '{save_dir}'")

# Create patches from the image
create_patches(image)

# Function to save tiles from GeoTIFF
def save_tiles_from_geotiff(file_path, output_folder="dataset", tile_size=64):
    os.makedirs(output_folder, exist_ok=True)

    with rasterio.open(file_path) as src:
        image = src.read(1)  # Read first band

    height, width = image.shape
    count = 0
    for i in range(0, height, tile_size):
        for j in range(0, width, tile_size):
            tile = image[i:i+tile_size, j:j+tile_size]
            if tile.shape == (tile_size, tile_size):
                tile = (255 * (tile - tile.min()) / (tile.max() - tile.min())).astype(np.uint8)
                img = Image.fromarray(tile)
                img.save(f"{output_folder}/tile_{count}.png")
                count += 1

    print(f"✅ All {count} tiles saved in '{output_folder}' folder.")

# Save tiles from the GeoTIFF file
save_tiles_from_geotiff(file_path)

# Function to load tile pairs for training
def load_tile_pairs(folder="dataset", scale=2):
    X, y = [], []
    for file in os.listdir(folder):
        if file.endswith(".png"):
            img = Image.open(os.path.join(folder, file)).convert("L")
            img = np.array(img)

            # Downscale + Upscale to simulate low-res input
            low_res = Image.fromarray(img).resize(
                (img.shape[1] // scale, img.shape[0] // scale), Image.BICUBIC)
            low_res = low_res.resize(img.shape[::-1], Image.BICUBIC)

            X.append(np.array(low_res) / 255.0)
            y.append(img / 255.0)

    if len(X) == 0:
        raise ValueError("No image tiles found in the dataset folder.")

    X = np.array(X).reshape(-1, img.shape[0], img.shape[1], 1)
    y = np.array(y).reshape(-1, img.shape[0], img.shape[1], 1)

    return train_test_split(X, y, test_size=0.2)

# Load data
X_train, X_val, y_train, y_val = load_tile_pairs()
print(f"✅ Training samples: {len(X_train)}, Validation samples: {len(X_val)}")

# Function to build the SRCNN model
def build_srcnn_model():
    model = models.Sequential([
        layers.Conv2D(64, (9, 9), activation='relu', padding='same', input_shape=(None, None, 1)),
        layers.Conv2D(32, (1, 1), activation='relu', padding='same'),
        layers.Conv2D(1, (5, 5), activation='linear', padding='same')
    ])
    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    return model

# Build the SRCNN model
model = build_srcnn_model()
model.summary()

# Train the model
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=50,
    batch_size=2
)

# Function to visualize predictions
def visualize_predictions(model, X, y, num_samples=3):
    preds = model.predict(X[:num_samples])

    for i in range(num_samples):
        plt.figure(figsize=(12, 4))

        # Low-res input
        plt.subplot(1, 3, 1)
        plt.imshow(X[i].squeeze(), cmap='gray')
        plt.title("Low-Res Input")
        plt.axis('off')

        # Super-res output
        plt.subplot(1, 3, 2)
        plt.imshow(preds[i].squeeze(), cmap='gray')
        plt.title("SRCNN Output")
        plt.axis('off')

        # High-res ground truth
        plt.subplot(1, 3, 3)
        plt.imshow(y[i].squeeze(), cmap='gray')
        plt.title("High-Res Ground Truth")
        plt.axis('off')

        plt.tight_layout()
        plt.show()

# Visualize some predictions
visualize_predictions(model, X_val, y_val)