# Beyond the Glass

An immersive 3D virtual museum. Visitors explore curated exhibitions, pick up artifacts in a 3D viewer, discover the whole collection, and test what they learned with a quiz. Curators upload models, place hotspots on them and build guided tours.

*College full stack web development project (MERN + React Three Fiber).*

![Home page](docs/screenshots/home.jpg)

## Features

| | What visitors can do | Where |
| --- | --- | --- |
| **Explore** | Browse exhibitions; follow a **guided tour** that walks through every artifact in the curator's order, turning the camera to each hotspot (Previous / Next / Autoplay, arrow keys, works on phones) | `/exhibitions`, `/exhibitions/:slug`, `/exhibitions/:slug/tour` |
| **Inspect** | Turn, zoom and pan each artifact in 3D; numbered **hotspots** explain details and hide when behind the model; three lighting presets; fullscreen | `/artifacts/:slug` |
| **Discover** | Search as you type, filter by era, region and category, paginate, or press **Surprise me**; save favorites to **My Collection** | `/discover`, `/collection` |
| **Learn** | A short **quiz** at the end of each exhibition with instant feedback; scores are calculated by the server and kept in My Collection | `/exhibitions/:slug/quiz` |

Curators and admins also get a **dashboard** (`/dashboard`): upload artifacts with a live 3D preview and upload progress, place hotspots by clicking on the model, save the starting camera view, build exhibitions with drag-and-drop tour order, publish/unpublish, and write quizzes. Only admins can delete artifacts.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19 (Vite 8), Tailwind CSS 4, React Router 7, axios, @dnd-kit |
| 3D | three.js, @react-three/fiber 9, @react-three/drei 10, `.glb` models with Draco compression |
| Backend | Node.js 22, Express 5 (REST), JWT + bcrypt, multer, helmet, express-rate-limit |
| Database | MongoDB with Mongoose 9 (metadata and file URLs only, never the model files) |
| File storage | Local disk storage (`server/uploads/`) |
| Tooling | glTF-Transform (model optimization), Puppeteer (thumbnails), concurrently, nodemon |

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    UI["React app<br/>(localhost:5173)"]
    R3F["3D viewer<br/>React Three Fiber"]
  end
  subgraph API["Express API<br/>(localhost:5000)"]
    Routes["Routes + middleware<br/>verifyToken, requireRole,<br/>rate limits, multer"]
    Ctrl["Controllers"]
  end
  DB[("MongoDB<br/>metadata + file paths")]
  Files[("Local disk (/server/uploads)<br/>.glb models, thumbnails")]

  UI -- "REST / JSON + JWT" --> Routes --> Ctrl
  Ctrl -- Mongoose --> DB
  Ctrl -- "upload / delete" --> Files
  R3F -- "loads .glb + images" --> Files
```

Uploaded files never go into MongoDB: multer saves them, the server checks their type and size (including the file's first bytes), then either keeps them in `server/uploads` or sends them to Cloudinary. The database only stores the resulting URL.

## Database schema

```mermaid
erDiagram
  USER ||--o{ QUIZ_ATTEMPT : takes
  USER }o--o{ ARTIFACT : "favorites"
  EXHIBITION ||--o{ ARTIFACT : "artifacts (ordered tour)"
  EXHIBITION ||--o| QUIZ : has
  QUIZ ||--o{ QUIZ_ATTEMPT : "scored in"

  USER {
    string name
    string email "unique"
    string passwordHash "bcrypt, never returned"
    string role "visitor | curator | admin"
    ObjectId[] favorites
  }
  ARTIFACT {
    string title
    string slug "unique, auto"
    string description
    string era
    string region
    string category
    string material
    string[] tags
    string modelUrl
    string thumbnailUrl
    object credits "author, sourceUrl, license"
    object[] hotspots "position [x,y,z], title, text"
    number[] cameraPosition "starting view direction"
    ObjectId exhibitionId
    number views
  }
  EXHIBITION {
    string title
    string slug "unique, auto"
    string description
    string coverImage
    string theme
    ObjectId[] artifacts "order = tour order"
    boolean isPublished
  }
  QUIZ {
    ObjectId exhibitionId "unique"
    object[] questions "question, options[], answerIndex"
  }
  QUIZ_ATTEMPT {
    ObjectId userId
    ObjectId quizId
    number score
    number total
    date createdAt
  }
```

All collections have `createdAt`/`updatedAt` timestamps. An artifact belongs to at most one exhibition; the API keeps `Artifact.exhibitionId` and `Exhibition.artifacts` in sync.

## API endpoints

Base URL: `/api`. Errors always look like `{ "message": "..." }`. 🔒 = needs `Authorization: Bearer <token>`.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | public | API and database status |
| POST | `/auth/register` | public (rate-limited) | Create a visitor account → `{ token, user }` |
| POST | `/auth/login` | public (10 failed tries / 15 min) | → `{ token, user }` |
| GET | `/auth/me` | 🔒 any | The logged-in user |
| GET | `/artifacts` | public | List: `search`, `era`, `region`, `category`, `exhibition`, `page`, `limit` → `{ artifacts, total, page, totalPages }` |
| GET | `/artifacts/random` | public | A random artifact (`?withModel=true`: only ones with a 3D model) |
| GET | `/artifacts/filters` | public | Distinct eras, regions and categories |
| GET | `/artifacts/:slug` | public | One artifact (counts a view) |
| GET | `/artifacts/:slug/related` | public | Up to 6 with the same category or era |
| GET | `/artifacts/by-id/:id` | 🔒 curator/admin | One artifact for editing (no view counted) |
| POST | `/artifacts` | 🔒 curator/admin | Create (multipart: fields + `model` .glb ≤ 25 MB + `thumbnail` image ≤ 2 MB) |
| PUT | `/artifacts/:id` | 🔒 curator/admin | Update fields and/or replace files |
| PUT | `/artifacts/:id/hotspots` | 🔒 curator/admin | Replace the hotspot list |
| DELETE | `/artifacts/:id` | 🔒 admin | Delete, including its files |
| GET | `/exhibitions` | public | Published exhibitions (staff also see drafts), with `artifactCount`, `previewImage` |
| GET | `/exhibitions/:slug` | public | One exhibition with its artifacts in tour order |
| POST | `/exhibitions` | 🔒 curator/admin | Create (optional `coverImage` upload) |
| PUT | `/exhibitions/:id` | 🔒 curator/admin | Update fields, artifact list, publish state |
| PUT | `/exhibitions/:id/order` | 🔒 curator/admin | Reorder the tour |
| DELETE | `/exhibitions/:id` | 🔒 curator/admin | Delete (artifacts are kept; its quiz is removed) |
| GET | `/quizzes/:exhibitionId` | public | The exhibition's quiz (answers only for staff) |
| POST | `/quizzes/:id/check` | public | Instant feedback for one answer |
| POST | `/quizzes/:id/attempt` | 🔒 any | Submit all answers; the server scores and saves |
| POST | `/quizzes` | 🔒 curator/admin | Create a quiz for an exhibition |
| PUT | `/quizzes/:id` | 🔒 curator/admin | Replace its questions |
| DELETE | `/quizzes/:id` | 🔒 curator/admin | Delete, with everyone's attempts |
| GET | `/users/me/favorites` | 🔒 any | Saved artifacts |
| POST / DELETE | `/users/favorites/:artifactId` | 🔒 any | Save / remove a favorite |
| GET | `/users/me/attempts` | 🔒 any | Quiz scores, newest first |

Curl examples for every route: [docs/api-test-plan.md](docs/api-test-plan.md).

## Project structure

```
beyond-the-glass/
├── client/                 React app (Vite)
│   ├── public/draco/       Draco decoder for compressed models (served locally, works offline)
│   └── src/
│       ├── api/axios.js    axios instance, JWT header, fileUrl()
│       ├── components/     cards, navbar, skeletons, dashboard widgets
│       │   └── viewer/     the 3D viewer: ModelViewer, Model, FitCamera, lighting presets
│       ├── context/        AuthContext (logged-in user)
│       ├── hooks/          useApi, useAuth, useDebouncedValue, useObjectUrl, ...
│       └── pages/          one component per route; pages/dashboard/ for curators
├── server/                 Express API
│   ├── config/db.js        Mongoose connection
│   ├── controllers/        request handling
│   ├── middleware/         verifyToken, requireRole, upload, rate limits, error handler
│   ├── models/             User, Artifact, Exhibition
│   ├── routes/             URL → controller
│   ├── scripts/            seed.js + seed-data.json, setRole.js
│   ├── utils/files.js      file storage on local disk
│   └── uploads/            local files (.glb models and .webp thumbnails)
├── scripts/                optimize-models.js, generate-thumbnails.js
├── raw-models/             downloaded source models
└── docs/                   api-test-plan.md, screenshots/
```

## Local setup

**Requirements:** Node.js 22.12+, and MongoDB (local Community Server or an Atlas connection string).

```bash
npm run install:all                  # root, server and client dependencies
cp server/.env.example server/.env   # Windows PowerShell: Copy-Item
cp client/.env.example client/.env
npm run models:optimize              # raw-models/ -> compressed .glb in server/uploads/models
npm run models:thumbnails            # 600x600 .webp thumbnails
npm run seed                         # WIPES the database, then loads server/scripts/seed-data.json
npm run dev                          # API on :5000, client on :5173
```

Demo logins created by the seed: `admin@museum.test` / `admin12345`, `curator@museum.test` / `curator12345`, `visitor@museum.test` / `visitor12345`. New sign-ups are visitors; promote someone with `npm run set-role -- email@example.com curator` (from `server/`).

### Scripts (repo root)

| Command | What it does |
| --- | --- |
| `npm run dev` | API (nodemon) and client (Vite) together |
| `npm run server` / `npm run client` | Only one of them |
| `npm run build` | Production build of the client into `client/dist` |
| `npm start` | API without nodemon |
| `npm run models:optimize` | Draco + WebP (≤ 2048 px) compression of every model in `raw-models/`; lists .obj/.stl files with Blender conversion steps |
| `npm run models:thumbnails` | Renders a thumbnail per model in headless Chrome |
| `npm run seed` | Resets the database to `seed-data.json` (users, exhibitions, artifacts, quizzes) |

## Environment variables

### Server (`server/.env`)

| Variable | Example | Required | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | no | Environment mode |
| `PORT` | `5000` | no | Port to listen on (default 5000) |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/beyond-the-glass` | yes | Database connection string |
| `JWT_SECRET` | 64+ random characters | yes | Signs login tokens |
| `JWT_EXPIRES_IN` | `7d` | no | How long a login lasts |
| `CLIENT_URL` | `http://localhost:5173` | yes | Allowed browser origin for CORS |
| `STORAGE_DRIVER` | `local` | no | Stored locally in `server/uploads` |

### Client (`client/.env`)

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000/api` | API base URL for client requests |

## Screenshots

| | |
| --- | --- |
| ![Home](docs/screenshots/home.jpg) Home: featured artifact in a display case | ![Artifact](docs/screenshots/artifact.jpg) Artifact page: 3D viewer and info panel |
| ![Guided tour](docs/screenshots/tour.jpg) Guided tour | ![Discover](docs/screenshots/discover.jpg) Discover: search and filters |
| ![Quiz](docs/screenshots/quiz.jpg) Quiz with instant feedback | ![Hotspot editor](docs/screenshots/dashboard-hotspots.jpg) Dashboard: hotspot editor |
| ![Exhibition editor](docs/screenshots/dashboard-exhibition.jpg) Dashboard: exhibition builder | |

To refresh them, run the app with the seeded data and replace the files in `docs/screenshots/`.

## Credits

### 3D models

Every model shown in the museum, with its creator and license. The site shows the same credits on every artifact view (they come from `server/scripts/seed-data.json`, so update both together).

| Model | Author | Source | License |
| --- | --- | --- | --- |
| Active Cavity Irradiance Monitor Satellite (AcrimSAT) (B) — `raw-models/Active Cavity Irradiance Monitor Satellite (AcrimSAT) (B).glb` | TODO | TODO: link to the page you downloaded it from | TODO |

When you add a model to `raw-models/`, add a row here and its credits in `seed-data.json`.

### Software and assets
- [three.js](https://threejs.org), [React Three Fiber and drei](https://github.com/pmndrs) (MIT); Draco decoder from three.js (Apache 2.0)
- [glTF-Transform](https://gltf-transform.dev) (MIT), [dnd-kit](https://dndkit.com) (MIT)
- Fonts: [Bodoni Moda](https://fonts.google.com/specimen/Bodoni+Moda) and [Hanken Grotesk](https://fonts.google.com/specimen/Hanken+Grotesk) (SIL Open Font License), self-hosted via Fontsource
