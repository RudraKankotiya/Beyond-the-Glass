# Beyond the Glass
An immersive 3D virtual museum enabling visitors to explore, inspect, discover, and learn about digital artifacts through interactive exhibitions. College full stack web development assignment.

## Stack (mandatory, do not substitute)
- Frontend: React (Vite) + Tailwind CSS, semantic HTML5 tags (header, nav, main, section, article, aside, footer), React Router
- 3D: @react-three/fiber + @react-three/drei, models in .glb (glTF binary) format
- Backend: Node.js + Express, REST API, JWT auth + bcrypt, multer for uploads
- Database: MongoDB with Mongoose. Store only metadata and file URLs in MongoDB, never the .glb files themselves.

## Structure
Monorepo: /client (React) and /server (Express). Model files served from /server/uploads/models, thumbnails from /server/uploads/thumbnails.

The user will add the actual 3D model (.glb) files later. Until then, code must handle missing models gracefully; do not invent or download models.

## Roles
visitor (browse, favorite, quiz), curator (upload artifacts, edit hotspots, build exhibitions), admin (everything + delete).

## Core data models
- User: name, email, passwordHash, role, favorites[artifactId]
- Artifact: title, slug, description, era, region, category, material, tags[], modelUrl, thumbnailUrl, credits {author, sourceUrl, license}, hotspots[{position:[x,y,z], title, text}], cameraPosition, exhibitionId, views
- Exhibition: title, slug, description, coverImage, theme, artifacts[artifactId] (ordered = guided tour order), isPublished
- Quiz: exhibitionId, questions[{question, options[], answerIndex}]
- QuizAttempt: userId, quizId, score, createdAt

## Rules
- Only ONE <Canvas> per page. Grids and lists use thumbnail images, never live 3D.
- Every artifact view must show credits (author, source, license).
- Wrap models in <Suspense> with a progress loader (drei useProgress).
- Mobile-first responsive design with Tailwind breakpoints.
- Keep code simple and readable. We must explain it in a viva. Comment non-obvious 3D logic.
- Use environment variables (.env) for secrets and the Mongo URI; provide .env.example files.
