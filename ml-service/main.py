import io, json, torch, torch.nn as nn, timm
from fastapi import FastAPI, File, UploadFile
from torchvision import models, transforms
from PIL import Image

DEVICE = "cpu"
CLASSES = json.load(open("classes.json"))
N = len(CLASSES)

# ---- ResNet50 ----
resnet = models.resnet50()
resnet.fc = nn.Linear(resnet.fc.in_features, N)
resnet.load_state_dict(torch.load("resnet50_best.pth", map_location=DEVICE))
resnet.to(DEVICE).eval()

# ---- ViT (timm) ----
vit = timm.create_model("vit_base_patch16_224", pretrained=False, num_classes=N)
vit.load_state_dict(torch.load("vit_best.pth", map_location=DEVICE))
vit.to(DEVICE).eval()

IMAGENET = ([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
VIT_NORM = IMAGENET  # training mein alag normalize tha to yahan badlo

def make_pre(norm):
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(*norm),
    ])

MODELS = {
    "resnet50": {"net": resnet, "pre": make_pre(IMAGENET), "test_accuracy": 0.9599, "test_macro_f1": 0.9611},
    "vit":      {"net": vit,    "pre": make_pre(VIT_NORM), "test_accuracy": 0.9518, "test_macro_f1": 0.9531},
}

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok", "models": list(MODELS)}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    img = Image.open(io.BytesIO(await file.read())).convert("RGB")
    results = []
    for name, m in MODELS.items():
        x = m["pre"](img).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            probs = torch.softmax(m["net"](x), dim=1)[0]
        idx = int(probs.argmax())
        results.append({
            "model": name,
            "label": CLASSES[idx],
            "confidence": float(probs[idx]),
            "probabilities": {c: float(p) for c, p in zip(CLASSES, probs)},
            "test_accuracy": m["test_accuracy"],
            "test_macro_f1": m["test_macro_f1"],
        })
    return {"results": results, "agree": results[0]["label"] == results[1]["label"]}