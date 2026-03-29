# Food Booking and Recommendation IR Project

## 📌 Prerequisites (สิ่งที่ต้องมี)

โปรเจกต์นี้จำเป็นต้องใช้ Services ดังต่อไปนี้:

- **Python** (version 3.9+)
- **Node.js** (version 16+)
- **Elasticsearch** (พอร์ต `9200`)
- **PostgreSQL** (พอร์ต `5432` Database: `foodapp` - Username: `admin`, Password `1234`)

---

## 🚀 Setup Instructions (ขั้นตอนการติดตั้ง)

### 1. การเตรียมข้อมูล (Data Preparation)

ก่อนที่จะเริ่มรันระบบ คุณต้องมีข้อมูลดิบ (Raw Data) และไฟล์โมเดลขนาดใหญ่

**1.1 โหลดข้อมูลดิบจาก Kaggle**

1. ไปที่เว็ปไซต์ Kaggle และเข้าไปที่ลิงก์ของ Dataset โปรเจกต์นี้
2. ทำการดาวน์โหลด Dataset และนำไฟล์ **`recipes.csv`** และ **`reviews.csv`** ไปวางไว้ที่โฟลเดอร์ `backend/data/raw/` (หากไม่มีโฟลเดอร์ให้สร้างใหม่)

**1.2 โหลดโมเดลขนาดใหญ่แบบอัตโนมัติ**
เข้าโฟลเดอร์ backend ติดตั้ง dependencies แล้วรันตัวดาวน์โหลดเพื่อโหลด `tfidf_matrix.pkl` มาเก็บไว้ในเครื่อง

```bash
cd backend
pip install -r requirements.txt
python download_data.py
```

### 2. รันเซิร์ฟเวอร์ Backend

เปิด Terminal ไว้ที่โฟลเดอร์ `backend/`

**2.1 นำข้อมูลเข้า Elasticsearch และสร้าง Index**
เริ่มทำ Indexing สิ่งที่สำคัญทั้งหมด (รันทีละคำสั่งตามลำดับ):

```bash
python ir/es_index_builder.py
python ir/es_index_builder_ml.py
```

**2.2 เปิดรันระบบ API**

```bash
export FLASK_APP=app/app.py
# (หากคุณใช้งานบน Windows ให้รัน: set FLASK_APP=app/app.py)

flask run
```

_(Backend จะทำงานอยู่ที่: `http://localhost:5000`)_

---

### 3. รันหน้าเว็บ Frontend

เปิด Terminal **ใหม่อีกหนึ่งหน้าต่าง** แล้วเข้าไปที่โฟลเดอร์ `frontend/`:

```bash
cd frontend

# ติดตั้งแพ็กเกจที่จำเป็น
npm install

# รันหน้าเว็บโหมดนักพัฒนา
npm run dev
```

_(Frontend จะทำงานตาม URL ที่แสดงในคอนโซลของ Vite ซึ่งปกติจะอยู่ที่ `http://localhost:5173`)_
