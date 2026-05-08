# Qdrant vector database
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
## Kiểm tra trạng thái collection:
curl http://localhost:6333/collections
## Xóa toàn bộ dữ liệu vector:
curl -X DELETE http://localhost:6333/collections/image_index
curl -X DELETE http://localhost:6333/collections/face_index

# frontend
cd ./frontend
npm run dev
# backend
cd ./backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000