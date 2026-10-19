# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

# Waste Classifier (ResNet50 + ViT)

A full-stack web application that classifies waste images into four categories: **ewaste, metal, organic, plastic**. Two deep learning models (ResNet50 and Vision Transformer) predict independently, and the one with higher confidence gives the final verdict.

## Features

- Drag and drop image upload with instant prediction
- Dual-model comparison (ResNet50 vs ViT) with class-wise probabilities
- Recycling tip for each predicted class
- Analytics dashboard (class distribution, average confidence, activity)
- Prediction history with filters, stored in MongoDB Atlas
- Model benchmark page with test-set results

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Recharts, Lucide icons |
| Backend | Node.js, Express, Multer, Mongoose |
| ML Service | Python, FastAPI, PyTorch, timm |
| Database | MongoDB Atlas |

## Architecture

```
React (5173)  ->  Express API (5000)  ->  FastAPI + PyTorch (8000)
                        |
                  MongoDB Atlas
```

## Model Results (test set, 1,473 images)

| Model | Accuracy | Macro F1 |
|---|---|---|
| ResNet50 | 95.99% | 0.9611 |
| ViT | 95.18% | 0.9531 |

Training: pretrained weights, first the classification head, then full fine-tuning with early stopping.

## Project Structure

```
waste_classifier system/
├── client/        React frontend
├── server/        Node + Express API
└── ml-service/    FastAPI inference service
```

## Setup

### 1. Model files
Model weights are not stored in this repository (size limits). Place these files in `ml-service/`:

- `resnet50_best.pth`
- `vit_best.pth`
- `classes.json` (`["ewaste", "metal", "organic", "plastic"]`)

### 2. ML service
```bash
cd ml-service
pip install torch torchvision timm fastapi uvicorn python-multipart pillow "numpy<2"
python -m uvicorn main:app --port 8000
```

### 3. Backend
```bash
cd server
npm install
```
Create `server/.env`:
```
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
ML_URL=http://127.0.0.1:8000
```
```bash
node index.js
```

### 4. Frontend
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/predict` | Upload an image, get predictions from both models |
| GET | `/api/history` | Recent predictions |
| DELETE | `/api/history` | Clear history |
| GET | `/api/stats` | Aggregated statistics |

## Limitations

- The model picks one class per image, so mixed-waste scenes give lower confidence.
- Future work: object detection (e.g. YOLO) for multi-object images.

## Author

Prince Kumar