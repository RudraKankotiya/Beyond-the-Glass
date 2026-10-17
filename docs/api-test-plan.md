# API manual test plan

Run these commands in **Git Bash** (or macOS/Linux terminal) with the server running (`npm run dev` from the repo root).

> **Windows PowerShell note:** in PowerShell 5.1, `curl` is an alias for `Invoke-WebRequest` and the quoting below will not work. Use Git Bash, or Postman / Thunder Client with the same method, URL, headers and JSON body.

```bash
API=http://localhost:5000/api
```

Tip: add `-i` to any command to also see the HTTP status code and headers.

---

## 0. Health check

```bash
curl $API/health
```

**Expect:** `200` with `{"status":"ok","database":"connected",...}`

---

## 1. Register — `POST /api/auth/register`

### 1a. Successful registration

```bash
curl -i -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Visitor","email":"ada@example.com","password":"secret123"}'
```

**Expect:** `201` with `{ "token": "...", "user": {...} }`
- `user.role` is `"visitor"`
- `user` has **no** `passwordHash` field

### 1b. Role in the body is ignored

```bash
curl -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Sneaky","email":"sneaky@example.com","password":"secret123","role":"admin"}'
```

**Expect:** `201`, but `user.role` is still `"visitor"`.

### 1c. Duplicate email

Run the command from **1a** again.

**Expect:** `409` `{"message":"Email is already registered"}`

### 1d. Missing fields

```bash
curl -i -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@example.com"}'
```

**Expect:** `400` `{"message":"Name, email and password are required"}`

### 1e. Password too short

```bash
curl -i -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Short","email":"short@example.com","password":"123"}'
```

**Expect:** `400` `{"message":"Password must be at least 8 characters"}`

### 1f. Invalid email

```bash
curl -i -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Bad","email":"not-an-email","password":"secret123"}'
```

**Expect:** `400` `{"message":"Please provide a valid email"}`

---

## 2. Login — `POST /api/auth/login`

### 2a. Successful login (save the token)

```bash
curl -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"secret123"}'
```

**Expect:** `200` with `{ "token": "...", "user": {...} }` and no `passwordHash`.

Copy the token into a variable for the next steps:

```bash
TOKEN=paste-the-token-here
```

### 2b. Wrong password

```bash
curl -i -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"wrongpass"}'
```

**Expect:** `401` `{"message":"Invalid email or password"}`

### 2c. Unknown email

```bash
curl -i -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ghost@example.com","password":"secret123"}'
```

**Expect:** `401` with the **same** message as 2b. The API does not reveal which emails exist.

### 2d. Email is case-insensitive

```bash
curl -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ADA@Example.com","password":"secret123"}'
```

**Expect:** `200`

---

## 3. Current user — `GET /api/auth/me`

### 3a. With a valid token

```bash
curl -i $API/auth/me -H "Authorization: Bearer $TOKEN"
```

**Expect:** `200` `{ "user": { "name": "Ada Visitor", "role": "visitor", ... } }`

### 3b. No token

```bash
curl -i $API/auth/me
```

**Expect:** `401` `{"message":"Not authorized: no token provided"}`

### 3c. Invalid token

```bash
curl -i $API/auth/me -H "Authorization: Bearer not.a.real.token"
```

**Expect:** `401` `{"message":"Not authorized: invalid or expired token"}`

---

## 4. Changing roles (curator / admin)

New users are always visitors. To promote one, run this from the `server/` folder:

```bash
npm run set-role -- ada@example.com admin
```

**Expect:** `ada@example.com is now: admin`. Then run **3a** again with the **same** token: `role` is now `"admin"`. The token only stores the user id, so the role is always read fresh from the database.

`requireRole` returns `403` for a logged-in user without the right role. Sections 5–7 exercise it.

---

## Setup for sections 5–7

Paste this into Git Bash. It defines a small `json` helper that reads one field from a response, and creates one user per role. (If the users already exist, the register step fails harmlessly and login still works.)

```bash
# Reads a field from JSON output, e.g.  ... | json artifact.slug
json() { node -e "let o=JSON.parse(require('fs').readFileSync(0));for(const k of '$1'.split('.'))o=o?.[k];console.log(o)"; }
JSON='Content-Type: application/json'

for u in visitor curator admin; do
  curl -s -X POST $API/auth/register -H "$JSON" -d "{\"name\":\"$u\",\"email\":\"$u@test.io\",\"password\":\"secret123\"}" > /dev/null
done
(cd server && npm run set-role -- curator@test.io curator && npm run set-role -- admin@test.io admin)

login() { curl -s -X POST $API/auth/login -H "$JSON" -d "{\"email\":\"$1@test.io\",\"password\":\"secret123\"}" | json token; }
VISITOR="Authorization: Bearer $(login visitor)"
CURATOR="Authorization: Bearer $(login curator)"
ADMIN="Authorization: Bearer $(login admin)"

# Test files: the model from raw-models/ and any small jpg/png/webp image (< 2MB)
MODEL="raw-models/Active Cavity Irradiance Monitor Satellite (AcrimSAT) (B).glb"
THUMB=/c/Users/you/Pictures/some-image.png   # change this path
```

Run everything from the **repo root** so the relative paths work.

---

## 5. Artifacts — `/api/artifacts`

Uploads use `multipart/form-data` (`curl -F`). Arrays and objects (`credits`, `hotspots`, `cameraPosition`) are sent as JSON text. `tags` can be JSON or a comma-separated list. Both files are optional, so a model can be added later with PUT. Routes that don't upload files also accept plain JSON.

### 5a. Create with model + thumbnail (curator)

```bash
curl -X POST $API/artifacts -H "$CURATOR" \
  -F "title=AcrimSAT Satellite" \
  -F "description=A NASA satellite that measured the Sun's total energy output." \
  -F "era=Space Age" -F "region=Earth Orbit" -F "category=Spacecraft" -F "material=Aluminium" \
  -F "tags=space, nasa, satellite" \
  -F 'credits={"author":"NASA","sourceUrl":"https://science.nasa.gov/3d-resources/","license":"Public Domain"}' \
  -F 'hotspots=[{"position":[0,0.5,0],"title":"Solar panel","text":"Powers the craft"}]' \
  -F "model=@$MODEL" -F "thumbnail=@$THUMB" | tee /dev/stderr | json artifact._id
```

**Expect:** `201` `{ "artifact": { "slug": "acrimsat-satellite", "modelUrl": "/uploads/models/<file>.glb", ... } }`. Save the printed id:

```bash
SAT=paste-the-id
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000$(curl -s $API/artifacts/acrimsat-satellite | json artifact.modelUrl)
```

**Expect:** `200`: the model file is served. (That GET also counted one view.)

### 5b. Create without files (JSON body)

```bash
curl -X POST $API/artifacts -H "$ADMIN" -H "$JSON" \
  -d '{"title":"Bronze Mirror","description":"Polished bronze mirror.","era":"Han Dynasty","category":"Household","credits":{"author":"Museum","license":"CC BY 4.0"}}'
curl -X POST $API/artifacts -H "$ADMIN" -H "$JSON" \
  -d '{"title":"Jade Burial Suit","description":"Suit of jade plates.","era":"Han Dynasty","category":"Funerary","credits":{"author":"Museum","license":"CC BY 4.0"}}'
MIRROR=$(curl -s $API/artifacts?search=mirror | json artifacts.0._id)
JADE=$(curl -s $API/artifacts?search=jade | json artifacts.0._id)
```

**Expect:** `201` both times, with `modelUrl: ""`.

### 5c. Rejected creates

| Command | Expect |
| --- | --- |
| `curl -i -X POST $API/artifacts -F title=x` | `401` no token |
| `curl -i -X POST $API/artifacts -H "$VISITOR" -F title=x` | `403` requires role curator or admin |
| `curl -i -X POST $API/artifacts -H "$CURATOR" -F title=x -F description=y` | `400` Credits license/author is required |
| `curl -i -X POST $API/artifacts -H "$CURATOR" -F title=x -F "model=@$THUMB"` | `400` model must be a .glb 3D model |
| `curl -i -X POST $API/artifacts -H "$CURATOR" -F title=x -F "thumbnail=@README.md"` | `400` thumbnail must be a jpg, png or webp image |
| `curl -i -X POST $API/artifacts -H "$CURATOR" -F title=x -F "photo=@$THUMB"` | `400` Unexpected file field: photo |
| `curl -i -X POST $API/artifacts -H "$CURATOR" -F title=x -F description=y -F 'credits={oops'` | `400` credits must be an object |

A thumbnail over 2MB gives `400 thumbnail must be at most 2MB`. A model over 25MB gives `400 File is too large (max 25MB)`. A text file renamed to `.glb` gives `400 model is not a valid .glb file`. **After any rejected upload, `server/uploads/` contains no new files.**

### 5d. List, search, filter, paginate

| Command | Expect |
| --- | --- |
| `curl $API/artifacts` | `200` `{ artifacts, total: 3, page: 1, limit: 12, totalPages: 1 }`, newest first |
| `curl "$API/artifacts?search=satellite"` | only AcrimSAT (search covers title, description and tags) |
| `curl "$API/artifacts?search=nasa"` | AcrimSAT (matched by tag) |
| `curl "$API/artifacts?search=sat"` | AcrimSAT: part of a word is enough (search is case-insensitive "contains") |
| `curl $API/artifacts/filters` | `{ eras, regions, categories }`: each value used by at least one artifact, sorted (feeds the Discover dropdowns) |
| `curl "$API/artifacts?era=han%20dynasty"` | the 2 Han artifacts (case-insensitive) |
| `curl "$API/artifacts?category=spacecraft&region=earth%20orbit"` | AcrimSAT |
| `curl "$API/artifacts?page=2&limit=2"` | 1 artifact, `totalPages: 2` |
| `curl -i "$API/artifacts?page=0"` | `400` page must be a positive whole number |

### 5e. Random, by slug, related

| Command | Expect |
| --- | --- |
| `curl $API/artifacts/random` | `200` one random artifact |
| `curl "$API/artifacts/random?withModel=true"` | `200` a random artifact that has a 3D model (`404` if none has one) |
| `curl $API/artifacts/acrimsat-satellite \| json artifact.views` | number goes up by 1 on each run |
| `curl -i $API/artifacts/no-such-thing` | `404` Artifact not found |
| `curl $API/artifacts/by-id/$SAT -H "$CURATOR"` | `200` the full artifact for the dashboard's edit forms; **no view is counted**. Without a curator/admin token: `401`/`403` |
| `curl $API/artifacts/jade-burial-suit/related` | Bronze Mirror only (same era, never itself, max 6) |

### 5f. Update (curator/admin)

```bash
# Partial update: credits are merged, so author/license are kept
curl -X PUT $API/artifacts/$MIRROR -H "$CURATOR" -H "$JSON" \
  -d '{"title":"Han Bronze Mirror","credits":{"sourceUrl":"https://example.org"}}'

# Add a model later (a second upload replaces the file and deletes the old one)
curl -X PUT $API/artifacts/$MIRROR -H "$CURATOR" -F "model=@$MODEL" | json artifact.modelUrl
```

**Expect:** `200`. The title changes but the slug stays `bronze-mirror`, so existing links keep working. `views` and `slug` in the body are ignored. `curl -i -X PUT $API/artifacts/123 -H "$CURATOR"` gives `400 Invalid id: 123`.

### 5g. Replace hotspots

```bash
curl -X PUT $API/artifacts/$SAT/hotspots -H "$CURATOR" -H "$JSON" \
  -d '{"hotspots":[{"position":[1,2,3],"title":"Antenna"},{"position":[0,0,1],"title":"Sensor","text":"ACRIM III"}]}'
```

**Expect:** `200` with 2 hotspots. `{"hotspots":[{"position":[1,2],"title":"x"}]}` gives `400 Hotspot position must be [x, y, z]`.

---

## 6. Exhibitions — `/api/exhibitions`

### 6a. Create (curator/admin)

```bash
# Published, with a cover image (multipart), tour order: jade then mirror
curl -X POST $API/exhibitions -H "$CURATOR" \
  -F "title=Han Dynasty Treasures" -F "description=Art of the Han." -F "isPublished=true" \
  -F "artifacts=[\"$JADE\",\"$MIRROR\"]" -F "coverImage=@$THUMB"

# Draft (JSON)
curl -X POST $API/exhibitions -H "$CURATOR" -H "$JSON" -d "{\"title\":\"Space Exploration\",\"artifacts\":[\"$SAT\"]}"

HAN=$(curl -s $API/exhibitions/han-dynasty-treasures | json exhibition._id)
```

**Expect:** `201` both. `curl $API/artifacts/jade-burial-suit | json artifact.exhibitionId.slug` prints `han-dynasty-treasures`, because the link is stored on both sides. An unknown or duplicated artifact id gives `400`.

### 6b. Visibility

| Command | Expect |
| --- | --- |
| `curl $API/exhibitions` | only the published one; each has `artifactCount` and `previewImage` (cover, or the first artifact's thumbnail) |
| `curl $API/exhibitions -H "$CURATOR"` | both (drafts visible to curator/admin) |
| `curl -i $API/exhibitions/space-exploration` | `404` (draft hidden from guests) |
| `curl $API/exhibitions/space-exploration -H "$CURATOR"` | `200` |
| `curl $API/exhibitions/han-dynasty-treasures` | `200` with full artifact objects in tour order: Jade, Mirror |

### 6c. Reorder the guided tour

```bash
curl -X PUT $API/exhibitions/$HAN/order -H "$CURATOR" -H "$JSON" -d "{\"artifacts\":[\"$MIRROR\",\"$JADE\"]}"
```

**Expect:** `200`, order now Mirror then Jade. Sending a list that adds or drops an artifact gives `400`. Use PUT `/api/exhibitions/:id` to change *which* artifacts are included.

### 6d. Update

```bash
curl -X PUT $API/exhibitions/$HAN -H "$CURATOR" -H "$JSON" -d "{\"theme\":\"jade\",\"artifacts\":[\"$MIRROR\"]}"
```

**Expect:** `200`. Jade is removed from the tour, and its `exhibitionId` becomes `null`.

---

## 7. Favorites — `/api/users` (any logged-in user)

| Command | Expect |
| --- | --- |
| `curl -X POST $API/users/favorites/$SAT -H "$VISITOR"` | `200` `{ "favorites": ["<id>"] }` (running it twice adds no duplicate) |
| `curl -X POST $API/users/favorites/$JADE -H "$VISITOR"` | 2 ids |
| `curl $API/users/me/favorites -H "$VISITOR"` | full artifact cards, most recent first: Jade, AcrimSAT |
| `curl -X DELETE $API/users/favorites/$JADE -H "$VISITOR"` | 1 id left |
| `curl -i $API/users/me/favorites` | `401` |
| `curl -i -X POST $API/users/favorites/abc -H "$VISITOR"` | `400` Invalid artifactId: abc |

---

## 8. Deletes

| Command | Expect |
| --- | --- |
| `curl -i -X DELETE $API/artifacts/$SAT -H "$CURATOR"` | `403` requires role admin |
| `curl -X DELETE $API/artifacts/$SAT -H "$ADMIN"` | `200` Artifact deleted. Its .glb and thumbnail disappear from `server/uploads/`, and it is removed from favorites and exhibition tours |
| `curl -X DELETE $API/exhibitions/$HAN -H "$CURATOR"` | `200` Exhibition deleted. Its artifacts remain but are unlinked; the cover image file and its quiz are deleted |

---

## 9. Quizzes — `/api/quizzes`

```bash
EX=$(curl -s $API/exhibitions | json exhibitions.0._id)   # any published exhibition with a quiz (npm run seed adds one each)
QUIZ=$(curl -s $API/quizzes/$EX | json quiz._id)
```

| Command | Expect |
| --- | --- |
| `curl $API/quizzes/$EX` | `200` questions and options, **without** `answerIndex` |
| `curl $API/quizzes/$EX -H "$CURATOR"` | `200` including `answerIndex` |
| `curl -X POST $API/quizzes/$QUIZ/check -H "$JSON" -d '{"questionIndex":0,"answer":0}'` | `{ "correct": true/false, "answerIndex": n }` (instant feedback) |
| `curl -X POST $API/quizzes/$QUIZ/attempt -H "$JSON" -d '{"answers":[0,1,2]}'` | `401` (log in to save a score) |
| `curl -X POST $API/quizzes/$QUIZ/attempt -H "$JSON" -H "$VISITOR" -d '{"answers":[0,1,2]}'` | `201` `{ score, total, results }`, calculated by the server; wrong number of answers: `400` |
| `curl $API/users/me/attempts -H "$VISITOR"` | `{ attempts: [{ score, total, createdAt, exhibition: { title, slug } }] }`, newest first |
| `curl -X POST $API/quizzes -H "$JSON" -H "$CURATOR" -d "{\"exhibitionId\":\"$EX\",\"questions\":[...]}"` | `201`; a second quiz for the same exhibition: `409`; as a visitor: `403` |
| `curl -X PUT $API/quizzes/$QUIZ -H "$JSON" -H "$CURATOR" -d '{"questions":[{"question":"x","options":["a","b"],"answerIndex":5}]}'` | `400` answerIndex must point to one of the options |
| `curl -X DELETE $API/quizzes/$QUIZ -H "$CURATOR"` | `200`; everyone's attempts at it are deleted too |

---

## 10. Clean up test data (optional)

Use MongoDB Compass: open the `beyond-the-glass` database and delete the test documents from `users`, `artifacts` and `exhibitions`.
