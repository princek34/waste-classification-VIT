Waste Classifier System (ResNet50 + ViT)

A full-stack AI web application that classifies waste images into four categories: e-waste, metal, organic, and plastic. Two deep learning models, ResNet50 and Vision Transformer (ViT), predict independently on every image, and the prediction with the higher confidence becomes the final verdict.

The project covers the whole pipeline: model training, a FastAPI inference service, a Node.js/Express backend with MongoDB Atlas, and a React analytics dashboard.

Highlights
Dual-model prediction: ResNet50 (CNN) and ViT (transformer) run side by side on every upload
Final verdict by confidence: the higher-confidence model wins, and the app shows whether the two models agree
High accuracy: 95.99% (ResNet50) and 95.18% (ViT) on a held-out test set of 1,473 images
Full-stack: React frontend, Express API, FastAPI ML service, MongoDB Atlas database
Analytics dashboard: class distribution, average confidence per model, model agreement rate, and recent activity
Prediction history: every result is stored, filterable, and can be cleared
Features
Drag-and-drop image upload with instant prediction
Side-by-side comparison of ResNet50 and ViT with class-wise probabilities
Recycling tip for each predicted waste class
Analytics dashboard built with Recharts
Prediction history with filters, stored in MongoDB Atlas
Models page showing benchmark results on the test set
Waste Categories
Class	Examples
ewaste	Electronics, batteries, cables
metal	Cans, tins, metal scrap
organic	Food and biodegradable waste
plastic	Bottles, packaging, containers
Models and Results

Both models were fine-tuned with transfer learning: pretrained weights, training the classification head first, then full fine-tuning with early stopping.

Model	Type	Architecture	Test Accuracy	Macro F1
ResNet50	CNN	torchvision ResNet50 with a new 4-class head	95.99%	0.9611
ViT	Transformer	vit_base_patch16_224 (timm) with a 4-class head	95.18%	0.9531

Evaluated on 1,473 test images. Input size is 224×224 with ImageNet normalisation.

Architecture
React + Vite (5173)  ->  Express API (5000)  ->  FastAPI + PyTorch (8000)
                               |
                         MongoDB Atlas
The user uploads an image in the React app.
The Express API validates it (max 5 MB) and forwards it to the FastAPI service.
FastAPI runs the image through both ResNet50 and ViT and returns the label, confidence, and class probabilities from each.
Express stores the result in MongoDB and sends it back to the UI.
The dashboard and history pages read aggregated data from the API.
Tech Stack
Layer	Technology
Frontend	React 19, Vite, Recharts, Lucide icons
Backend	Node.js, Express 5, Multer, Mongoose
ML Service	Python, FastAPI, PyTorch, torchvision, timm
Models	ResNet50, Vision Transformer (ViT-B/16)
Database	MongoDB Atlas
Project Structure
waste-classification-VIT/
├── client/        React frontend (Vite)
├── server/        Node + Express API, MongoDB models
└── ml-service/    FastAPI inference service
    ├── main.py
    ├── classes.json
    └── resnet50_best.pth
Setup
1. Model files

Place these files in ml-service/:

resnet50_best.pth (included in this repository)
vit_best.pth (not stored in the repository because of its size; add your trained weights)
classes.json (["ewaste", "metal", "organic", "plastic"], included)
2. ML service
bash
cd ml-service
pip install torch torchvision timm fastapi uvicorn python-multipart pillow "numpy<2"
python -m uvicorn main:app --port 8000
3. Backend
bash
cd server
npm install

Create server/.env:

PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
ML_URL=http://127.0.0.1:8000
bash
node index.js
4. Frontend
bash
cd client
npm install
npm run dev

Open http://localhost:5173.

API Endpoints

Express API (port 5000)

Method	Endpoint	Description
POST	/api/predict	Upload an image, get predictions from both models
GET	/api/history	Recent predictions (latest 100)
DELETE	/api/history	Clear prediction history
GET	/api/stats	Class counts, average confidence, agreement rate, 7-day activity
GET	/api/health	Health check

ML service (port 8000)

Method	Endpoint	Description
POST	/predict	Returns label, confidence, and probabilities for ResNet50 and ViT
GET	/health	Health check and loaded models
Limitations
Each image gets one class, so scenes with mixed waste give lower confidence.
The models are trained on four categories only.
Future Work
Object detection (e.g. YOLO) for images with multiple waste items
More waste categories (glass, paper, cardboard, hazardous waste)
Real-time classification from a webcam or phone camera
Deployment with Docker and a hosted demo
Author

Prince Kumar B.Tech CSE (AI/ML), Gulzar Group of Institutions, Ludhiana

GitHub: princek34
LinkedIn: prince-kumar-0a24862b3
